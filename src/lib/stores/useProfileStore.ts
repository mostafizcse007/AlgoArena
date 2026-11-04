'use client';

import { useSyncExternalStore } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Profile } from '@/lib/types/arena';
import { getTier } from '@/lib/tier';

type Listener = () => void;

interface ProfileStoreState {
  profile: Profile | null;
  isLoading: boolean;
  isHydrated: boolean;
}

let state: ProfileStoreState = {
  profile: null,
  isLoading: true,
  isHydrated: false,
};

const listeners = new Set<Listener>();

function notify() {
  for (const listener of listeners) {
    listener();
  }
}

export const profileStore = {
  getState(): ProfileStoreState {
    return state;
  },

  getProfile(): Profile | null {
    return state.profile;
  },

  setProfile(profile: Profile | null) {
    state = {
      ...state,
      profile,
      isLoading: false,
      isHydrated: true,
    };
    notify();
  },

  updateElo(newElo: number, newPeakElo?: number) {
    if (!state.profile) return;
    const peak = newPeakElo !== undefined ? Math.max(state.profile.peak_elo, newPeakElo) : Math.max(state.profile.peak_elo, newElo);
    const tier = getTier(newElo);
    state = {
      ...state,
      profile: {
        ...state.profile,
        elo: newElo,
        peak_elo: peak,
        tier,
      },
    };
    notify();
  },

  async refreshProfile(): Promise<Profile | null> {
    if (typeof window === 'undefined') return null;
    const supabase = createClient();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        state = { profile: null, isLoading: false, isHydrated: true };
        notify();
        return null;
      }

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (data) {
        const profileData = { ...(data as Profile) };
        if (!profileData.avatar_url) {
          const metaAvatar =
            (user.user_metadata?.avatar_url as string | undefined) ||
            (user.user_metadata?.picture as string | undefined) ||
            null;
          if (metaAvatar) {
            profileData.avatar_url = metaAvatar;
          }
        }
        state = { profile: profileData, isLoading: false, isHydrated: true };
        notify();
        return profileData;
      }
    } catch (err) {
      console.error('[ProfileStore] Error refreshing profile:', err);
    }
    state = { ...state, isLoading: false, isHydrated: true };
    notify();
    return null;
  },

  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

// Global singleton listener setup on client
if (typeof window !== 'undefined') {
  profileStore.refreshProfile();

  window.addEventListener('algoarena:profile_updated', (e: Event) => {
    const custom = e as CustomEvent<{ profile?: Profile; elo?: number; peakElo?: number }>;
    if (custom.detail?.profile) {
      profileStore.setProfile(custom.detail.profile);
    } else if (typeof custom.detail?.elo === 'number') {
      profileStore.updateElo(custom.detail.elo, custom.detail.peakElo);
    } else {
      profileStore.refreshProfile();
    }
  });

  const supabase = createClient();
  supabase.auth.onAuthStateChange(() => {
    profileStore.refreshProfile();
  });
}

const emptyServerState: ProfileStoreState = {
  profile: null,
  isLoading: true,
  isHydrated: false,
};

export function useProfile(): {
  profile: Profile | null;
  isLoading: boolean;
  isHydrated: boolean;
  refreshProfile: () => Promise<Profile | null>;
  setProfile: (p: Profile | null) => void;
  updateElo: (elo: number, peak?: number) => void;
} {
  const currentState = useSyncExternalStore(
    profileStore.subscribe,
    profileStore.getState,
    () => emptyServerState
  );

  return {
    profile: currentState.profile,
    isLoading: currentState.isLoading,
    isHydrated: currentState.isHydrated,
    refreshProfile: profileStore.refreshProfile,
    setProfile: profileStore.setProfile,
    updateElo: profileStore.updateElo,
  };
}
