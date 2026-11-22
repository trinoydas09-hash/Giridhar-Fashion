import crypto from 'node:crypto';
import { NextRequest } from 'next/server';

export function verifyAssistantAccess(req: NextRequest): { ok: true } | { ok: false; status: number; error: string } {
  const configuredKey = process.env.ASSISTANT_API_KEY?.trim();
  if (!configuredKey) {
    // Read-only public catalog discovery allowed until ASSISTANT_API_KEY is configured
    return { ok: true };
  }

  const provided = req.headers.get('x-assistant-api-key')?.trim() || '';
  const a = Buffer.from(provided);
  const b = Buffer.from(configuredKey);

  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { ok: false, status: 401, error: 'Invalid or missing x-assistant-api-key header.' };
  }

  return { ok: true };
}
