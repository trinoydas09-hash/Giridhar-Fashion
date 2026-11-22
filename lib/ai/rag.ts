import crypto from 'node:crypto';
import { GoogleGenAI } from '@google/genai';
import mammoth from 'mammoth';
import { extractText } from 'unpdf';
import { resolveServerProviderCredentials } from '@/lib/security/secrets';
import { KnowledgeChunk, KnowledgeDocument, RetrievedKnowledgeHit } from '@/types/store';

export const EMBEDDING_DIMENSIONS = 768;

export async function extractDocumentText(params: {
  fileName: string;
  mimeType: string;
  buffer: Buffer;
}): Promise<{ text: string; sourceType: 'pdf' | 'docx' | 'txt' }> {
  const lower = params.fileName.toLowerCase();

  if (lower.endsWith('.pdf') || params.mimeType === 'application/pdf') {
    const result = await extractText(new Uint8Array(params.buffer), { mergePages: true });
    const text = (Array.isArray(result.text) ? result.text.join('\n') : result.text || '').trim();
    if (!text) {
      throw new Error('Could not extract readable text from this PDF. Please upload a text-based PDF or paste text directly.');
    }
    return { text, sourceType: 'pdf' };
  }

  if (
    lower.endsWith('.docx') ||
    params.mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    const result = await mammoth.extractRawText({ buffer: params.buffer });
    const text = (result.value || '').trim();
    if (!text) {
      throw new Error('The DOCX document appears to be empty.');
    }
    return { text, sourceType: 'docx' };
  }

  if (lower.endsWith('.txt') || lower.endsWith('.md') || params.mimeType.startsWith('text/')) {
    const text = params.buffer.toString('utf8').trim();
    if (!text) {
      throw new Error('The text file is empty.');
    }
    return { text, sourceType: 'txt' };
  }

  throw new Error('Unsupported file format. Please upload a PDF (.pdf), Word (.docx), or Text (.txt) file.');
}

export function splitIntoChunks(text: string, maxChars = 750, overlapChars = 140): string[] {
  const normalized = text
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (!normalized) return [];
  if (normalized.length <= maxChars) return [normalized];

  const paragraphs = normalized.split(/\n{2,}/);
  const chunks: string[] = [];
  let buffer = '';

  const pushChunk = (value: string) => {
    const trimmed = value.trim();
    if (trimmed.length >= 20) {
      chunks.push(trimmed);
    }
  };

  for (const para of paragraphs) {
    const p = para.trim();
    if (!p) continue;

    if (p.length > maxChars) {
      if (buffer.trim()) {
        pushChunk(buffer);
        buffer = '';
      }
      // Split long paragraph on sentence boundaries or fixed windows with overlap
      let start = 0;
      while (start < p.length) {
        let end = Math.min(p.length, start + maxChars);
        if (end < p.length) {
          const lastPeriod = p.lastIndexOf('. ', end);
          const lastSpace = p.lastIndexOf(' ', end);
          if (lastPeriod > start + maxChars * 0.5) end = lastPeriod + 1;
          else if (lastSpace > start + maxChars * 0.5) end = lastSpace;
        }
        pushChunk(p.slice(start, end));
        if (end >= p.length) break;
        start = Math.max(start + 1, end - overlapChars);
      }
      continue;
    }

    if (buffer.length + p.length + 2 <= maxChars) {
      buffer = buffer ? `${buffer}\n\n${p}` : p;
    } else {
      pushChunk(buffer);
      const tail = overlapChars > 0 ? buffer.slice(-overlapChars).trim() : '';
      buffer = tail ? `${tail}\n\n${p}` : p;
    }
  }

  if (buffer.trim()) {
    pushChunk(buffer);
  }

  return chunks;
}

export function extractKeywords(text: string): string[] {
  const tokens = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s৳]/gu, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 2);
  return Array.from(new Set(tokens)).slice(0, 60);
}

// Deterministic local 768-dim hashed projection vector so vector similarity always works even before API keys are saved
export function buildDeterministicVector(text: string, dims = EMBEDDING_DIMENSIONS): number[] {
  const vec = new Array<number>(dims).fill(0);
  const words = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s৳]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 2);

  for (let i = 0; i < words.length; i++) {
    const token = words[i];
    const hash = crypto.createHash('sha256').update(token).digest();
    const idx = ((hash[0] << 8) | hash[1]) % dims;
    const sign = (hash[2] & 1) === 0 ? 1 : -1;
    vec[idx] += sign;

    // Add bigram signal for sharper phrase matching
    if (i < words.length - 1) {
      const bigram = `${token}_${words[i + 1]}`;
      const bHash = crypto.createHash('sha256').update(bigram).digest();
      const bIdx = ((bHash[0] << 8) | bHash[1]) % dims;
      const bSign = (bHash[2] & 1) === 0 ? 1 : -1;
      vec[bIdx] += bSign * 1.3;
    }
  }

  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
  if (norm > 0) {
    for (let i = 0; i < dims; i++) vec[i] = vec[i] / norm;
  }
  return vec;
}

