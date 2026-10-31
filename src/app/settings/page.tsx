'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  User,
  Code2,
  Volume2,
  VolumeX,
  Lock,
  Camera,
  Loader2,
  Check,
  RotateCcw,
  Play,
  Eye,
  EyeOff,
  AlertCircle,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { Profile } from '@/lib/types/arena';
import { getTier } from '@/lib/tier';
import { BANGLADESH_UNIVERSITIES } from '@/lib/constants/universities';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { Container } from '@/components/layout/Container';
import {
  saveEditorSettings,
  DEFAULT_EDITOR_SETTINGS,
  useEditorSettings,
  type EditorSettings,
} from '@/lib/settings/editorSettings';
import {
  toggleMute,
  useIsMuted,
  setVolume,
  useVolume,
  setTimerTicksEnabled,
  useTimerTicksEnabled,
  playTick,
  playPass,
  playFail,
  playHack,
  playVictory,
  playDefeat,
} from '@/lib/audio/sfx';

type SettingsTab = 'profile' | 'editor' | 'audio' | 'security';

export default function SettingsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [authLoading, setAuthLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  // Profile Form State
  const [displayNameInput, setDisplayNameInput] = useState('');
  const [bioInput, setBioInput] = useState('');
  const [univInput, setUnivInput] = useState('Independent');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Editor Form State
  const editorSettings = useEditorSettings();
  const [editorSuccess, setEditorSuccess] = useState(false);

  // Audio Form State
  const sfxMuted = useIsMuted();
  const sfxVolume = useVolume();
  const timerTicks = useTimerTicksEnabled();
  const [playingSound, setPlayingSound] = useState<string | null>(null);

  // Security Form State
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // Load User & Profile
  useEffect(() => {
    const supabase = createClient();

    async function loadData() {
      setAuthLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setProfile({
          id: 'guest',
          username: 'guest_player',
          display_name: 'Guest Player',
          tier: getTier(1200),
          elo: 1200,
          peak_elo: 1200,
          university: 'Independent',
          bio: 'Competitive programming contender.',
          avatar_url: null,
          matches_played: 0,
          matches_won: 0,
          hacks_landed: 0,
          hacks_defended: 0,
          skills: {
            graphs: 1200,
            dp: 1200,
            greedy: 1200,
            two_pointers: 1200,
            data_structures: 1200,
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        setDisplayNameInput('Guest Player');
        setBioInput('Competitive programming contender.');
        setUnivInput('Independent');
        setAuthLoading(false);
        return;
      }

      setUserEmail(user.email || null);

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileData) {
        setProfile(profileData as Profile);
        setDisplayNameInput(profileData.display_name || '');
        setBioInput(profileData.bio || '');
        setUnivInput(profileData.university || 'Independent');
      }

      setAuthLoading(false);
    }

    loadData();
  }, []);

  // Save Profile Handler
  const handleSaveProfile = async () => {
    if (!profile) return;
    if (profile.id === 'guest') {
      router.push('/login?redirect=/settings');
      return;
    }
    setSavingProfile(true);
    setProfileSuccess(false);

    const supabase = createClient();
    const finalDisplayName = displayNameInput.trim() || profile.username;
    const updated = {
      ...profile,
      display_name: finalDisplayName,
      bio: bioInput,
      university: univInput,
    };

    const { error } = await supabase
      .from('profiles')
      .update({
        display_name: finalDisplayName,
        bio: bioInput,
        university: univInput,
      })
      .eq('id', profile.id);

    setSavingProfile(false);

    if (!error) {
      setProfile(updated);
      setProfileSuccess(true);
      window.dispatchEvent(new CustomEvent('algoarena:profile_updated'));
      setTimeout(() => setProfileSuccess(false), 3000);
    }
  };

  // Avatar Upload Handler
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    if (profile.id === 'guest') {
      router.push('/login?redirect=/settings');
      return;
    }

    setUploadingAvatar(true);
    const supabase = createClient();
    const fileExt = file.name.split('.').pop();
    const filePath = `${profile.id}/avatar.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true });

    if (!uploadError) {
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const newAvatarUrl = `${publicUrl}?t=${Date.now()}`;
      setProfile((prev) => prev ? { ...prev, avatar_url: newAvatarUrl } : null);

      await supabase
        .from('profiles')
        .update({ avatar_url: newAvatarUrl })
        .eq('id', profile.id);
      window.dispatchEvent(new CustomEvent('algoarena:profile_updated'));
    }

    setUploadingAvatar(false);
  };

  // Editor Settings Handler
  const updateEditorSetting = <K extends keyof EditorSettings>(key: K, value: EditorSettings[K]) => {
    const updated = { ...editorSettings, [key]: value };
    saveEditorSettings(updated);
    setEditorSuccess(true);
    setTimeout(() => setEditorSuccess(false), 2000);
  };

  const resetEditorSettings = () => {
    saveEditorSettings(DEFAULT_EDITOR_SETTINGS);
    setEditorSuccess(true);
    setTimeout(() => setEditorSuccess(false), 2000);
  };

  // Audio Settings Handlers
  const handleToggleMute = () => {
    toggleMute();
  };

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
  };

  const handleToggleTicks = () => {
    setTimerTicksEnabled(!timerTicks);
  };

  const auditionSound = (type: string, fn: () => void) => {
    setPlayingSound(type);
    fn();
    setTimeout(() => setPlayingSound(null), 300);
  };

  // Password Update Handler
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }

    setUpdatingPassword(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setUpdatingPassword(false);

    if (error) {
      setPasswordError(error.message);
    } else {
      setPasswordSuccess(true);
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(false), 4000);
    }
  };

  // Campus Options for CustomSelect
  const campusOptions = [
    { value: 'Independent', label: 'Independent', description: 'School / College / Graduate' },
    ...BANGLADESH_UNIVERSITIES.map((u) => ({
      value: u,
      label: u,
    })),
  ];

  if (authLoading) {
    return (
      <Container className="flex-1 flex flex-col py-8">
        <div className="h-8 w-44 bg-white/[0.05] rounded-lg animate-pulse mb-2" />
        <div className="h-4 w-72 bg-white/[0.03] rounded animate-pulse mb-8" />
        <div className="flex flex-col md:flex-row gap-6">
          <div className="w-full md:w-60 h-48 bg-white/[0.04] rounded-2xl animate-pulse" />
          <div className="flex-1 h-96 bg-white/[0.04] rounded-2xl animate-pulse" />
        </div>
      </Container>
    );
  }

  return (
    <Container className="flex-1 flex flex-col py-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-[-0.025em] text-[#F3F4F6]">
          Settings
        </h1>
        <p className="text-xs sm:text-sm text-[#9CA3AF] mt-1">
          Configure your player identity, Monaco editor workbench, synthesized audio, and account security.
        </p>
      </div>

        {/* 2-Column Responsive Layout */}
        <div className="flex flex-col md:flex-row gap-6 items-start">
          {/* Left Navigation Sidebar */}
          <nav
            aria-label="Settings navigation"
            className="w-full md:w-60 shrink-0 bg-[#11141C] border border-white/[0.08] rounded-2xl p-2 flex flex-row md:flex-col gap-1 shadow-lg overflow-x-auto"
          >
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium transition cursor-pointer text-left whitespace-nowrap ${
                activeTab === 'profile'
                  ? 'bg-white/[0.08] text-white shadow-sm border border-white/[0.08]'
                  : 'text-[#9CA3AF] hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <User className={`w-4 h-4 shrink-0 ${activeTab === 'profile' ? 'text-sky-400' : 'text-[#9CA3AF]'}`} />
              <span>Profile & Identity</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('editor')}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium transition cursor-pointer text-left whitespace-nowrap ${
                activeTab === 'editor'
                  ? 'bg-white/[0.08] text-white shadow-sm border border-white/[0.08]'
                  : 'text-[#9CA3AF] hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <Code2 className={`w-4 h-4 shrink-0 ${activeTab === 'editor' ? 'text-sky-400' : 'text-[#9CA3AF]'}`} />
              <span>Editor & Workbench</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('audio')}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium transition cursor-pointer text-left whitespace-nowrap ${
                activeTab === 'audio'
                  ? 'bg-white/[0.08] text-white shadow-sm border border-white/[0.08]'
                  : 'text-[#9CA3AF] hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <Volume2 className={`w-4 h-4 shrink-0 ${activeTab === 'audio' ? 'text-sky-400' : 'text-[#9CA3AF]'}`} />
              <span>Audio & Sound Effects</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('security')}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium transition cursor-pointer text-left whitespace-nowrap ${
                activeTab === 'security'
                  ? 'bg-white/[0.08] text-white shadow-sm border border-white/[0.08]'
                  : 'text-[#9CA3AF] hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <Lock className={`w-4 h-4 shrink-0 ${activeTab === 'security' ? 'text-sky-400' : 'text-[#9CA3AF]'}`} />
              <span>Account & Security</span>
            </button>
          </nav>

          {/* Right Content Panel */}
          <main className="flex-1 w-full bg-[#11141C] border border-white/[0.08] rounded-2xl p-6 sm:p-7 shadow-xl">
            {/* TAB 1: PROFILE & IDENTITY */}
            {activeTab === 'profile' && profile && (
              <div className="flex flex-col gap-6">
                <div>
                  <h2 className="font-display text-lg font-semibold text-[#F3F4F6]">
                    Profile & Identity
                  </h2>
                  <p className="text-xs text-[#9CA3AF] mt-0.5">
                    Customize your public competitive persona, campus affiliation, and bio.
                  </p>
                </div>

                {profile.id === 'guest' && (
                  <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/20 text-xs text-sky-300 flex items-center justify-between">
                    <span>You are viewing settings as a guest. Sign in to persist changes to the global leaderboard.</span>
                    <Link
                      href="/login?redirect=/settings"
                      className="px-2.5 py-1 bg-[#F3F4F6] text-[#0B0D12] font-medium rounded-lg text-xs hover:bg-white transition shrink-0 ml-3"
                    >
                      Sign In
                    </Link>
                  </div>
                )}

                <div className="h-px bg-white/[0.07]" />

                {/* Avatar Section */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="relative group/avatar shrink-0">
                    <div className="w-20 h-20 rounded-2xl bg-[#0B0D12] border border-white/[0.1] flex items-center justify-center text-3xl font-mono font-semibold text-white overflow-hidden shadow-inner">
                      {profile.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={profile.avatar_url}
                          alt={profile.username}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        profile.username[0]?.toUpperCase()
                      )}
                    </div>
                    <label className="absolute inset-0 bg-[#0B0D12]/80 rounded-2xl opacity-0 group-hover/avatar:opacity-100 flex flex-col items-center justify-center cursor-pointer transition text-xs font-medium text-white">
                      {uploadingAvatar ? (
                        <Loader2 className="w-5 h-5 animate-spin text-sky-400" />
                      ) : (
                        <>
                          <Camera className="w-5 h-5 mb-1 text-sky-400" />
                          <span className="text-xs">Upload</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        disabled={uploadingAvatar}
                        className="hidden"
                      />
                    </label>
                  </div>

                  <div className="flex flex-col gap-1">
                    <div className="text-xs font-medium text-[#E5E7EB]">Player Avatar</div>
                    <div className="text-xs text-[#9CA3AF]">
                      JPG, PNG, or WebP. Optimal resolution is 256x256 pixels.
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <label className="px-3 py-1.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-medium text-[#D1D5DB] hover:text-white rounded-lg transition cursor-pointer">
                        {uploadingAvatar ? 'Uploading...' : 'Choose Photo'}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarUpload}
                          disabled={uploadingAvatar}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                </div>

                <div className="h-px bg-white/[0.07]" />

                {/* Full Name / Display Name Input */}
                <div className="flex flex-col gap-1.5 max-w-md">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-[#E5E7EB]">
                      Full Name
                    </label>
                    <span className="text-xs font-mono tabular-nums text-[#9CA3AF]">
                      {displayNameInput.length} / 60
                    </span>
                  </div>
                  <input
                    type="text"
                    maxLength={60}
                    value={displayNameInput}
                    onChange={(e) => setDisplayNameInput(e.target.value)}
                    placeholder="e.g. Mostafizur Rahman"
                    className="px-3.5 py-2 text-xs bg-[#0B0D12] border border-white/[0.1] rounded-xl text-white placeholder:text-slate-600 focus:outline-none focus:border-sky-400/60 transition"
                  />
                  <p className="text-xs text-[#9CA3AF]">
                    Displayed prominently as your identity title across your profile dossier.
                  </p>
                </div>

                {/* Username Display */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-[#E5E7EB]">
                    Username
                  </label>
                  <div className="flex items-center gap-2 max-w-md">
                    <div className="px-3 py-2 bg-[#0B0D12] border border-white/[0.08] rounded-xl text-xs text-[#9CA3AF] font-mono flex items-center justify-between w-full">
                      <span>@{profile.username}</span>
                      <span className="text-[12px] text-slate-500">Read-only handle</span>
                    </div>
                  </div>
                  <p className="text-xs text-[#9CA3AF]">
                    Usernames are permanently linked to your Elo rating and match trajectory.
                  </p>
                </div>

                {/* Campus Affiliation */}
                <div className="flex flex-col gap-1.5 max-w-md">
                  <label className="text-xs font-medium text-[#E5E7EB]">
                    Campus / University
                  </label>
                  <CustomSelect
                    value={univInput}
                    onChange={(val) => setUnivInput(val)}
                    options={campusOptions}
                    searchable
                    searchPlaceholder="Filter universities..."
                  />
                  <p className="text-xs text-[#9CA3AF]">
                    Determines which university division leaderboard your Elo points contribute to.
                  </p>
                </div>

                {/* Bio Tagline */}
                <div className="flex flex-col gap-1.5 max-w-md">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-[#E5E7EB]">
                      Bio Tagline
                    </label>
                    <span className="text-xs font-mono tabular-nums text-[#9CA3AF]">
                      {bioInput.length} / 120
                    </span>
                  </div>
                  <input
                    type="text"
                    maxLength={120}
                    value={bioInput}
                    onChange={(e) => setBioInput(e.target.value)}
                    placeholder="Competitive programming contender..."
                    className="px-3.5 py-2 text-xs bg-[#0B0D12] border border-white/[0.1] rounded-xl text-white placeholder:text-slate-600 focus:outline-none focus:border-sky-400/60 transition"
                  />
                  <p className="text-xs text-[#9CA3AF]">
                    Displayed on your public profile dossier and duel summary screens.
                  </p>
                </div>

                {/* Profile Actions */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleSaveProfile}
                    disabled={savingProfile}
                    className="px-4 py-2 bg-[#F3F4F6] text-[#0B0D12] hover:bg-white font-medium text-xs rounded-xl flex items-center gap-2 transition cursor-pointer shadow-sm disabled:opacity-50"
                  >
                    {savingProfile ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    )}
                    <span>{savingProfile ? 'Saving...' : 'Save Profile Changes'}</span>
                  </button>

                  {profileSuccess && (
                    <span className="text-xs text-[#34D399] flex items-center gap-1 font-medium animate-in fade-in">
                      <Check className="w-3.5 h-3.5" />
                      Changes saved successfully.
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: EDITOR & WORKBENCH */}
            {activeTab === 'editor' && (
              <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-display text-lg font-semibold text-[#F3F4F6]">
                      Editor & Workbench
                    </h2>
                    <p className="text-xs text-[#9CA3AF] mt-0.5">
                      Configure font sizing, spacing, and layout in the Monaco coding arena.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={resetEditorSettings}
                    className="px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-medium text-[#9CA3AF] hover:text-white transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset Defaults</span>
                  </button>
                </div>

                <div className="h-px bg-white/[0.07]" />

                {/* Configuration Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Font Size */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-[#E5E7EB]">
                      Font Size
                    </label>
                    <div className="flex items-center gap-1 bg-[#0B0D12] p-1 rounded-xl border border-white/[0.08]">
                      {[12, 13, 14, 15, 16].map((size) => (
                        <button
                          key={size}
                          type="button"
                          onClick={() => updateEditorSetting('fontSize', size)}
                          className={`flex-1 py-1 text-xs font-mono rounded-lg transition cursor-pointer ${
                            editorSettings.fontSize === size
                              ? 'bg-white/[0.12] text-white font-medium border border-white/[0.1]'
                              : 'text-[#9CA3AF] hover:text-white'
                          }`}
                        >
                          {size}px
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Tab Size */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-[#E5E7EB]">
                      Tab Spacing
                    </label>
                    <div className="flex items-center gap-1 bg-[#0B0D12] p-1 rounded-xl border border-white/[0.08]">
                      {[2, 4].map((tab) => (
                        <button
                          key={tab}
                          type="button"
                          onClick={() => updateEditorSetting('tabSize', tab)}
                          className={`flex-1 py-1 text-xs font-medium rounded-lg transition cursor-pointer ${
                            editorSettings.tabSize === tab
                              ? 'bg-white/[0.12] text-white border border-white/[0.1]'
                              : 'text-[#9CA3AF] hover:text-white'
                          }`}
                        >
                          {tab} Spaces
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Minimap */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-[#E5E7EB]">
                      Minimap Overview
                    </label>
                    <div className="flex items-center gap-1 bg-[#0B0D12] p-1 rounded-xl border border-white/[0.08]">
                      <button
                        type="button"
                        onClick={() => updateEditorSetting('minimap', false)}
                        className={`flex-1 py-1 text-xs font-medium rounded-lg transition cursor-pointer ${
                          !editorSettings.minimap
                            ? 'bg-white/[0.12] text-white border border-white/[0.1]'
                            : 'text-[#9CA3AF] hover:text-white'
                        }`}
                      >
                        Off (Compact)
                      </button>
                      <button
                        type="button"
                        onClick={() => updateEditorSetting('minimap', true)}
                        className={`flex-1 py-1 text-xs font-medium rounded-lg transition cursor-pointer ${
                          editorSettings.minimap
                            ? 'bg-white/[0.12] text-white border border-white/[0.1]'
                            : 'text-[#9CA3AF] hover:text-white'
                        }`}
                      >
                        On
                      </button>
                    </div>
                  </div>

                  {/* Word Wrap */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-[#E5E7EB]">
                      Word Wrap
                    </label>
                    <div className="flex items-center gap-1 bg-[#0B0D12] p-1 rounded-xl border border-white/[0.08]">
                      {(['off', 'on'] as const).map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => updateEditorSetting('wordWrap', mode)}
                          className={`flex-1 py-1 text-xs font-medium rounded-lg capitalize transition cursor-pointer ${
                            editorSettings.wordWrap === mode
                              ? 'bg-white/[0.12] text-white border border-white/[0.1]'
                              : 'text-[#9CA3AF] hover:text-white'
                          }`}
                        >
                          {mode}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Line Numbers */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-[#E5E7EB]">
                      Line Numbers
                    </label>
                    <div className="flex items-center gap-1 bg-[#0B0D12] p-1 rounded-xl border border-white/[0.08]">
                      {(['on', 'relative', 'off'] as const).map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => updateEditorSetting('lineNumbers', mode)}
                          className={`flex-1 py-1 text-xs font-medium rounded-lg capitalize transition cursor-pointer ${
                            editorSettings.lineNumbers === mode
                              ? 'bg-white/[0.12] text-white border border-white/[0.1]'
                              : 'text-[#9CA3AF] hover:text-white'
                          }`}
                        >
                          {mode}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="h-px bg-white/[0.07]" />

                {/* Live Interactive Code Preview */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-[#E5E7EB] flex items-center gap-1.5">
                      <span>Live Editor Preview</span>
                      <span className="px-1.5 py-0.5 rounded text-xs bg-sky-500/10 text-sky-400 font-mono">
                        {editorSettings.fontSize}px • {editorSettings.tabSize} spaces
                      </span>
                    </label>
                    {editorSuccess && (
                      <span className="text-xs text-[#34D399] flex items-center gap-1 font-medium animate-in fade-in">
                        <Check className="w-3.5 h-3.5" />
                        Settings synchronized to Duel Workbench.
                      </span>
                    )}
                  </div>

                  {/* Interactive Code Mockup reflecting font size and tab size */}
                  <div
                    className="rounded-xl bg-[#0B0D12] border border-white/[0.1] p-4 font-mono text-slate-300 overflow-x-auto shadow-inner select-none transition-all duration-150"
                    style={{
                      fontSize: `${editorSettings.fontSize}px`,
                      lineHeight: '1.6',
                      tabSize: editorSettings.tabSize,
                    }}
                  >
                    <div className="flex items-start">
                      {editorSettings.lineNumbers !== 'off' && (
                        <div className="select-none text-slate-600 pr-4 text-right shrink-0 border-r border-white/[0.06] mr-4 flex flex-col">
                          <span>1</span>
                          <span>2</span>
                          <span>3</span>
                          <span>4</span>
                          <span>5</span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div>
                          <span className="text-rose-400">export function</span>{' '}
                          <span className="text-sky-400">dijkstra</span>
                          (graph: <span className="text-amber-300">number[][]</span>, start: <span className="text-amber-300">number</span>) &#123;
                        </div>
                        <div style={{ paddingLeft: `${editorSettings.tabSize * 8}px` }}>
                          <span className="text-rose-400">const</span> dist = <span className="text-rose-400">new</span>{' '}
                          <span className="text-emerald-400">Array</span>(graph.length).fill(<span className="text-amber-300">Infinity</span>);
                        </div>
                        <div style={{ paddingLeft: `${editorSettings.tabSize * 8}px` }}>
                          dist[start] = <span className="text-amber-300">0</span>;
                        </div>
                        <div style={{ paddingLeft: `${editorSettings.tabSize * 8}px` }}>
                          <span className="text-rose-400">return</span> dist;
                        </div>
                        <div>&#125;</div>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-[#9CA3AF]">
                    All workbench settings persist to local browser storage and apply immediately upon entering matches.
                  </p>
                </div>
              </div>
            )}

            {/* TAB 3: AUDIO & SOUND EFFECTS */}
            {activeTab === 'audio' && (
              <div className="flex flex-col gap-6">
                <div>
                  <h2 className="font-display text-lg font-semibold text-[#F3F4F6]">
                    Audio & Sound Effects
                  </h2>
                  <p className="text-xs text-[#9CA3AF] mt-0.5">
                    Configure Web Audio API synthesized sound effects and tactical telemetry alerts.
                  </p>
                </div>

                <div className="h-px bg-white/[0.07]" />

                {/* Master Mute Toggle */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-[#0B0D12] border border-white/[0.08]">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
                      {sfxMuted ? (
                        <VolumeX className="w-4 h-4 text-rose-400" />
                      ) : (
                        <Volume2 className="w-4 h-4 text-emerald-400" />
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-medium text-[#F3F4F6]">Master Sound Effects</div>
                      <div className="text-xs text-[#9CA3AF]">
                        {sfxMuted ? 'All tactical audio synthesizers muted' : 'Tactical sound effects active'}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleMute}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                      sfxMuted
                        ? 'bg-rose-500/10 text-rose-300 border border-rose-500/20 hover:bg-rose-500/20'
                        : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 hover:bg-emerald-500/20'
                    }`}
                  >
                    {sfxMuted ? 'Unmute' : 'Mute'}
                  </button>
                </div>

                {/* SFX Volume Slider */}
                <div className="flex flex-col gap-2 p-4 rounded-xl bg-[#0B0D12] border border-white/[0.08]">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-[#E5E7EB]">
                      Master Volume Level
                    </label>
                    <span className="text-xs font-mono tabular-nums text-sky-400">
                      {Math.round(sfxVolume * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={sfxVolume}
                    disabled={sfxMuted}
                    onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-white/[0.1] rounded-lg appearance-none cursor-pointer accent-sky-400 disabled:opacity-40"
                  />
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Silent (0%)</span>
                    <span>Full (100%)</span>
                  </div>
                </div>

                {/* Countdown Telemetry Ticks */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-[#0B0D12] border border-white/[0.08]">
                  <div>
                    <div className="text-xs font-medium text-[#F3F4F6]">Countdown Urgency Ticks</div>
                    <div className="text-xs text-[#9CA3AF]">
                      Synthesize audible radar blips during the final 30 seconds of match timer.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleTicks}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                      timerTicks
                        ? 'bg-white/[0.1] text-white border border-white/[0.12]'
                        : 'bg-white/[0.03] text-slate-500 border border-white/[0.06]'
                    }`}
                  >
                    {timerTicks ? 'Enabled' : 'Disabled'}
                  </button>
                </div>

                <div className="h-px bg-white/[0.07]" />

                {/* Tactical Audition Soundboard */}
                <div className="flex flex-col gap-2.5">
                  <div className="text-xs font-medium text-[#E5E7EB]">
                    Tactical Soundboard (Test Sound Effects)
                  </div>
                  <p className="text-xs text-[#9CA3AF]">
                    Click any sound cue below to audition the Web Audio synthesizer output at your current volume.
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={() => auditionSound('tick', playTick)}
                      disabled={sfxMuted}
                      className="p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.08] text-xs font-medium text-[#D1D5DB] hover:text-white transition flex items-center justify-between cursor-pointer disabled:opacity-40"
                    >
                      <span>Radar Tick</span>
                      <Play className={`w-3.5 h-3.5 text-sky-400 ${playingSound === 'tick' ? 'scale-125' : ''}`} />
                    </button>

                    <button
                      type="button"
                      onClick={() => auditionSound('pass', playPass)}
                      disabled={sfxMuted}
                      className="p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.08] text-xs font-medium text-[#D1D5DB] hover:text-white transition flex items-center justify-between cursor-pointer disabled:opacity-40"
                    >
                      <span>Solution Pass</span>
                      <Play className={`w-3.5 h-3.5 text-[#34D399] ${playingSound === 'pass' ? 'scale-125' : ''}`} />
                    </button>

                    <button
                      type="button"
                      onClick={() => auditionSound('fail', playFail)}
                      disabled={sfxMuted}
                      className="p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.08] text-xs font-medium text-[#D1D5DB] hover:text-white transition flex items-center justify-between cursor-pointer disabled:opacity-40"
                    >
                      <span>Counterexample Fail</span>
                      <Play className={`w-3.5 h-3.5 text-[#FB7185] ${playingSound === 'fail' ? 'scale-125' : ''}`} />
                    </button>

                    <button
                      type="button"
                      onClick={() => auditionSound('hack', playHack)}
                      disabled={sfxMuted}
                      className="p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.08] text-xs font-medium text-[#D1D5DB] hover:text-white transition flex items-center justify-between cursor-pointer disabled:opacity-40"
                    >
                      <span>Sabotage Strike</span>
                      <Play className={`w-3.5 h-3.5 text-amber-400 ${playingSound === 'hack' ? 'scale-125' : ''}`} />
                    </button>

                    <button
                      type="button"
                      onClick={() => auditionSound('victory', playVictory)}
                      disabled={sfxMuted}
                      className="p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.08] text-xs font-medium text-[#D1D5DB] hover:text-white transition flex items-center justify-between cursor-pointer disabled:opacity-40"
                    >
                      <span>Victory Fanfare</span>
                      <Play className={`w-3.5 h-3.5 text-emerald-400 ${playingSound === 'victory' ? 'scale-125' : ''}`} />
                    </button>

                    <button
                      type="button"
                      onClick={() => auditionSound('defeat', playDefeat)}
                      disabled={sfxMuted}
                      className="p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.08] text-xs font-medium text-[#D1D5DB] hover:text-white transition flex items-center justify-between cursor-pointer disabled:opacity-40"
                    >
                      <span>Defeat Resonance</span>
                      <Play className={`w-3.5 h-3.5 text-rose-400 ${playingSound === 'defeat' ? 'scale-125' : ''}`} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: ACCOUNT & SECURITY */}
            {activeTab === 'security' && (
              <div className="flex flex-col gap-6">
                <div>
                  <h2 className="font-display text-lg font-semibold text-[#F3F4F6]">
                    Account & Security
                  </h2>
                  <p className="text-xs text-[#9CA3AF] mt-0.5">
                    Manage your credentials, authenticated email address, and account password.
                  </p>
                </div>

                {!userEmail && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-center justify-between">
                    <span>You are not signed in. Sign in to update credentials and passwords.</span>
                    <Link
                      href="/login?redirect=/settings"
                      className="px-2.5 py-1 bg-[#F3F4F6] text-[#0B0D12] font-medium rounded-lg text-xs hover:bg-white transition shrink-0 ml-3"
                    >
                      Sign In
                    </Link>
                  </div>
                )}

                <div className="h-px bg-white/[0.07]" />

                {/* Email Address */}
                <div className="flex flex-col gap-1.5 max-w-md">
                  <label className="text-xs font-medium text-[#E5E7EB]">
                    Registered Email Address
                  </label>
                  <div className="px-3.5 py-2 bg-[#0B0D12] border border-white/[0.08] rounded-xl text-xs text-[#9CA3AF] font-mono flex items-center justify-between">
                    <span>{userEmail || 'Anonymous Session'}</span>
                    <span className="text-[12px] text-slate-500">Verified</span>
                  </div>
                  <p className="text-xs text-[#9CA3AF]">
                    Email used for match notifications and password recovery.
                  </p>
                </div>

                <div className="h-px bg-white/[0.07]" />

                {/* Password Update Form */}
                <form onSubmit={handleUpdatePassword} className="flex flex-col gap-4 max-w-md">
                  <div>
                    <h3 className="text-xs font-medium text-[#E5E7EB]">Change Password</h3>
                    <p className="text-xs text-[#9CA3AF] mt-0.5">
                      Enter a new secure password with at least 6 characters.
                    </p>
                  </div>

                  {passwordError && (
                    <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                      <span>{passwordError}</span>
                    </div>
                  )}

                  {passwordSuccess && (
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-[#34D399] rounded-xl text-xs flex items-center gap-2">
                      <Check className="w-4 h-4 shrink-0 text-[#34D399]" />
                      <span>Password updated successfully.</span>
                    </div>
                  )}

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-[#E5E7EB]">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-3.5 py-2 pr-10 text-xs bg-[#0B0D12] border border-white/[0.1] rounded-xl text-white placeholder:text-slate-600 focus:outline-none focus:border-sky-400/60 transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-[#D1D5DB] transition cursor-pointer"
                        tabIndex={-1}
                      >
                        {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-[#E5E7EB]">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-3.5 py-2 pr-10 text-xs bg-[#0B0D12] border border-white/[0.1] rounded-xl text-white placeholder:text-slate-600 focus:outline-none focus:border-sky-400/60 transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-[#D1D5DB] transition cursor-pointer"
                        tabIndex={-1}
                      >
                        {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="pt-1">
                    <button
                      type="submit"
                      disabled={updatingPassword || !newPassword}
                      className="px-4 py-2 bg-[#F3F4F6] text-[#0B0D12] hover:bg-white font-medium text-xs rounded-xl flex items-center gap-2 transition cursor-pointer shadow-sm disabled:opacity-50"
                    >
                      {updatingPassword ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      )}
                      <span>{updatingPassword ? 'Updating Password...' : 'Update Password'}</span>
                    </button>
                  </div>
                </form>
              </div>
            )}
          </main>
        </div>
      </Container>
    );
  }
