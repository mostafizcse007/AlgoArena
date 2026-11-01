'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
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
} from 'lucide-react';
import { Container } from '@/components/layout/Container';

function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifyingSession, setVerifyingSession] = useState(true);
  const [hasValidSession, setHasValidSession] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function checkSession() {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setHasValidSession(true);
      } else {
        setHasValidSession(false);
      }
      setVerifyingSession(false);
    }
    checkSession();
  }, []);

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

    setLoading(false);

    if (error) {
      setErrorMessage(error.message);
    } else {
      setSuccess(true);
      setTimeout(() => {
        router.push('/');
      }, 1200);
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
          <span>Passcode updated! Redirecting...</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3.5">
        <div>
          <label className="block text-xs font-medium text-[#E5E7EB] mb-1">
            New Passcode
          </label>
          <div className="relative">
            <Lock className="w-3.5 h-3.5 text-[#6B7280] absolute left-3 top-3" />
            <input
              type="password"
              required
              minLength={6}
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 rounded-lg bg-[#0B0D12] border border-white/[0.08] text-xs font-mono text-white placeholder-[#6B7280] focus:outline-none focus:border-sky-400/50 shadow-inner"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-[#E5E7EB] mb-1">
            Confirm New Passcode
          </label>
          <div className="relative">
            <Lock className="w-3.5 h-3.5 text-[#6B7280] absolute left-3 top-3" />
            <input
              type="password"
              required
              minLength={6}
              placeholder="••••••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 rounded-lg bg-[#0B0D12] border border-white/[0.08] text-xs font-mono text-white placeholder-[#6B7280] focus:outline-none focus:border-sky-400/50 shadow-inner"
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
