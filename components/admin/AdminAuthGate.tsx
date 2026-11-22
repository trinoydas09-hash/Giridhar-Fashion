'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, ArrowLeft, Lock, ShieldCheck } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

interface AuthModeState {
  loading: boolean;
  mode: 'supabase' | 'preview';
  requiresSetupClaim: boolean;
  hasEnvPasscode: boolean;
  claimedEmail: string | null;
}

interface AdminAuthGateProps {
  onAuthenticated: (session: { token: string; email: string; mode: 'supabase' | 'preview' }) => void;
}

export function AdminAuthGate({ onAuthenticated }: AdminAuthGateProps) {
  const [authState, setAuthState] = useState<AuthModeState>({
    loading: true,
    mode: 'preview',
    requiresSetupClaim: false,
    hasEnvPasscode: false,
    claimedEmail: null,
  });

  const [email, setEmail] = useState('admin@giridharfashion.com');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    async function inspectAuth() {
      try {
        const res = await fetch('/api/admin/auth', { cache: 'no-store' });
        const data = await res.json();
        if (!active) return;

        if (data.mode === 'supabase') {
          const sb = createSupabaseBrowserClient();
          if (sb) {
            const { data: sessionData } = await sb.auth.getSession();
            const token = sessionData.session?.access_token;
            if (token) {
              const checkRes = await fetch('/api/admin/auth', {
                headers: { Authorization: `Bearer ${token}` },
              });
              const checkJson = await checkRes.json();
              if (checkJson.authenticated) {
                onAuthenticated({
                  token,
                  email: checkJson.adminEmail || sessionData.session?.user?.email || 'admin',
                  mode: 'supabase',
                });
                return;
              }
            }
          }
        }

        if (data.claimedEmail) {
          setEmail(data.claimedEmail);
        }

        setAuthState({
          loading: false,
          mode: data.mode || 'preview',
          requiresSetupClaim: Boolean(data.requiresSetupClaim),
          hasEnvPasscode: Boolean(data.hasEnvPasscode),
          claimedEmail: data.claimedEmail || null,
        });
      } catch {
        if (!active) return;
        setAuthState((prev) => ({ ...prev, loading: false }));
      }
    }
    inspectAuth();
    return () => {
      active = false;
    };
  }, [onAuthenticated]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      if (authState.mode === 'supabase') {
        const sb = createSupabaseBrowserClient();
        if (!sb) {
          setError('Supabase client configuration missing.');
          return;
        }
        const { data, error: signErr } = await sb.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signErr || !data.session) {
          setError(signErr?.message || 'Invalid credentials.');
          return;
        }
        const verifyRes = await fetch('/api/admin/auth', {
          headers: { Authorization: `Bearer ${data.session.access_token}` },
        });
        const verifyJson = await verifyRes.json();
        if (!verifyJson.authenticated) {
          await sb.auth.signOut();
          setError('This account does not have administrator privileges in profiles.');
          return;
        }
        onAuthenticated({
          token: data.session.access_token,
          email: verifyJson.adminEmail || email.trim(),
          mode: 'supabase',
        });
        return;
      }

      if (authState.requiresSetupClaim) {
        if (password.length < 8) {
          setError('Choose a password of at least 8 characters.');
          return;
        }
        if (password !== confirmPassword) {
          setError('Passwords do not match.');
          return;
        }
      }

      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: authState.requiresSetupClaim ? 'claim' : 'login',
          email: email.trim(),
          password,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.token) {
        setError(data.error || 'Authentication failed.');
        return;
      }

      onAuthenticated({
        token: data.token,
        email: data.email || email.trim(),
        mode: 'preview',
      });
    } catch {
      setError('Unable to sign in right now. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (authState.loading) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center p-6">
        <p className="text-sm text-[#5A5853]">Verifying administrator session...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9F6] flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <img
            src="/assets/aistudio/image_32af7105.png"
            alt="GIRIDHAR FASHION"
            className="h-14 w-auto mx-auto object-contain mix-blend-multiply"
          />
          <p className="text-xs font-medium tracking-[0.2em] uppercase text-[#B99A61]">
            Store Administration
          </p>
          <h1 className="font-serif text-3xl font-semibold text-[#242424]">
            {authState.requiresSetupClaim ? 'Claim Store Admin Access' : 'Admin Sign In'}
          </h1>
        </div>

        <div className="bg-white border border-[#E4DDD0] p-6 sm:p-8 space-y-5">
          {authState.mode === 'supabase' ? (
            <div className="flex items-start gap-2.5 p-3 bg-[#F5F0E7] border border-[#E4DDD0] text-xs text-[#173D32]">
              <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
              <span>Connected to Supabase Auth. Only accounts with role = &apos;admin&apos; may access the dashboard.</span>
            </div>
          ) : authState.requiresSetupClaim ? (
            <div className="flex items-start gap-2.5 p-3 bg-[#F5F0E7] border border-[#E4DDD0] text-xs text-[#173D32]">
              <Lock className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                First-run setup: Set your store administrator email and password to unlock the dashboard. For production deployment, configure Supabase Auth credentials in your environment variables.
              </span>
            </div>
          ) : (
            <div className="flex items-start gap-2.5 p-3 bg-[#F5F0E7] border border-[#E4DDD0] text-xs text-[#5A5853]">
              <Lock className="w-4 h-4 shrink-0 mt-0.5 text-[#173D32]" />
              <span>
                Sign in with your store administrator credentials{authState.hasEnvPasscode ? ' (environment passcode active)' : ''}.
              </span>
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="flex items-center gap-2 p-3 bg-[#FEF2F2] border border-[#FECACA] text-xs font-medium text-[#991B1B]"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="admin-email" className="block text-xs font-semibold tracking-[0.12em] uppercase text-[#242424] mb-1.5">
                Admin Email
              </label>
              <input
                id="admin-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-[#D8CFC0] bg-[#FAF9F6] px-3.5 py-2.5 text-sm text-[#242424] focus:outline-none focus:border-[#173D32]"
              />
            </div>

            <div>
              <label htmlFor="admin-password" className="block text-xs font-semibold tracking-[0.12em] uppercase text-[#242424] mb-1.5">
                Password
              </label>
              <input
                id="admin-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={authState.requiresSetupClaim ? 'Minimum 8 characters' : 'Enter password'}
                className="w-full border border-[#D8CFC0] bg-[#FAF9F6] px-3.5 py-2.5 text-sm text-[#242424] focus:outline-none focus:border-[#173D32]"
              />
            </div>

            {authState.requiresSetupClaim && (
              <div>
                <label htmlFor="admin-confirm" className="block text-xs font-semibold tracking-[0.12em] uppercase text-[#242424] mb-1.5">
                  Confirm Password
                </label>
                <input
                  id="admin-confirm"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full border border-[#D8CFC0] bg-[#FAF9F6] px-3.5 py-2.5 text-sm text-[#242424] focus:outline-none focus:border-[#173D32]"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 px-6 bg-[#173D32] text-[#FAF9F6] text-xs font-bold tracking-[0.15em] uppercase hover:bg-[#102B23] transition-colors disabled:opacity-60"
            >
              {submitting
                ? 'Authenticating...'
                : authState.requiresSetupClaim
                ? 'Claim Admin Access & Enter'
                : 'Sign In to Dashboard'}
            </button>
          </form>
        </div>

        <div className="text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#5A5853] hover:text-[#173D32]"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Storefront</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
