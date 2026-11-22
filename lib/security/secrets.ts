import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { AIProviderConfigPublic, AIProviderId } from '@/types/store';

const SECRETS_FILE_PATH = path.join('/tmp', 'giridhar-ai-secrets.json');

interface StoredProviderSecret {
  provider: AIProviderId;
  label: string;
  is_enabled: boolean;
  selected_model: string;
  custom_base_url: string | null;
  encrypted_api_key: string | null; // AES-256-GCM encrypted payload: iv:tag:cipher
  last_tested_at: string | null;
  last_test_status: 'untested' | 'ok' | 'error';
  last_test_message: string | null;
}

export const PROVIDER_DEFAULT_MODELS: Record<AIProviderId, { label: string; models: string[]; defaultModel: string }> = {
  gemini: {
    label: 'Google Gemini',
    defaultModel: 'gemini-2.5-flash-lite',
    models: ['gemini-2.5-flash-lite'],
  },
  openai: {
    label: 'OpenAI (ChatGPT)',
    defaultModel: 'gpt-4o-mini',
    models: ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1-mini', 'gpt-4.1'],
  },
  custom: {
    label: 'Other / OpenAI-Compatible Provider',
    defaultModel: 'llama-3.3-70b-versatile',
    models: ['llama-3.3-70b-versatile', 'deepseek-chat', 'claude-3-7-sonnet', 'mistral-large-latest'],
  },
};

declare global {
  var __giridharSecretKey: Buffer | undefined;
  var __giridharProviderSecrets: Record<AIProviderId, StoredProviderSecret> | undefined;
}

function getEncryptionKey(): Buffer {
  if (globalThis.__giridharSecretKey) {
    return globalThis.__giridharSecretKey;
  }
  const source =
    process.env.CREDENTIALS_ENCRYPTION_KEY?.trim() ||
    process.env.ADMIN_SESSION_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    'giridhar-preview-ephemeral-local-secret-v1';

  const derived = crypto.createHash('sha256').update(source).digest();
  globalThis.__giridharSecretKey = derived;
  return derived;
}

function encryptSecret(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64url')}:${tag.toString('base64url')}:${encrypted.toString('base64url')}`;
}

function decryptSecret(payload: string | null): string | null {
  if (!payload) return null;
  const parts = payload.split(':');
  if (parts.length !== 3) return null;
  try {
    const key = getEncryptionKey();
    const iv = Buffer.from(parts[0], 'base64url');
    const tag = Buffer.from(parts[1], 'base64url');
    const ciphertext = Buffer.from(parts[2], 'base64url');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
  } catch {
    return null;
  }
}

export function maskApiKey(rawKey: string | null): string | null {
  if (!rawKey || rawKey.trim().length === 0) return null;
  const clean = rawKey.trim();
  if (clean.length <= 8) return '••••••••';
  return `${clean.slice(0, 4)}••••••••${clean.slice(-4)}`;
}

function createDefaultSecretsMap(): Record<AIProviderId, StoredProviderSecret> {
  return {
    gemini: {
      provider: 'gemini',
      label: PROVIDER_DEFAULT_MODELS.gemini.label,
      is_enabled: true,
      selected_model: PROVIDER_DEFAULT_MODELS.gemini.defaultModel,
      custom_base_url: null,
      encrypted_api_key: null,
      last_tested_at: null,
      last_test_status: 'untested',
      last_test_message: null,
    },
    openai: {
      provider: 'openai',
      label: PROVIDER_DEFAULT_MODELS.openai.label,
      is_enabled: false,
      selected_model: PROVIDER_DEFAULT_MODELS.openai.defaultModel,
      custom_base_url: 'https://api.openai.com/v1',
      encrypted_api_key: null,
      last_tested_at: null,
      last_test_status: 'untested',
      last_test_message: null,
    },
    custom: {
      provider: 'custom',
      label: PROVIDER_DEFAULT_MODELS.custom.label,
      is_enabled: false,
      selected_model: PROVIDER_DEFAULT_MODELS.custom.defaultModel,
      custom_base_url: '',
      encrypted_api_key: null,
      last_tested_at: null,
      last_test_status: 'untested',
      last_test_message: null,
    },
  };
}

function loadLocalSecrets(): Record<AIProviderId, StoredProviderSecret> {
  if (globalThis.__giridharProviderSecrets) {
    return globalThis.__giridharProviderSecrets;
  }
  const defaults = createDefaultSecretsMap();
  try {
    if (fs.existsSync(SECRETS_FILE_PATH)) {
      const raw = fs.readFileSync(SECRETS_FILE_PATH, 'utf8');
      const parsed = JSON.parse(raw) as Partial<Record<AIProviderId, StoredProviderSecret>>;
      const merged = {
        gemini: { ...defaults.gemini, ...parsed.gemini },
        openai: { ...defaults.openai, ...parsed.openai },
        custom: { ...defaults.custom, ...parsed.custom },
      };
      globalThis.__giridharProviderSecrets = merged;
      return merged;
    }
  } catch {
    // Fallback to defaults
  }
  globalThis.__giridharProviderSecrets = defaults;
  return defaults;
}

function saveLocalSecrets(map: Record<AIProviderId, StoredProviderSecret>): void {
  globalThis.__giridharProviderSecrets = map;
  try {
    fs.writeFileSync(SECRETS_FILE_PATH, JSON.stringify(map, null, 2), { encoding: 'utf8', mode: 0o600 });
  } catch {
    // Ignore read-only edge cases
  }
}

