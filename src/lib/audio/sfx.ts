// src/lib/audio/sfx.ts
// 100% deterministic, zero-asset Web Audio API tactical esports sound synthesizer

import { useSyncExternalStore } from 'react';

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function isMuted(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('algoarena_sfx_muted') === 'true';
}

export function toggleMute(): boolean {
  if (typeof window === 'undefined') return false;
  const current = isMuted();
  const next = !current;
  localStorage.setItem('algoarena_sfx_muted', String(next));
  window.dispatchEvent(new CustomEvent('algoarena:sfx_mute_changed', { detail: next }));
  return next;
}

export function setMuted(muted: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('algoarena_sfx_muted', String(muted));
  window.dispatchEvent(new CustomEvent('algoarena:sfx_mute_changed', { detail: muted }));
}

export function subscribeMute(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handleCustom = () => callback();
  const handleStorage = (e: StorageEvent) => {
    if (e.key === 'algoarena_sfx_muted') callback();
  };
  window.addEventListener('algoarena:sfx_mute_changed', handleCustom);
  window.addEventListener('storage', handleStorage);
  return () => {
    window.removeEventListener('algoarena:sfx_mute_changed', handleCustom);
    window.removeEventListener('storage', handleStorage);
  };
}

const getServerSnapshotMute = () => false;

export function useIsMuted(): boolean {
  return useSyncExternalStore(
    subscribeMute,
    isMuted,
    getServerSnapshotMute
  );
}

// Volume Controls (0.0 to 1.0)
const DEFAULT_VOLUME = 0.75;

export function getVolume(): number {
  if (typeof window === 'undefined') return DEFAULT_VOLUME;
  const raw = localStorage.getItem('algoarena_sfx_volume');
  if (raw === null) return DEFAULT_VOLUME;
  const parsed = parseFloat(raw);
  return isNaN(parsed) ? DEFAULT_VOLUME : Math.max(0, Math.min(1, parsed));
}

export function setVolume(volume: number): void {
  if (typeof window === 'undefined') return;
  const clamped = Math.max(0, Math.min(1, volume));
  localStorage.setItem('algoarena_sfx_volume', String(clamped));
  window.dispatchEvent(new CustomEvent('algoarena:sfx_volume_changed', { detail: clamped }));
}

export function subscribeVolume(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handleCustom = () => callback();
  const handleStorage = (e: StorageEvent) => {
    if (e.key === 'algoarena_sfx_volume') callback();
  };
  window.addEventListener('algoarena:sfx_volume_changed', handleCustom);
  window.addEventListener('storage', handleStorage);
  return () => {
    window.removeEventListener('algoarena:sfx_volume_changed', handleCustom);
    window.removeEventListener('storage', handleStorage);
  };
}

const getServerSnapshotVolume = () => DEFAULT_VOLUME;

export function useVolume(): number {
  return useSyncExternalStore(
    subscribeVolume,
    getVolume,
    getServerSnapshotVolume
  );
}

// Telemetry Countdown Ticks Toggle
export function getTimerTicksEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem('algoarena_sfx_ticks') !== 'false';
}

export function setTimerTicksEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('algoarena_sfx_ticks', String(enabled));
  window.dispatchEvent(new CustomEvent('algoarena:sfx_ticks_changed', { detail: enabled }));
}

export function subscribeTimerTicks(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handleCustom = () => callback();
  const handleStorage = (e: StorageEvent) => {
    if (e.key === 'algoarena_sfx_ticks') callback();
  };
  window.addEventListener('algoarena:sfx_ticks_changed', handleCustom);
  window.addEventListener('storage', handleStorage);
  return () => {
    window.removeEventListener('algoarena:sfx_ticks_changed', handleCustom);
    window.removeEventListener('storage', handleStorage);
  };
}

const getServerSnapshotTicks = () => true;

export function useTimerTicksEnabled(): boolean {
  return useSyncExternalStore(
    subscribeTimerTicks,
    getTimerTicksEnabled,
    getServerSnapshotTicks
  );
}

// 1. Tick: High-pitch radar/countdown blip
export function playTick() {
  if (isMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  const vol = getVolume();
  if (vol <= 0) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(880, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.05);

  gain.gain.setValueAtTime(0.08 * vol, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start();
  osc.stop(ctx.currentTime + 0.05);
}

// 2. Pass: Emerald rising melodic chime
export function playPass() {
  if (isMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  const vol = getVolume();
  if (vol <= 0) return;

  const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
  notes.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.06);

    gain.gain.setValueAtTime(0.12 * vol, ctx.currentTime + idx * 0.06);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.06 + 0.2);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime + idx * 0.06);
    osc.stop(ctx.currentTime + idx * 0.06 + 0.2);
  });
}

// 3. Fail: Crimson low-pitch resonant thud
export function playFail() {
  if (isMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  const vol = getVolume();
  if (vol <= 0) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(140, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(45, ctx.currentTime + 0.25);

  gain.gain.setValueAtTime(0.2 * vol, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start();
  osc.stop(ctx.currentTime + 0.25);
}

// 4. Hack: Cybernetic glitch attack strike
export function playHack() {
  if (isMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  const vol = getVolume();
  if (vol <= 0) return;

  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();

  osc1.type = 'square';
  osc1.frequency.setValueAtTime(1200, ctx.currentTime);
  osc1.frequency.linearRampToValueAtTime(300, ctx.currentTime + 0.15);

  osc2.type = 'sawtooth';
  osc2.frequency.setValueAtTime(240, ctx.currentTime);
  osc2.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.2);

  gain.gain.setValueAtTime(0.18 * vol, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(ctx.destination);

  osc1.start();
  osc2.start();
  osc1.stop(ctx.currentTime + 0.25);
  osc2.stop(ctx.currentTime + 0.25);
}

// 5. Victory: Esports brass triumphant fanfare
export function playVictory() {
  if (isMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  const vol = getVolume();
  if (vol <= 0) return;

  const chord = [440, 554.37, 659.25, 880]; // A major
  chord.forEach((freq) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);

    gain.gain.setValueAtTime(0.08 * vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.6);
  });
}

// 6. Defeat: Descending minor resonance
export function playDefeat() {
  if (isMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  const vol = getVolume();
  if (vol <= 0) return;

  const notes = [329.63, 293.66, 261.63, 220.0];
  notes.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.1);

    gain.gain.setValueAtTime(0.12 * vol, ctx.currentTime + idx * 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.1 + 0.3);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime + idx * 0.1);
    osc.stop(ctx.currentTime + idx * 0.1 + 0.3);
  });
}
