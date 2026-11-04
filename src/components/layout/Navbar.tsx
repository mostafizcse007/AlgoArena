'use client';

import React, { useEffect, useState, useRef, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import {
  Swords,
  Trophy,
  Volume2,
  VolumeX,
  Command,
  HelpCircle,
  ChevronDown,
  User,
  Settings,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { toggleMute, useIsMuted } from '@/lib/audio/sfx';
import { createClient } from '@/lib/supabase/client';
import { Container } from '@/components/layout/Container';
import { BrandLogo } from '@/components/ui/BrandLogo';
import type { Profile } from '@/lib/types/arena';
import { getTier, getTierBadge } from '@/lib/tier';
import { useProfile } from '@/lib/stores/useProfileStore';

const emptySubscribe = () => () => {};

function detectIsMac(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  // Modern Client Hints platform
  const uaDataPlatform = (navigator as { userAgentData?: { platform?: string } }).userAgentData?.platform;
  if (typeof uaDataPlatform === 'string' && uaDataPlatform.length > 0) {
    if (/mac/i.test(uaDataPlatform)) return true;
    if (/win|linux|android/i.test(uaDataPlatform)) return false;
  }
  // navigator.platform and userAgent fallback
  const platform = navigator.platform || '';
  const userAgent = navigator.userAgent || '';
  return /Mac|iPhone|iPod|iPad/i.test(platform) || /Macintosh|Mac OS X|iPhone|iPod|iPad/i.test(userAgent);
}

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { profile, setProfile } = useProfile();
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [avatarLoadError, setAvatarLoadError] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);
  const muted = useIsMuted();

  // Close account and mobile menus on route transition
  useEffect(() => {
    setIsAccountMenuOpen(false);
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Platform detection for keyboard shortcut (Ctrl K on Windows/Linux, ⌘K on macOS)
  const isMac = useSyncExternalStore(
    emptySubscribe,
    detectIsMac,
    () => false
  );
  const modKey = isMac ? '⌘K' : 'Ctrl K';

  // Dismiss account dropdown on click outside or Escape
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (accountMenuRef.current && !accountMenuRef.current.contains(e.target as Node)) {
        setIsAccountMenuOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setIsAccountMenuOpen(false);
      }
    }
    if (isAccountMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isAccountMenuOpen]);

  const handleMuteToggle = () => {
    toggleMute();
  };

  const openPalette = () => {
    window.dispatchEvent(new CustomEvent('algoarena:open_palette'));
  };

  const navigateTo = (href: string) => {
    setIsAccountMenuOpen(false);
    router.push(href);
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setProfile(null);
    setIsAccountMenuOpen(false);
    router.push('/');
  };

  const normalizedPath = pathname?.replace(/\/$/, '') || '';
  const isAuthRoute =
    normalizedPath === '/login' ||
    normalizedPath === '/signup' ||
    normalizedPath === '/forgot-password' ||
    normalizedPath === '/reset-password' ||
    normalizedPath === '/verify';

  // Hide the main app navbar during duels (Section 1 & 7)
  if (pathname?.startsWith('/arena')) {
    return null;
  }

  return (
    <header className="sticky top-0 z-40 w-full h-14 bg-[#11141C]/85 backdrop-blur-xl border-b border-white/[0.07] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]">
      <Container className="h-full flex items-center justify-between">
        {/* Brand & Main Links */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center cursor-pointer">
            <BrandLogo />
          </Link>

          <nav className="hidden md:flex items-center gap-1 text-xs font-medium">
            <Link
              href="/lobby"
              className="px-3 py-1.5 rounded-lg text-[#9CA3AF] hover:text-white hover:bg-white/[0.05] transition flex items-center gap-1.5"
            >
              <Swords className="w-3.5 h-3.5 text-[#9CA3AF]" />
              <span>Play</span>
            </Link>
            <Link
              href="/leaderboard"
              className="px-3 py-1.5 rounded-lg text-[#9CA3AF] hover:text-white hover:bg-white/[0.05] transition flex items-center gap-1.5"
            >
              <Trophy className="w-3.5 h-3.5 text-[#9CA3AF]" />
              <span>Leaderboard</span>
            </Link>
          </nav>
        </div>

        {/* Right Controls: Command Palette, Audio Toggle, User Status */}
        <div className="flex items-center gap-2.5">
          {/* Command Palette Trigger with Platform-Aware Keycap */}
          <button
            onClick={openPalette}
            className="hidden sm:flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] text-[#9CA3AF] hover:text-white text-xs transition cursor-pointer"
            title={`Command Palette (${modKey})`}
            aria-label="Open command palette"
          >
            <Command className="w-3.5 h-3.5" />
            <span className="text-xs text-[#9CA3AF]">Search</span>
            <kbd className="keycap text-xs" suppressHydrationWarning>
              {modKey}
            </kbd>
          </button>

          {/* Keyboard Shortcuts Trigger */}
          <button
            onClick={() =>
              window.dispatchEvent(new CustomEvent('algoarena:open_shortcuts'))
            }
            className="hidden sm:flex items-center p-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] text-[#9CA3AF] hover:text-white transition cursor-pointer"
            title="Keyboard Shortcuts (?)"
            aria-label="Open keyboard shortcuts"
          >
            <HelpCircle className="w-3.5 h-3.5" />
          </button>

          {/* SFX Mute Button */}
          <button
            onClick={handleMuteToggle}
            className="p-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] text-[#9CA3AF] hover:text-white transition cursor-pointer"
            title={muted ? 'Unmute Audio' : 'Mute Audio'}
            aria-label={muted ? 'Unmute Audio' : 'Mute Audio'}
            suppressHydrationWarning
          >
            {muted ? (
              <VolumeX className="w-3.5 h-3.5 text-[#9CA3AF]" />
            ) : (
              <Volume2 className="w-3.5 h-3.5 text-[#9CA3AF]" />
            )}
          </button>

          {/* Profile / Account Dropdown Menu */}
          {profile ? (
            <div className="relative" ref={accountMenuRef}>
              <button
                type="button"
                onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}
                aria-haspopup="menu"
                aria-expanded={isAccountMenuOpen}
                className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] hover:border-white/[0.15] transition cursor-pointer text-left select-none"
              >
                {/* User Avatar: image from profile.avatar_url or fallback letter */}
                <div className="w-6 h-6 rounded-md bg-white/[0.08] border border-white/[0.1] flex items-center justify-center text-xs font-semibold text-white overflow-hidden shrink-0">
                  {profile.avatar_url && !avatarLoadError ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={profile.avatar_url}
                      alt={profile.username}
                      className="w-full h-full object-cover"
                      onError={() => setAvatarLoadError(true)}
                    />
                  ) : (
                    (profile.username?.[0] || 'A').toUpperCase()
                  )}
                </div>
                <span className="text-xs font-medium text-[#E5E7EB]">
                  @{profile.username}
                </span>
                <span
                  className={`px-1.5 py-0.5 rounded text-xs tabular-nums border ${getTierBadge(
                    profile.elo
                  )}`}
                >
                  {profile.elo}
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-[#9CA3AF] transition-transform duration-150 ${
                    isAccountMenuOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Account Dropdown Menu */}
              {isAccountMenuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 top-full mt-1.5 z-50 w-56 bg-[#1D2333] border border-white/[0.1] rounded-xl p-1.5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12),0_16px_36px_-12px_rgba(0,0,0,0.6)] backdrop-blur-2xl flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-100"
                >
                  {/* Account Header with Avatar */}
                  <div className="px-2.5 py-2.5 flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-white/[0.08] border border-white/[0.1] flex items-center justify-center text-xs font-semibold text-white overflow-hidden shrink-0">
                      {profile.avatar_url && !avatarLoadError ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={profile.avatar_url}
                          alt={profile.username}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        (profile.username?.[0] || 'A').toUpperCase()
                      )}
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <div className="text-xs font-medium text-[#F3F4F6] truncate">
                        {profile.display_name &&
                        profile.display_name.trim().toLowerCase() !== profile.username.trim().toLowerCase()
                          ? profile.display_name
                          : `@${profile.username}`}
                      </div>
                      <div className="text-[11px] text-[#9CA3AF] flex items-center gap-1.5 flex-wrap">
                        {profile.display_name &&
                          profile.display_name.trim().toLowerCase() !== profile.username.trim().toLowerCase() && (
                            <span className="text-slate-400 truncate max-w-[80px]">@{profile.username}</span>
                          )}
                        <span className="tabular-nums text-[#38BDF8]">
                          {profile.elo} Elo
                        </span>
                        <span>•</span>
                        <span>{getTier(profile.elo)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="h-px bg-white/[0.07] my-1" />

                  {/* Menu Option 1: Profile */}
                  <Link
                    href={`/profile/${profile.username}`}
                    role="menuitem"
                    onClick={(e) => {
                      e.preventDefault();
                      navigateTo(`/profile/${profile.username}`);
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#D1D5DB] hover:text-white hover:bg-white/[0.06] transition flex items-center gap-2 cursor-pointer"
                  >
                    <User className="w-3.5 h-3.5 text-[#9CA3AF]" />
                    <span>Profile</span>
                  </Link>

                  {/* Menu Option 2: Settings */}
                  <Link
                    href="/settings"
                    role="menuitem"
                    onClick={(e) => {
                      e.preventDefault();
                      navigateTo('/settings');
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#D1D5DB] hover:text-white hover:bg-white/[0.06] transition flex items-center gap-2 cursor-pointer"
                  >
                    <Settings className="w-3.5 h-3.5 text-[#9CA3AF]" />
                    <span>Settings</span>
                  </Link>

                  <div className="h-px bg-white/[0.07] my-1" />

                  {/* Menu Option 3: Log out */}
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setIsAccountMenuOpen(false);
                      handleSignOut();
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg text-xs font-medium text-rose-300 hover:text-rose-200 hover:bg-rose-500/10 transition flex items-center gap-2 cursor-pointer text-left"
                  >
                    <LogOut className="w-3.5 h-3.5 text-rose-400" />
                    <span>Log out</span>
                  </button>
                </div>
              )}
            </div>
          ) : isAuthRoute ? null : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-[#9CA3AF] hover:text-white hover:bg-white/[0.05] transition"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-[#F3F4F6] text-[#0B0D12] hover:bg-white transition shadow-sm"
              >
                Join Arena
              </Link>
            </div>
          )}
          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] text-[#9CA3AF] hover:text-white transition cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            {isMobileMenuOpen ? (
              <X className="w-4 h-4" />
            ) : (
              <Menu className="w-4 h-4" />
            )}
          </button>
        </div>
      </Container>

      {/* Mobile Collapsible Navigation Menu (Section 9) */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-14 left-0 right-0 bg-[#141824] border-b border-white/[0.08] p-3 flex flex-col gap-1 shadow-2xl backdrop-blur-2xl animate-in slide-in-from-top-2 duration-150">
          <Link
            href="/lobby"
            onClick={() => setIsMobileMenuOpen(false)}
            className="px-3 py-2 rounded-lg text-xs font-medium text-[#E5E7EB] hover:bg-white/[0.06] transition flex items-center gap-2"
          >
            <Swords className="w-3.5 h-3.5 text-[#9CA3AF]" />
            <span>Play</span>
          </Link>
          <Link
            href="/leaderboard"
            onClick={() => setIsMobileMenuOpen(false)}
            className="px-3 py-2 rounded-lg text-xs font-medium text-[#E5E7EB] hover:bg-white/[0.06] transition flex items-center gap-2"
          >
            <Trophy className="w-3.5 h-3.5 text-[#9CA3AF]" />
            <span>Leaderboard</span>
          </Link>
          <button
            onClick={() => {
              setIsMobileMenuOpen(false);
              openPalette();
            }}
            className="px-3 py-2 rounded-lg text-xs font-medium text-[#E5E7EB] hover:bg-white/[0.06] transition flex items-center gap-2 text-left"
          >
            <Command className="w-3.5 h-3.5 text-[#9CA3AF]" />
            <span>Command Palette ({modKey})</span>
          </button>
        </div>
      )}
    </header>
  );
}
