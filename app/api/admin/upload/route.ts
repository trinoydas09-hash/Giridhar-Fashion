import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRequest } from '@/lib/security/auth';
import { hasSupabaseServiceRole } from '@/lib/supabase/config';
import { createSupabaseAdminClient, createSupabaseUserClient } from '@/lib/supabase/server';

const ALLOWED_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const MAX_BYTES = 4 * 1024 * 1024; // 4 MB

export async function POST(req: NextRequest) {
  const auth = await requireAdminRequest(req);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Please select an image file to upload.' }, { status: 400 });
    }

    const ext = ALLOWED_MIME[file.type];
    if (!ext) {
      return NextResponse.json(
        { error: 'Only PNG, JPEG, and WebP images are supported.' },
        { status: 400 }
      );
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: 'Image size must be 4 MB or smaller.' },
        { status: 400 }
      );
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const fileName = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${ext}`;

    const bearer = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();
    const userClient = bearer ? createSupabaseUserClient(bearer) : null;

    if (userClient || hasSupabaseServiceRole()) {
      const adminClient = userClient ?? createSupabaseAdminClient();
      if (!adminClient) {
        return NextResponse.json({ error: 'Supabase Storage client unavailable.' }, { status: 500 });
      }

      const objectPath = `uploads/${fileName}`;
      const { error: uploadErr } = await adminClient.storage
        .from('product-media')
        .upload(objectPath, bytes, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadErr) {
        return NextResponse.json({ error: `Storage upload failed: ${uploadErr.message}` }, { status: 500 });
      }

      const { data: pubUrl } = adminClient.storage.from('product-media').getPublicUrl(objectPath);
      return NextResponse.json({ url: pubUrl.publicUrl }, { status: 201 });
    }

    // Preview Mode: confine write strictly inside public/uploads/
    const baseDir = path.resolve(process.cwd(), 'public', 'uploads');
    fs.mkdirSync(baseDir, { recursive: true });
    const resolvedTarget = path.resolve(baseDir, fileName);
    if (!resolvedTarget.startsWith(baseDir + path.sep)) {
      return NextResponse.json({ error: 'Invalid upload path.' }, { status: 400 });
    }

    fs.writeFileSync(resolvedTarget, bytes);
    return NextResponse.json({ url: `/uploads/${fileName}` }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Image upload failed.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
