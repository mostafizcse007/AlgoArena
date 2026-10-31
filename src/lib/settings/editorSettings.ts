// src/lib/settings/editorSettings.ts
// Deterministic client-side Monaco editor preferences with reactive synchronization

import { useSyncExternalStore } from 'react';

export interface EditorSettings {
  fontSize: number; // 12, 13, 14, 15, 16
  tabSize: number; // 2, 4
  minimap: boolean;
  wordWrap: 'on' | 'off';
  lineNumbers: 'on' | 'relative' | 'off';
}

export const DEFAULT_EDITOR_SETTINGS: EditorSettings = {
  fontSize: 13,
  tabSize: 2,
  minimap: false,
  wordWrap: 'off',
  lineNumbers: 'on',
};

const STORAGE_KEY = 'algoarena_editor_settings';

let cachedSettings: EditorSettings | null = null;
let lastRawString: string | null = null;

export function getEditorSettings(): EditorSettings {
  if (typeof window === 'undefined') return DEFAULT_EDITOR_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === lastRawString && cachedSettings !== null) {
      return cachedSettings;
    }
    lastRawString = raw;
    if (!raw) {
      cachedSettings = DEFAULT_EDITOR_SETTINGS;
      return cachedSettings;
    }
    const parsed = JSON.parse(raw);
    cachedSettings = {
      fontSize: typeof parsed.fontSize === 'number' ? parsed.fontSize : DEFAULT_EDITOR_SETTINGS.fontSize,
      tabSize: typeof parsed.tabSize === 'number' ? parsed.tabSize : DEFAULT_EDITOR_SETTINGS.tabSize,
      minimap: typeof parsed.minimap === 'boolean' ? parsed.minimap : DEFAULT_EDITOR_SETTINGS.minimap,
      wordWrap: parsed.wordWrap === 'on' || parsed.wordWrap === 'off' ? parsed.wordWrap : DEFAULT_EDITOR_SETTINGS.wordWrap,
      lineNumbers: parsed.lineNumbers === 'on' || parsed.lineNumbers === 'relative' || parsed.lineNumbers === 'off' ? parsed.lineNumbers : DEFAULT_EDITOR_SETTINGS.lineNumbers,
    };
    return cachedSettings;
  } catch {
    cachedSettings = DEFAULT_EDITOR_SETTINGS;
    return cachedSettings;
  }
}

export function saveEditorSettings(settings: EditorSettings): void {
  if (typeof window === 'undefined') return;
  try {
    const json = JSON.stringify(settings);
    lastRawString = json;
    cachedSettings = { ...settings };
    localStorage.setItem(STORAGE_KEY, json);
    window.dispatchEvent(new CustomEvent('algoarena:editor_settings_changed', { detail: cachedSettings }));
  } catch {
    // localStorage might be unavailable
  }
}

export function subscribeEditorSettings(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handleCustom = () => callback();
  const handleStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      lastRawString = null; // Invalidate cache so getEditorSettings reads fresh value
      callback();
    }
  };
  window.addEventListener('algoarena:editor_settings_changed', handleCustom);
  window.addEventListener('storage', handleStorage);
  return () => {
    window.removeEventListener('algoarena:editor_settings_changed', handleCustom);
    window.removeEventListener('storage', handleStorage);
  };
}

const getServerSnapshot = () => DEFAULT_EDITOR_SETTINGS;

export function useEditorSettings(): EditorSettings {
  return useSyncExternalStore(
    subscribeEditorSettings,
    getEditorSettings,
    getServerSnapshot
  );
}
