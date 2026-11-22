import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';

const AUTH_STORE_PATH = path.join('/tmp', 'giridhar-admin-auth.json');

interface ClaimedAdminRecord {
  email: string;
  salt: string;
  hash: string;
  createdAt: string;
}

declare global {
  var __giridharSessionSecret: string | undefined;
}

function getSessionSecret(): string {
  const envSecret = process.env.ADMIN_SESSION_SECRET?.trim();
  if (envSecret && envSecret.length >= 16) {
    return envSecret;
  }
  if (!globalThis.__giridharSessionSecret) {
    globalThis.__giridharSessionSecret = crypto.randomBytes(32).toString('hex');
  }
  return globalThis.__giridharSessionSecret;
}

function readClaimedAdmin(): ClaimedAdminRecord | null {
  try {
    if (!fs.existsSync(AUTH_STORE_PATH)) return null;
    const raw = fs.readFileSync(AUTH_STORE_PATH, 'utf8');
    const parsed = JSON.parse(raw) as ClaimedAdminRecord;
    if (parsed?.hash && parsed?.salt && parsed?.email) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function getAdminAuthModeInfo(): {
  mode: 'supabase' | 'preview';
  requiresSetupClaim: boolean;
  hasEnvPasscode: boolean;
  claimedEmail: string | null;
} {
  if (isSupabaseConfigured()) {
    return {
      mode: 'supabase',
      requiresSetupClaim: false,
      hasEnvPasscode: false,
      claimedEmail: null,
    };
  }
  const hasEnvPasscode = Boolean(process.env.ADMIN_BOOTSTRAP_PASSCODE?.trim());
  const claimed = readClaimedAdmin();
  return {
    mode: 'preview',
    requiresSetupClaim: !hasEnvPasscode && !claimed,
    hasEnvPasscode,
    claimedEmail: claimed?.email ?? null,
  };
}

export function claimPreviewAdmin(email: string, password: string): { ok: true; email: string } | { ok: false; error: string } {
  if (isSupabaseConfigured()) {
    return { ok: false, error: 'Supabase Auth is active. Manage admin accounts in Supabase.' };
  }
  if (process.env.ADMIN_BOOTSTRAP_PASSCODE?.trim()) {
    return { ok: false, error: 'Admin passcode is managed by environment configuration.' };
  }
  const existing = readClaimedAdmin();
  if (existing) {
    return { ok: false, error: 'Admin account has already been claimed. Please sign in.' };
  }
  if (!email || !email.includes('@')) {
    return { ok: false, error: 'Please enter a valid admin email address.' };
  }
  if (!password || password.length < 8) {
    return { ok: false, error: 'Admin password must be at least 8 characters.' };
  }

  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  const record: ClaimedAdminRecord = {
    email: email.trim().toLowerCase(),
    salt,
    hash,
    createdAt: new Date().toISOString(),
  };

  try {
    fs.writeFileSync(AUTH_STORE_PATH, JSON.stringify(record, null, 2), { encoding: 'utf8', flag: 'wx' });
    return { ok: true, email: record.email };
  } catch {
    return { ok: false, error: 'Admin account was already claimed.' };
  }
}

export function verifyPreviewAdminCredentials(email: string, password: string): boolean {
  const envPasscode = process.env.ADMIN_BOOTSTRAP_PASSCODE?.trim();
  if (envPasscode) {
    const inputBuf = Buffer.from(password);
    const targetBuf = Buffer.from(envPasscode);
    if (inputBuf.length !== targetBuf.length) return false;
    return crypto.timingSafeEqual(inputBuf, targetBuf);
  }

  const claimed = readClaimedAdmin();
  if (!claimed) return false;
  if (email && email.trim().toLowerCase() !== claimed.email) return false;

  const derived = crypto.scryptSync(password, claimed.salt, 64);
  const stored = Buffer.from(claimed.hash, 'hex');
  if (derived.length !== stored.length) return false;
  return crypto.timingSafeEqual(derived, stored);
}

export function issueAdminSessionToken(email: string): string {
  const payload = {
    sub: email.trim().toLowerCase(),
    role: 'admin',
    exp: Date.now() + 8 * 60 * 60 * 1000, // 8 hours
  };
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const signature = crypto
    .createHmac('sha256', getSessionSecret())
    .update(encoded)
    .digest('base64url');
  return `${encoded}.${signature}`;
}

export function verifyAdminSessionToken(token: string): { valid: boolean; email?: string } {
  const parts = token.split('.');
  if (parts.length !== 2) return { valid: false };
  const [encoded, signature] = parts;

  const expectedSig = crypto
    .createHmac('sha256', getSessionSecret())
    .update(encoded)
    .digest('base64url');

  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return { valid: false };
  }

  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as {
      sub: string;
      role: string;
      exp: number;
    };
    if (payload.role !== 'admin' || !payload.exp || Date.now() > payload.exp) {
      return { valid: false };
    }
    return { valid: true, email: payload.sub };
  } catch {
    return { valid: false };
  }
}

export async function requireAdminRequest(
  request: Request
): Promise<{ authorized: true; email: string } | { authorized: false; error: string; status: number }> {
  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    const adminClient = createSupabaseAdminClient();
    if (!supabase) {
      return { authorized: false, error: 'Supabase client unavailable.', status: 500 };
    }

    const authHeader = request.headers.get('authorization');
    const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

    const { data: userData, error: userErr } = bearer
      ? await supabase.auth.getUser(bearer)
      : await supabase.auth.getUser();

    if (userErr || !userData?.user) {
      return { authorized: false, error: 'Authentication required.', status: 401 };
    }

    const reader = adminClient ?? supabase;
    const { data: profile, error: profileErr } = await reader
      .from('profiles')
      .select('role, email')
      .eq('id', userData.user.id)
      .single();

    if (profileErr || !profile || profile.role !== 'admin') {
      return { authorized: false, error: 'Administrator privileges required.', status: 403 };
    }

    return { authorized: true, email: profile.email || userData.user.email || 'admin' };
  }

  // Preview Mode: verify HMAC Bearer token
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { authorized: false, error: 'Missing admin session token.', status: 401 };
  }
  const token = authHeader.slice(7).trim();
  const verified = verifyAdminSessionToken(token);
  if (!verified.valid) {
    return { authorized: false, error: 'Invalid or expired admin session.', status: 401 };
  }

  return { authorized: true, email: verified.email || 'admin' };
}
