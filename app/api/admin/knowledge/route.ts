import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { extractDocumentText } from '@/lib/ai/rag';
import { requireAdminRequest } from '@/lib/security/auth';
import {
  deleteKnowledgeDocument,
  listKnowledgeDocuments,
  toggleKnowledgeDocumentStatus,
  upsertKnowledgeDocument,
} from '@/lib/services/store-repository';

export const dynamic = 'force-dynamic';

const MAX_DOC_BYTES = 10 * 1024 * 1024; // 10MB max upload

const manualDocSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(2, 'Please provide a document title.').max(180),
  category: z.string().trim().min(2).max(100),
  content: z.string().trim().min(10, 'Document content must be at least 10 characters.').max(120000),
  is_enabled: z.boolean().default(true),
});

const patchDocSchema = z.object({
  id: z.string().min(1),
  is_enabled: z.boolean(),
});

export async function GET(req: NextRequest) {
  const auth = await requireAdminRequest(req);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const documents = await listKnowledgeDocuments();
    return NextResponse.json({ documents }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unable to fetch knowledge base.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminRequest(req);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file');
      const rawTitle = String(formData.get('title') || '').trim();
      const category = String(formData.get('category') || 'General Brand Information').trim();
      const isEnabled = String(formData.get('is_enabled') ?? 'true') !== 'false';

      if (!(file instanceof File)) {
        return NextResponse.json({ error: 'Please select a PDF, DOCX, or TXT file to upload.' }, { status: 400 });
      }
      if (file.size > MAX_DOC_BYTES) {
        return NextResponse.json({ error: 'File exceeds the 10 MB maximum size limit.' }, { status: 400 });
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const extracted = await extractDocumentText({
        fileName: file.name,
        mimeType: file.type,
        buffer,
      });

      const docTitle = rawTitle || file.name.replace(/\.[^.]+$/, '');
      const document = await upsertKnowledgeDocument({
        title: docTitle,
        category,
        source_type: extracted.sourceType,
        file_name: file.name,
        content: extracted.text,
        is_enabled: isEnabled,
      });

      return NextResponse.json({ document }, { status: 201 });
    }

    const body = await req.json();
    const parsed = manualDocSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid knowledge document.' },
        { status: 400 }
      );
    }

    const document = await upsertKnowledgeDocument({
      ...parsed.data,
      source_type: 'manual_text',
      file_name: null,
    });

    return NextResponse.json({ document }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unable to process knowledge document.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdminRequest(req);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await req.json();
    const parsed = patchDocSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid toggle payload.' }, { status: 400 });
    }

    const document = await toggleKnowledgeDocumentStatus(parsed.data.id, parsed.data.is_enabled);
    if (!document) {
      return NextResponse.json({ error: 'Knowledge document not found.' }, { status: 404 });
    }
    return NextResponse.json({ document }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unable to update document status.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdminRequest(req);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const id = req.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Document ID is required.' }, { status: 400 });
  }

  try {
    await deleteKnowledgeDocument(id);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unable to delete knowledge document.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
