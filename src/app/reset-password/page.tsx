'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import {
  Lock,
  Loader2,
  ArrowRight,
  XCircle,
  CheckCircle2,
  KeyRound,
  AlertTriangle,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Container } from '@/components/layout/Container';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifyingSession, setVerifyingSession] = useState(true);
  const [hasValidSession, setHasValidSession] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const supabase = createClient();

    // 1. Subscribe to auth state changes (e.g. PASSWORD_RECOVERY or SIGNED_IN)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;
      if (event === 'PASSWORD_RECOVERY' || (session && event === 'SIGNED_IN')) {
        setHasValidSession(true);
        setVerifyingSession(false);
      }
    });

    async function checkRecoverySession() {
      // 2. If a PKCE code is in searchParams, exchange it on the client
      const code = searchParams.get('code');
      if (code) {
        try {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (!error && data.session) {
            if (isMounted) {
              setHasValidSession(true);
              setVerifyingSession(false);
            }
            return;
          }
        } catch (err) {
          console.warn('PKCE exchange error on client:', err);
        }
      }

      // 3. Check existing active session
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        if (isMounted) {
          setHasValidSession(true);
          setVerifyingSession(false);
        }
        return;
      }

      // 4. Fallback timeout to allow Supabase client to parse URL hash fragment (#access_token=...)
      const timer = setTimeout(async () => {
        if (!isMounted) return;
        const {
          data: { session: fallbackSession },
        } = await supabase.auth.getSession();
        if (fallbackSession) {
          setHasValidSession(true);
        } else {
          setHasValidSession(false);
        }
        setVerifyingSession(false);
      }, 2000);

      return () => clearTimeout(timer);
    }

    checkRecoverySession();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || !confirmPassword) {
      setErrorMessage('Please enter and confirm your new passcode.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Passcode must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passcodes do not match. Please verify both fields.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({
      password: password,
    });

    if (error) {
      setLoading(false);
      setErrorMessage(error.message);
    } else {
      setSuccess(true);
      // Cleanly sign out the temporary recovery session so user can log in with new credentials
      await supabase.auth.signOut().catch(() => {});
      setTimeout(() => {
        router.push('/login?reset=success');
      }, 1000);
    }
  };

  if (verifyingSession) {
    return (
      <div className="w-full max-w-md bg-[#11141C] border border-white/[0.08] rounded-xl p-8 flex flex-col items-center justify-center gap-3 shadow-sm">
        <Loader2 className="w-6 h-6 text-sky-400 animate-spin" />
        <span className="text-xs font-mono text-[#9CA3AF]">Verifying recovery session...</span>
      </div>
    );
  }

  if (!hasValidSession) {
    return (
      <div className="w-full max-w-md bg-[#11141C] border border-white/[0.08] rounded-xl p-6 sm:p-8 flex flex-col items-center gap-5 shadow-sm text-center">
        <AlertTriangle className="w-8 h-8 text-rose-400 mb-1" />

        <div>
          <h1 className="font-display text-lg font-semibold tracking-[-0.025em] text-[#F3F4F6] mb-1">
            Recovery Link Expired
          </h1>
          <p className="text-xs text-[#9CA3AF] max-w-xs mx-auto leading-relaxed">
            The password reset link has expired or has already been used. Please request a fresh recovery link.
          </p>
        </div>

        <Link
          href="/forgot-password"
          className="w-full py-2.5 rounded-lg bg-[#F3F4F6] text-[#0B0D12] hover:bg-white text-xs font-medium text-center transition shadow-sm"
        >
          Request Fresh Link
        </Link>

        <Link href="/login" className="text-xs text-[#9CA3AF] hover:text-white transition">
          Back to Login
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md bg-[#11141C] border border-white/[0.08] rounded-xl p-6 sm:p-8 flex flex-col items-center gap-5 shadow-sm">
      {/* Main Header Icon */}
      <KeyRound className="w-8 h-8 text-sky-400 mb-1" />

      {/* Title & Subtitle */}
      <div className="text-center">
        <h1 className="font-display text-xl font-semibold tracking-[-0.025em] text-[#F3F4F6] mb-1">
          Set New Passcode
        </h1>
        <p className="text-xs text-[#9CA3AF] max-w-sm mx-auto leading-relaxed">
          Choose a strong passcode with at least 6 characters.
        </p>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="w-full p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-mono flex items-center gap-2">
          <XCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="w-full p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[#34D399] text-xs font-mono text-center flex items-center justify-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>Passcode updated! Redirecting to Sign In...</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3.5">
        <div>
          <label className="block text-xs font-medium text-[#E5E7EB] mb-1">
            New Passcode
          </label>
          <div className="relative">
            <Lock className="w-3.5 h-3.5 text-[#6B7280] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type={showPassword ? 'text' : 'password'}
              required
              minLength={6}
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-9 pr-10 py-2 rounded-lg bg-[#0B0D12] border border-white/[0.08] text-xs font-mono text-white placeholder-[#6B7280] focus:outline-none focus:border-sky-400/50 shadow-inner"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#9CA3AF] hover:text-[#E5E7EB] transition cursor-pointer"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-[#E5E7EB] mb-1">
            Confirm New Passcode
          </label>
          <div className="relative">
            <Lock className="w-3.5 h-3.5 text-[#6B7280] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type={showPassword ? 'text' : 'password'}
              required
              minLength={6}
              placeholder="••••••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full pl-9 pr-10 py-2 rounded-lg bg-[#0B0D12] border border-white/[0.08] text-xs font-mono text-white placeholder-[#6B7280] focus:outline-none focus:border-sky-400/50 shadow-inner"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || success}
          className="mt-1 w-full py-2.5 rounded-lg bg-[#F3F4F6] text-[#0B0D12] hover:bg-white font-medium text-xs transition shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Updating Passcode...</span>
            </>
          ) : (
            <>
              <span>Save New Passcode</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </form>

      {/* Footer Navigation */}
      <div className="text-center text-xs font-mono text-[#6B7280] pt-2 border-t border-white/[0.07] w-full">
        <Link href="/login" className="text-sky-400 hover:underline font-medium">
          Cancel and return to Login
        </Link>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Container className="flex-1 flex flex-col items-center justify-start pt-8 sm:pt-14 md:pt-18 pb-10">
      <Suspense fallback={<div className="w-full max-w-md h-96 rounded-xl bg-[#11141C] shimmer-skeleton" />}>
        <ResetPasswordForm />
      </Suspense>
    </Container>
  );
}