async function loadSecretsMap(): Promise<Record<AIProviderId, StoredProviderSecret>> {
  if (isSupabaseConfigured()) {
    const admin = createSupabaseAdminClient();
    if (admin) {
      try {
        const { data, error } = await admin.from('ai_provider_configs').select('*');
        if (!error && Array.isArray(data) && data.length > 0) {
          const map = createDefaultSecretsMap();
          for (const row of data as StoredProviderSecret[]) {
            if (row.provider && map[row.provider]) {
              map[row.provider] = { ...map[row.provider], ...row };
            }
          }
          return map;
        }
      } catch {
        // Fallback cleanly when table not yet migrated
      }
    }
  }
  return loadLocalSecrets();
}

function getEnvFallbackKey(provider: AIProviderId): string | null {
  if (provider === 'gemini') {
    const k = process.env.GEMINI_API_KEY?.trim();
    return k && k !== 'MY_GEMINI_API_KEY' ? k : null;
  }
  if (provider === 'openai') {
    const k = process.env.OPENAI_API_KEY?.trim();
    return k || null;
  }
  return null;
}

export async function getPublicProviderConfigs(): Promise<AIProviderConfigPublic[]> {
  const map = await loadSecretsMap();
  const order: AIProviderId[] = ['gemini', 'openai', 'custom'];

  return order.map((id) => {
    const rec = map[id];
    const storedKey = decryptSecret(rec.encrypted_api_key);
    const effectiveKey = storedKey || getEnvFallbackKey(id);
    const meta = PROVIDER_DEFAULT_MODELS[id];
    // Older saved Gemini model IDs in this project are not valid current API model IDs.
    const selectedModel =
      id === 'gemini' && !meta.models.includes(rec.selected_model)
        ? meta.defaultModel
        : rec.selected_model || meta.defaultModel;

    return {
      provider: id,
      label: rec.label || meta.label,
      is_enabled: rec.is_enabled,
      selected_model: selectedModel,
      available_models: meta.models,
      custom_base_url: rec.custom_base_url,
      has_api_key: Boolean(effectiveKey),
      key_preview: storedKey
        ? maskApiKey(storedKey)
        : effectiveKey
        ? `${maskApiKey(effectiveKey)} (env)`
        : null,
      last_tested_at: rec.last_tested_at,
      last_test_status: rec.last_test_status || 'untested',
      last_test_message: rec.last_test_message,
    };
  });
}

export async function resolveServerProviderCredentials(provider: AIProviderId): Promise<{
  provider: AIProviderId;
  is_enabled: boolean;
  selected_model: string;
  custom_base_url: string | null;
  api_key: string | null;
}> {
  const map = await loadSecretsMap();
  const rec = map[provider];
  const storedKey = decryptSecret(rec.encrypted_api_key);
  const envKey = getEnvFallbackKey(provider);

  return {
    provider,
    is_enabled: rec.is_enabled,
    selected_model:
      provider === 'gemini' && !PROVIDER_DEFAULT_MODELS.gemini.models.includes(rec.selected_model)
        ? PROVIDER_DEFAULT_MODELS.gemini.defaultModel
        : rec.selected_model || PROVIDER_DEFAULT_MODELS[provider].defaultModel,
    custom_base_url: rec.custom_base_url,
    api_key: storedKey || envKey,
  };
}

export async function updateProviderConfig(input: {
  provider: AIProviderId;
  is_enabled: boolean;
  selected_model: string;
  custom_base_url?: string | null;
  api_key?: string; // Omit or empty string keeps existing stored key; '__CLEAR__' clears key
  label?: string;
}): Promise<AIProviderConfigPublic[]> {
  const map = await loadSecretsMap();
  const current = map[input.provider];

  let nextEncrypted = current.encrypted_api_key;
  if (input.api_key === '__CLEAR__') {
    nextEncrypted = null;
  } else if (typeof input.api_key === 'string' && input.api_key.trim().length > 0) {
    nextEncrypted = encryptSecret(input.api_key.trim());
  }

  const updated: StoredProviderSecret = {
    ...current,
    label: input.label?.trim() || current.label,
    is_enabled: input.is_enabled,
    selected_model: input.selected_model.trim() || PROVIDER_DEFAULT_MODELS[input.provider].defaultModel,
    custom_base_url:
      input.custom_base_url !== undefined ? (input.custom_base_url?.trim() || null) : current.custom_base_url,
    encrypted_api_key: nextEncrypted,
  };

  map[input.provider] = updated;

  if (isSupabaseConfigured()) {
    const admin = createSupabaseAdminClient();
    if (admin) {
      await admin.from('ai_provider_configs').upsert({
        provider: updated.provider,
        label: updated.label,
        is_enabled: updated.is_enabled,
        selected_model: updated.selected_model,
        custom_base_url: updated.custom_base_url,
        encrypted_api_key: updated.encrypted_api_key,
        last_tested_at: updated.last_tested_at,
        last_test_status: updated.last_test_status,
        last_test_message: updated.last_test_message,
        updated_at: new Date().toISOString(),
      });
    }
  }

  saveLocalSecrets(map);
  return getPublicProviderConfigs();
}

export async function recordProviderTestResult(
  provider: AIProviderId,
  status: 'ok' | 'error',
  message: string
): Promise<void> {
  const map = await loadSecretsMap();
  const current = map[provider];
  const now = new Date().toISOString();
  const updated: StoredProviderSecret = {
    ...current,
    last_tested_at: now,
    last_test_status: status,
    last_test_message: message.slice(0, 240),
  };
  map[provider] = updated;

  if (isSupabaseConfigured()) {
    const admin = createSupabaseAdminClient();
    if (admin) {
      await admin
        .from('ai_provider_configs')
        .upsert({ ...updated, updated_at: now });
    }
  }
  saveLocalSecrets(map);
}
