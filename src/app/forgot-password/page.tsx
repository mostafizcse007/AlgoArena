'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import {
  KeyRound,
  Mail,
  User,
  Loader2,
  ArrowRight,
  XCircle,
  CheckCircle2,
  ExternalLink,
  RotateCcw,
} from 'lucide-react';
import { Container } from '@/components/layout/Container';

function ForgotPasswordForm() {
  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sentEmail, setSentEmail] = useState<string | null>(null);
  const [resendSuccess, setResendSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setErrorMessage('Please enter your username or email address.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    const supabase = createClient();
    let targetEmail = identifier.trim();

    // If identifier is not an email (i.e. @username or handle without @), resolve via RPC
    if (!targetEmail.includes('@')) {
      const cleanHandle = targetEmail.startsWith('@') ? targetEmail.slice(1) : targetEmail;
      const { data: resolvedEmail, error: rpcError } = await supabase.rpc(
        'resolve_email_by_username',
        { p_username: cleanHandle }
      );

      if (rpcError || !resolvedEmail) {
        setLoading(false);
        setErrorMessage(`No registered player found with username "@${cleanHandle}".`);
        return;
      }
      targetEmail = resolvedEmail;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(targetEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setLoading(false);

    if (error) {
      setErrorMessage(error.message);
    } else {
      setSentEmail(targetEmail);
    }
  };

  const handleResend = async () => {
    if (!sentEmail) return;
    setResending(true);
    setErrorMessage(null);
    setResendSuccess(false);

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(sentEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setResending(false);
    if (error) {
      setErrorMessage(error.message);
    } else {
      setResendSuccess(true);
    }
  };

  return (
    <div className="w-full max-w-md bg-[#11141C] border border-white/[0.08] rounded-xl p-6 sm:p-8 flex flex-col items-center gap-5 shadow-sm">
      {/* Main Header Icon */}
      <div className="flex items-center justify-center text-sky-400 mb-1">
        {sentEmail ? <Mail className="w-8 h-8" /> : <KeyRound className="w-8 h-8" />}
      </div>

      {/* Title & Subtitle */}
      <div className="text-center">
        <h1 className="font-display text-xl font-semibold tracking-[-0.025em] text-[#F3F4F6] mb-1">
          {sentEmail ? 'Reset Link Sent' : 'Reset Password'}
        </h1>
        <p className="text-xs text-[#9CA3AF] max-w-sm mx-auto leading-relaxed">
          {sentEmail ? (
            <>
              A password reset link was dispatched to{' '}
              <span className="text-sky-400 font-mono font-medium break-all">
                {sentEmail}
              </span>
              . Click the link in your email to choose a new password.
            </>
          ) : (
            'Enter your registered handle or email to receive a recovery link.'
          )}
        </p>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="w-full p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-mono flex items-center gap-2">
          <XCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Resend Success Message */}
      {resendSuccess && (
        <div className="w-full p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[#34D399] text-xs font-mono text-center flex items-center justify-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>Fresh recovery link dispatched to your inbox.</span>
        </div>
      )}

      {!sentEmail ? (
        /* Form View */
        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3.5">
          <div>
            <label className="block text-xs font-medium text-[#E5E7EB] mb-1">
              Username or Email
            </label>
            <div className="relative">
              <User className="w-3.5 h-3.5 text-[#6B7280] absolute left-3 top-3" />
              <input
                type="text"
                required
                placeholder="@tour_de_force or player@univ.edu"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 rounded-lg bg-[#0B0D12] border border-white/[0.08] text-xs font-mono text-white placeholder-[#6B7280] focus:outline-none focus:border-sky-400/50 shadow-inner"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-1 w-full py-2.5 rounded-lg bg-[#F3F4F6] text-[#0B0D12] hover:bg-white font-medium text-xs transition shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Sending Link...</span>
              </>
            ) : (
              <>
                <span>Send Recovery Link</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>
      ) : (
        /* Dispatched View */
        <div className="w-full bg-[#0B0D12] border border-white/[0.07] rounded-lg p-3.5 flex flex-col gap-2.5">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-[#9CA3AF]">Next step: Check your email inbox</span>
            <span className="text-xs text-[#34D399] font-medium">Delivered</span>
          </div>

          <a
            href="https://mail.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-2 px-3 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-[#E5E7EB] font-mono text-xs flex items-center justify-center gap-1.5 transition"
          >
            <Mail className="w-3.5 h-3.5 text-sky-400" />
            <span>Open Gmail Inbox</span>
            <ExternalLink className="w-3 h-3 text-[#6B7280]" />
          </a>
        </div>
      )}

      {/* Footer Navigation */}
      <div className="flex items-center justify-between w-full text-xs font-mono pt-2 border-t border-white/[0.07] text-[#6B7280]">
        {sentEmail ? (
          <button
            type="button"
            onClick={handleResend}
            disabled={resending}
            className="text-sky-400 hover:underline flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${resending ? 'animate-spin' : ''}`} />
            <span>Resend Link</span>
          </button>
        ) : (
          <Link href="/login" className="text-[#9CA3AF] hover:text-white transition">
            Remembered password?
          </Link>
        )}

        <Link href="/login" className="text-sky-400 hover:underline font-medium">
          Sign In
        </Link>
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Container className="flex-1 flex flex-col items-center justify-start pt-8 sm:pt-14 md:pt-18 pb-10">
      <Suspense fallback={<div className="w-full max-w-md h-96 rounded-xl bg-[#11141C] shimmer-skeleton" />}>
        <ForgotPasswordForm />
      </Suspense>
    </Container>
  );
}
