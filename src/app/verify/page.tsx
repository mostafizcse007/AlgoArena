'use client';

import React, { useState, useEffect, Suspense, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import {
  Mail,
  ExternalLink,
  CheckCircle2,
  Loader2,
  XCircle,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react';
import { Container } from '@/components/layout/Container';

function VerifyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailParam = searchParams.get('email') || '';

  const [email] = useState(emailParam);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isConfirmed, setIsConfirmed] = useState(false);

  // Check if user is already confirmed
  const checkActiveSession = useCallback(async () => {
    try {
      const supabase = createClient();

      // 1. If email is provided, verify directly against the database via RPC
      if (email) {
        const { data: isConfirmedDb, error: rpcError } = await supabase.rpc('is_email_confirmed', {
          p_email: email.trim(),
        });

        if (!rpcError && isConfirmedDb === true) {
          setIsConfirmed(true);
          setTimeout(() => {
            router.push('/lobby');
          }, 1200);
          return true;
        }
      }

      // 2. Also check if active auth session is confirmed and matches this email
      const { data: { user }, error } = await supabase.auth.getUser();
      if (!error && user && user.email_confirmed_at) {
        // Disregard stale session from a different email
        if (!email || user.email?.toLowerCase() === email.toLowerCase()) {
          setIsConfirmed(true);
          setTimeout(() => {
            router.push('/lobby');
          }, 1200);
          return true;
        }
      }
    } catch (err) {
      console.error('Session check error:', err);
    }
    return false;
  }, [router, email]);

  useEffect(() => {
    const supabase = createClient();

    const initialCheckTimer = setTimeout(() => {
      checkActiveSession();
    }, 500);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user?.email_confirmed_at) {
        if (!email || session.user.email?.toLowerCase() === email.toLowerCase()) {
          setIsConfirmed(true);
          setTimeout(() => {
            router.push('/lobby');
          }, 1200);
        }
      }
    });

    const handleFocus = () => {
      checkActiveSession();
    };
    window.addEventListener('focus', handleFocus);

    const interval = setInterval(() => {
      checkActiveSession();
    }, 4000);

    return () => {
      clearTimeout(initialCheckTimer);
      subscription.unsubscribe();
      window.removeEventListener('focus', handleFocus);
      clearInterval(interval);
    };
  }, [checkActiveSession, router]);

  const handleManualCheck = async () => {
    setCheckingStatus(true);
    setErrorMessage(null);
    const hasSession = await checkActiveSession();
    setCheckingStatus(false);
    if (!hasSession) {
      setErrorMessage('Confirmation pending. Please click the "Confirm email address" link in your email.');
    }
  };

  const handleResend = async () => {
    if (!email) return;
    setResending(true);
    setErrorMessage(null);
    setResendSuccess(false);

    const supabase = createClient();
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/lobby`,
      },
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
      <div className="flex items-center justify-center mb-1">
        {isConfirmed ? (
          <CheckCircle2 className="w-8 h-8 text-[#34D399] animate-bounce" />
        ) : (
          <Mail className="w-8 h-8 text-sky-400" />
        )}
      </div>

      {/* Title & Instructions */}
      <div className="text-center">
        <h1 className="font-display text-xl font-semibold tracking-[-0.025em] text-[#F3F4F6] mb-1">
          {isConfirmed ? 'Account Verified' : 'Confirm Your Email'}
        </h1>
        <p className="text-xs text-[#9CA3AF] max-w-sm mx-auto leading-relaxed">
          {isConfirmed ? (
            <span className="text-[#34D399] font-mono">
              Credentials authorized. Transitioning to Cockpit...
            </span>
          ) : (
            <>
              We sent a verification link to{' '}
              <span className="text-sky-400 font-mono font-medium break-all">
                {email || 'your email'}
              </span>
              . Click the confirmation link to activate your account.
            </>
          )}
        </p>
      </div>

      {/* Alerts */}
      {errorMessage && (
        <div className="w-full p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-mono flex items-center gap-2">
          <XCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {resendSuccess && (
        <div className="w-full p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[#34D399] text-xs font-mono text-center flex items-center justify-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>Verification email re-sent to your inbox.</span>
        </div>
      )}

      {/* Live Status & Action Buttons Box */}
      <div className="w-full bg-[#0B0D12] border border-white/[0.07] rounded-lg p-3.5 flex flex-col gap-2.5">
        <div className="flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#34D399] animate-pulse" />
            <span className="text-[#9CA3AF]">Listening for link confirmation...</span>
          </div>
          <span className="text-xs text-[#9CA3AF]">Auto-Sync</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
          <a
            href="https://mail.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="py-2 px-3 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-[#E5E7EB] font-mono text-xs flex items-center justify-center gap-1.5 transition"
          >
            <Mail className="w-3.5 h-3.5 text-sky-400" />
            <span>Open Gmail</span>
            <ExternalLink className="w-3 h-3 text-[#6B7280]" />
          </a>

          <button
            type="button"
            onClick={handleManualCheck}
            disabled={checkingStatus}
            className="py-2 px-3 rounded-lg bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-medium transition flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]"
          >
            {checkingStatus ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Checking...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Check Status</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-between w-full text-xs font-mono pt-2 border-t border-white/[0.07] text-[#6B7280]">
        <button
          type="button"
          onClick={handleResend}
          disabled={resending}
          className="text-sky-400 hover:underline flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${resending ? 'animate-spin' : ''}`} />
          <span>Resend Email</span>
        </button>

        <Link href="/login" className="text-[#9CA3AF] hover:text-white transition">
          Back to Login
        </Link>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Container className="flex-1 flex flex-col items-center justify-start pt-8 sm:pt-14 md:pt-18 pb-10">
      <Suspense fallback={<div className="w-full max-w-md h-96 rounded-xl bg-[#11141C] shimmer-skeleton" />}>
        <VerifyForm />
      </Suspense>
    </Container>
  );
}
