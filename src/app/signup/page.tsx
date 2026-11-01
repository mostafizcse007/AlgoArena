'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { CheckCircle2, XCircle, Loader2, ArrowRight, Eye, EyeOff, Code, Trophy } from 'lucide-react';
import { BANGLADESH_UNIVERSITIES } from '@/lib/constants/universities';
import { CustomSelect, SelectOption } from '@/components/ui/CustomSelect';
import { getTier } from '@/lib/tier';
import { Container } from '@/components/layout/Container';
import { BrandLogo } from '@/components/ui/BrandLogo';

export default function SignUpPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [university, setUniversity] = useState('Independent');

  // Debounced username availability state
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [isUsernameAvailable, setIsUsernameAvailable] = useState<boolean | null>(null);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // University options for searchable CustomSelect
  const universityOptions: SelectOption[] = useMemo(() => {
    return [
      {
        value: 'Independent',
        label: 'Independent (School / College / Graduate / Professional)',
      },
      ...BANGLADESH_UNIVERSITIES.map((univ) => ({
        value: univ,
        label: univ,
      })),
    ];
  }, []);

  // 150ms debounce for @username availability RPC check
  useEffect(() => {
    if (!username || username.trim().length < 3) {
      return;
    }

    const handler = setTimeout(async () => {
      setIsCheckingUsername(true);
      const supabase = createClient();
      const { data, error } = await supabase.rpc('check_username_available', {
        p_username: username.trim(),
      });

      setIsCheckingUsername(false);
      if (!error && typeof data === 'boolean') {
        setIsUsernameAvailable(data);
      } else {
        setIsUsernameAvailable(null);
      }
    }, 150);

    return () => clearTimeout(handler);
  }, [username]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !email || !password) {
      setErrorMessage('Please fill in all required fields.');
      return;
    }
    if (isUsernameAvailable === false) {
      setErrorMessage('Username is already taken. Please choose another.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    const affiliation = (university || 'Independent').trim();

    const supabase = createClient();
    // Purge any stale session or cookies from previously deleted test accounts
    await supabase.auth.signOut().catch(() => {});

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/lobby`,
        data: {
          username: username.trim(),
          display_name: fullName.trim() || username.trim(),
          university: affiliation,
        },
      },
    });

    setLoading(false);

    if (error) {
      setErrorMessage(error.message);
    } else if (data?.session && data?.user?.email_confirmed_at) {
      router.push('/lobby');
    } else {
      router.push(`/verify?email=${encodeURIComponent(email)}`);
    }
  };

  return (
    <Container className="flex-1 flex flex-col items-center justify-start pt-6 sm:pt-8 md:pt-10 pb-8 sm:pb-12">
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-12 gap-6 bg-[#141824] rounded-xl p-6 sm:p-8 shadow-sm items-stretch">
        {/* Left Side: Calm Welcome Card (flattened, no inner border) */}
        <div className="hidden md:flex md:col-span-5 flex-col justify-between p-6 bg-black/20 rounded-xl">
          <div className="flex flex-col gap-5">
            {/* Geometric Wordmark */}
            <BrandLogo />

            <div>
              <h2 className="font-display text-xl font-semibold tracking-[-0.025em] text-[#F3F4F6] leading-tight mb-2">
                Join the ladder and duel other students in real time.
              </h2>
              <p className="text-xs text-[#9CA3AF] leading-relaxed">
                Compete against students in real time with side-by-side trace visualizers and fair rating progression.
              </p>
            </div>

            {/* Platform Foundations */}
            <div className="flex flex-col gap-3.5 pt-1">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#34D399] shrink-0 mt-0.5" />
                <div className="text-xs">
                  <div className="font-medium text-[#E5E7EB]">Fair judging</div>
                  <div className="text-[#9CA3AF]">Every submission is evaluated against hard test assertions in an isolated sandbox.</div>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Code className="w-4 h-4 text-[#38BDF8] shrink-0 mt-0.5" />
                <div className="text-xs">
                  <div className="font-medium text-[#E5E7EB]">See how both solutions run</div>
                  <div className="text-[#9CA3AF]">Inspect step-by-step array and graph operations on the dual-trace canvas.</div>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Trophy className="w-4 h-4 text-[#38BDF8] shrink-0 mt-0.5" />
                <div className="text-xs">
                  <div className="font-medium text-[#E5E7EB]">Instant matches</div>
                  <div className="text-[#9CA3AF]">Climb the leaderboard with automated Elo ratings updated immediately after each match.</div>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-5 border-t border-white/[0.07] mt-6 flex items-center justify-between text-xs text-[#6B7280]">
            <span>Starting Elo: <strong className="tabular-nums text-[#D1D5DB] font-sans">1200</strong></span>
            <span>Division: <strong className="text-[#34D399]">{getTier(1200)}</strong></span>
          </div>
        </div>

        {/* Right Side: Registration Form */}
        <div className="w-full md:col-span-7 flex flex-col justify-start gap-4">
          <div>
            {/* Mobile-only compact brand wordmark */}
            <div className="flex md:hidden items-center gap-2 mb-2">
              <BrandLogo />
            </div>
            <h1 className="font-display text-2xl font-semibold tracking-[-0.025em] text-[#F3F4F6] mb-1">
              Create your account
            </h1>
            <p className="text-xs text-[#9CA3AF]">
              Join the ladder and duel other students in real time.
            </p>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-mono flex items-center gap-2">
              <XCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
            {/* Full Name Field (Optional) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-[#E5E7EB]">
                  Full Name
                </label>
                <span className="text-[12px] text-[#9CA3AF]">Optional</span>
              </div>
              <input
                type="text"
                maxLength={60}
                placeholder="e.g. Mostafizur Rahman"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg bg-[#0B0D12] border border-white/[0.08] text-xs text-white placeholder-[#6B7280] focus:outline-none focus:border-sky-400/50 shadow-inner"
              />
            </div>

            {/* Username Field with 150ms availability badge */}
            <div>
              <label className="block text-xs font-medium text-[#E5E7EB] mb-1">
                Username
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="e.g. tour_de_force"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''));
                    setIsUsernameAvailable(null);
                  }}
                  className="w-full px-3.5 py-2 rounded-lg bg-[#0B0D12] border border-white/[0.08] text-xs text-white placeholder-[#6B7280] focus:outline-none focus:border-sky-400/50 shadow-inner"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                  {isCheckingUsername && (
                    <Loader2 className="w-3.5 h-3.5 text-[#6B7280] animate-spin" />
                  )}
                  {!isCheckingUsername && isUsernameAvailable === true && (
                    <span className="flex items-center gap-1 text-xs font-mono text-[#34D399]">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Available
                    </span>
                  )}
                  {!isCheckingUsername && isUsernameAvailable === false && (
                    <span className="flex items-center gap-1 text-xs font-mono text-rose-400">
                      <XCircle className="w-3.5 h-3.5" /> Taken
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Email Field */}
            <div>
              <label className="block text-xs font-medium text-[#E5E7EB] mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                placeholder="player@university.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg bg-[#0B0D12] border border-white/[0.08] text-xs text-white placeholder-[#6B7280] focus:outline-none focus:border-sky-400/50 shadow-inner"
              />
            </div>

            {/* Password Field with Show/Hide Toggle */}
            <div>
              <label className="block text-xs font-medium text-[#E5E7EB] mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-3.5 pr-10 py-2 rounded-lg bg-[#0B0D12] border border-white/[0.08] text-xs text-white placeholder-[#6B7280] focus:outline-none focus:border-sky-400/50 shadow-inner"
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

            {/* Searchable Campus Select Component (Replacing 14 pills) */}
            <div>
              <label className="block text-xs font-medium text-[#E5E7EB] mb-1">
                Campus Affiliation
              </label>
              <CustomSelect
                searchable={true}
                searchPlaceholder="Search campus or Independent..."
                searchEmptyText="No matching campus found"
                options={universityOptions}
                value={university}
                onChange={(val) => setUniversity(val)}
              />
            </div>

            <button
              type="submit"
              disabled={loading || isUsernameAvailable === false}
              className="mt-2 w-full py-2.5 rounded-lg bg-[#F3F4F6] text-[#0B0D12] hover:bg-white font-medium text-xs transition shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Registering...</span>
                </>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          <div className="text-center text-xs text-[#6B7280] pt-1">
            Already registered?{' '}
            <Link href="/login" className="text-[#38BDF8] hover:text-[#7DD3FC] font-normal transition">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </Container>
  );
}