export async function generateEmbedding(text: string): Promise<{
  vector: number[];
  provider: 'gemini' | 'openai' | 'local';
}> {
  const geminiCreds = await resolveServerProviderCredentials('gemini');
  if (geminiCreds.is_enabled && geminiCreds.api_key) {
    try {
      const ai = new GoogleGenAI({
        apiKey: geminiCreds.api_key,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
      });
      const res = await ai.models.embedContent({
        model: 'gemini-embedding-2',
        contents: text,
        config: {
          outputDimensionality: EMBEDDING_DIMENSIONS,
        },
      });
      const values = res.embeddings?.[0]?.values;
      if (Array.isArray(values) && values.length === EMBEDDING_DIMENSIONS) {
        return { vector: values, provider: 'gemini' };
      }
    } catch {
      // Fallback cleanly to OpenAI or local vector
    }
  }

  const openaiCreds = await resolveServerProviderCredentials('openai');
  if (openaiCreds.is_enabled && openaiCreds.api_key) {
    try {
      const res = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openaiCreds.api_key}`,
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: text.slice(0, 6000),
          dimensions: EMBEDDING_DIMENSIONS,
        }),
      });
      if (res.ok) {
        const json = (await res.json()) as { data?: { embedding?: number[] }[] };
        const emb = json.data?.[0]?.embedding;
        if (Array.isArray(emb) && emb.length === EMBEDDING_DIMENSIONS) {
          return { vector: emb, provider: 'openai' };
        }
      }
    } catch {
      // Fallback cleanly to local deterministic vector
    }
  }

  return { vector: buildDeterministicVector(text), provider: 'local' };
}

export async function buildChunksForDocument(doc: {
  id: string;
  title: string;
  category: string;
  content: string;
}): Promise<{ chunks: KnowledgeChunk[]; embeddingProvider: 'gemini' | 'openai' | 'local' }> {
  const segments = splitIntoChunks(doc.content);
  const chunks: KnowledgeChunk[] = [];
  let providerUsed: 'gemini' | 'openai' | 'local' = 'local';

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const searchable = `${doc.title}\nCategory: ${doc.category}\n${seg}`;
    const emb = await generateEmbedding(searchable);
    if (i === 0) providerUsed = emb.provider;
    chunks.push({
      id: `kchk-${doc.id}-${i + 1}`,
      document_id: doc.id,
      document_title: doc.title,
      category: doc.category,
      chunk_index: i,
      content: seg,
      embedding: emb.vector,
      keywords: extractKeywords(searchable),
    });
  }

  return { chunks, embeddingProvider: providerUsed };
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (!a.length || !b.length || a.length !== b.length) return 0;
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom > 0 ? dot / denom : 0;
}

export async function retrieveRelevantKnowledgeChunks(params: {
  query: string;
  documents: KnowledgeDocument[];
  chunks: KnowledgeChunk[];
  topK?: number;
}): Promise<RetrievedKnowledgeHit[]> {
  const { query, documents, chunks, topK = 4 } = params;
  const enabledDocIds = new Set(documents.filter((d) => d.is_enabled).map((d) => d.id));
  const eligibleChunks = chunks.filter((c) => enabledDocIds.has(c.document_id));

  if (eligibleChunks.length === 0) return [];

  const queryKeywords = new Set(extractKeywords(query));
  const queryEmbedding = await generateEmbedding(query);

  const scored = eligibleChunks.map((chunk) => {
    const vectorScore =
      chunk.embedding.length === queryEmbedding.vector.length
        ? Math.max(0, cosineSimilarity(queryEmbedding.vector, chunk.embedding))
        : 0;

    // Keyword overlap bonus
    let kwMatches = 0;
    for (const kw of queryKeywords) {
      if (chunk.keywords.includes(kw)) kwMatches += 1;
    }
    const kwScore = queryKeywords.size > 0 ? kwMatches / queryKeywords.size : 0;

    // Exact phrase/title bonus
    const lowerContent = `${chunk.document_title} ${chunk.category} ${chunk.content}`.toLowerCase();
    const lowerQuery = query.toLowerCase().trim();
    const phraseBonus = lowerQuery.length > 3 && lowerContent.includes(lowerQuery) ? 0.25 : 0;

    const combined = vectorScore * 0.55 + kwScore * 0.45 + phraseBonus;
    return {
      chunk_id: chunk.id,
      document_id: chunk.document_id,
      document_title: chunk.document_title,
      category: chunk.category,
      content: chunk.content,
      score: Number(combined.toFixed(4)),
    };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.filter((s) => s.score > 0.04).slice(0, topK);
}
