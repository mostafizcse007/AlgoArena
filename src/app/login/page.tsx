'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Lock, User, Loader2, ArrowRight, XCircle, RotateCcw, Eye, EyeOff } from 'lucide-react';
import { Container } from '@/components/layout/Container';
import { DuelMark } from '@/components/ui/BrandLogo';
import { useToast } from '@/components/ui/Toast';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get('redirect');
  const { showToast } = useToast();
  const verifiedNotice = searchParams.get('verified') === 'true';
  const resetNotice = searchParams.get('reset') === 'success';

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isUnverified, setIsUnverified] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) {
      setErrorMessage('Please enter both your handle/email and passcode.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setIsUnverified(false);

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
        const msg = `No registered player found with username "@${cleanHandle}".`;
        setErrorMessage(msg);
        showToast(msg, 'error');
        return;
      }
      targetEmail = resolvedEmail;
    }

    // Authenticate
    const { data, error } = await supabase.auth.signInWithPassword({
      email: targetEmail,
      password,
    });

    setLoading(false);

    if (error) {
      if (error.message.toLowerCase().includes('email not confirmed')) {
        setIsUnverified(true);
        setUnverifiedEmail(targetEmail);
        const msg = 'Account unverified. Please confirm your email before signing in.';
        setErrorMessage(msg);
        showToast(msg, 'error');
      } else {
        setErrorMessage(error.message);
        showToast(error.message, 'error');
      }
    } else if (data.session) {
      router.push(redirectParam || '/');
    }
  };

  const handleResendEmail = async () => {
    if (!unverifiedEmail) return;
    const supabase = createClient();
    await supabase.auth.resend({
      type: 'signup',
      email: unverifiedEmail,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/`,
      },
    });
    router.push(`/verify?email=${encodeURIComponent(unverifiedEmail)}`);
  };

  return (
    <div className="w-full max-w-sm rounded-xl bg-[#141824] p-6 flex flex-col gap-4 shadow-sm">
      <div className="flex flex-col items-center text-center gap-1.5">
        <DuelMark size={24} className="text-[#38BDF8] mb-1" />
        <h1 className="font-display text-xl font-semibold tracking-[-0.025em] text-[#F3F4F6]">
          Sign In to AlgoArena
        </h1>
        <p className="text-xs text-[#9CA3AF]">
          Enter your @username or registered email.
        </p>
      </div>

      {verifiedNotice && (
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[#34D399] text-xs font-mono text-center">
          Email verified successfully. You may now enter the arena.
        </div>
      )}

      {resetNotice && (
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[#34D399] text-xs font-mono text-center">
          Passcode successfully updated. Please authenticate with your new passcode.
        </div>
      )}

      {errorMessage && (
        <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-mono flex items-center gap-2">
          <XCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {isUnverified && (
        <button
          onClick={handleResendEmail}
          className="w-full py-2 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs font-mono font-medium flex items-center justify-center gap-1.5 hover:bg-amber-500/20 transition cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Resend Verification Email</span>
        </button>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        <div>
          <label className="block text-xs font-medium text-[#E5E7EB] mb-1">
            Username or Email
          </label>
          <div className="relative">
            <User className="w-3.5 h-3.5 text-[#6B7280] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              required
              placeholder="@tour_de_force or player@univ.edu"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 rounded-lg bg-[#0B0D12] border border-white/[0.08] text-xs text-white placeholder-[#6B7280] focus:outline-none focus:border-sky-400/50 shadow-inner"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-medium text-[#E5E7EB]">
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-xs text-[#38BDF8] hover:text-[#7DD3FC] font-normal transition"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="w-3.5 h-3.5 text-[#6B7280] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type={showPassword ? 'text' : 'password'}
              required
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-9 pr-10 py-2 rounded-lg bg-[#0B0D12] border border-white/[0.08] text-xs text-white placeholder-[#6B7280] focus:outline-none focus:border-sky-400/50 shadow-inner"
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

        <button
          type="submit"
          disabled={loading}
          className="mt-1 w-full py-2.5 rounded-lg bg-[#F3F4F6] text-[#0B0D12] hover:bg-white font-medium text-xs transition shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Authenticating...</span>
            </>
          ) : (
            <>
              <span>Sign In</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </form>

      <div className="text-center text-xs text-[#6B7280] pt-2 border-t border-white/[0.07]">
        Need an account?{' '}
        <Link href="/signup" className="text-[#38BDF8] hover:text-[#7DD3FC] font-normal transition">
          Create account
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Container className="flex-1 flex flex-col items-center justify-start pt-8 sm:pt-14 md:pt-18 pb-10">
      <Suspense fallback={<div className="w-full max-w-sm h-80 rounded-xl bg-[#11141C] shimmer-skeleton" />}>
        <LoginForm />
      </Suspense>
    </Container>
  );
}
