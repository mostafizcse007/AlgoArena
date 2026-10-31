'use client';

import React, { useEffect, useState, useCallback, useRef, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import {
  Keyboard,
  X,
  Navigation,
  Terminal,
  PlaySquare,
  Sparkles,
} from 'lucide-react';

const emptySubscribe = () => () => {};

function detectIsMac(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  const uaDataPlatform = (navigator as { userAgentData?: { platform?: string } }).userAgentData?.platform;
  if (typeof uaDataPlatform === 'string' && uaDataPlatform.length > 0) {
    if (/mac/i.test(uaDataPlatform)) return true;
    if (/win|linux|android/i.test(uaDataPlatform)) return false;
  }
  const platform = navigator.platform || '';
  const userAgent = navigator.userAgent || '';
  return /Mac|iPhone|iPod|iPad/i.test(platform) || /Macintosh|Mac OS X|iPhone|iPod|iPad/i.test(userAgent);
}

interface ShortcutItem {
  keys: string[];
  label: string;
  detail?: string;
}

interface ShortcutSection {
  title: string;
  icon: React.ReactNode;
  items: ShortcutItem[];
}

export function KeyboardShortcutsModal() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const pendingGKeyRef = useRef(false);
  const pendingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isMac = useSyncExternalStore(
    emptySubscribe,
    detectIsMac,
    () => false
  );
  const cmdKey = isMac ? '⌘' : 'Ctrl';

  const handleClose = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable ||
          Boolean(target.closest('.monaco-editor')));

      if (isInput) return;

      // Close modal on Escape
      if (e.key === 'Escape') {
        if (isOpen) {
          e.preventDefault();
          setIsOpen(false);
          return;
        }
      }

      // '?' key (Shift + '/') toggles shortcuts modal
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setIsOpen((prev) => !prev);
        return;
      }

      // Cmd/Ctrl + , opens Settings
      if ((e.metaKey || e.ctrlKey) && e.key === ',') {
        e.preventDefault();
        router.push('/settings');
        setIsOpen(false);
        return;
      }

      // 'g then ...' navigation sequence
      if (!e.metaKey && !e.ctrlKey && !e.altKey) {
        const key = e.key.toLowerCase();

        if (pendingGKeyRef.current) {
          pendingGKeyRef.current = false;
          if (pendingTimeoutRef.current) clearTimeout(pendingTimeoutRef.current);

          if (key === 'l') {
            e.preventDefault();
            router.push('/lobby');
            setIsOpen(false);
            return;
          }
          if (key === 'b') {
            e.preventDefault();
            router.push('/leaderboard');
            setIsOpen(false);
            return;
          }
          if (key === 'p') {
            e.preventDefault();
            setIsOpen(false);
            router.push('/profile');
            return;
          }
          if (key === 's') {
            e.preventDefault();
            router.push('/settings');
            setIsOpen(false);
            return;
          }
        } else if (key === 'g') {
          pendingGKeyRef.current = true;
          if (pendingTimeoutRef.current) clearTimeout(pendingTimeoutRef.current);
          pendingTimeoutRef.current = setTimeout(() => {
            pendingGKeyRef.current = false;
          }, 1500);
        }
      }
    };

    const handleCustomOpen = () => setIsOpen(true);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('algoarena:open_shortcuts', handleCustomOpen);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('algoarena:open_shortcuts', handleCustomOpen);
      if (pendingTimeoutRef.current) clearTimeout(pendingTimeoutRef.current);
    };
  }, [isOpen, router]);

  if (!isOpen) return null;

  const sections: ShortcutSection[] = [
    {
      title: 'Navigation',
      icon: <Navigation className="w-3.5 h-3.5 text-[#9CA3AF]" />,
      items: [
        { keys: [cmdKey, 'K'], label: 'Open Command Palette' },
        { keys: ['G', 'then', 'L'], label: 'Go to Play' },
        { keys: ['G', 'then', 'B'], label: 'Go to Leaderboard' },
        { keys: ['G', 'then', 'P'], label: 'Go to Coder Profile' },
        { keys: ['G', 'then', 'S'], label: 'Go to Settings' },
        { keys: ['?'], label: 'Toggle Keyboard Shortcuts' },
      ],
    },
    {
      title: 'In a duel',
      icon: <Terminal className="w-3.5 h-3.5 text-[#9CA3AF]" />,
      items: [
        { keys: [cmdKey, '↵'], label: 'Run Trace on Public Samples' },
        { keys: [cmdKey, '⇧', 'S'], label: 'Submit Solution to Secret Judge' },
        { keys: [cmdKey, '⇧', 'H'], label: 'Toggle Sabotage Drawer' },
        { keys: ['1'], label: 'Switch to Code Focus Layout' },
        { keys: ['2'], label: 'Switch to Balanced Layout' },
        { keys: ['3'], label: 'Switch to Canvas Theater Layout' },
      ],
    },
    {
      title: 'Trace playback',
      icon: <PlaySquare className="w-3.5 h-3.5 text-[#9CA3AF]" />,
      items: [
        { keys: ['Space'], label: 'Play / Pause Trace Playback' },
        { keys: ['←'], label: 'Step Back 1 Frame' },
        { keys: ['→'], label: 'Step Forward 1 Frame' },
        { keys: ['D'], label: 'Jump to Divergence Point' },
        { keys: ['Esc'], label: 'Close Active Overlay / Modal' },
      ],
    },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
      onClick={handleClose}
    >
      <div
        className="relative backdrop-blur-2xl bg-[#1D2333] border border-white/12 rounded-2xl shadow-2xl max-w-2xl w-full p-6 text-left flex flex-col gap-6 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle Specular Rim */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

        {/* Modal Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Keyboard className="w-5 h-5 text-[#9CA3AF] shrink-0" />
            <div>
              <h2
                id="shortcuts-dialog-title"
                className="font-display text-lg font-semibold tracking-[-0.02em] text-[#F3F4F6]"
              >
                Keyboard Shortcuts
              </h2>
              <p className="text-xs text-[#9CA3AF]">
                Accelerate duel execution, playback, and navigation across AlgoArena.
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="p-1 rounded-lg text-[#9CA3AF] hover:text-white hover:bg-white/[0.05] transition cursor-pointer"
            aria-label="Close shortcuts modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 3 Columns with simple headings and dividers (flattened, no inner bordered cards) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 divide-y md:divide-y-0 md:divide-x divide-white/[0.06]">
          {sections.map((section, sIdx) => (
            <div
              key={section.title}
              className={`flex flex-col gap-2.5 ${sIdx > 0 ? 'md:pl-5 pt-3 md:pt-0' : ''}`}
            >
              <div className="flex items-center gap-1.5 pb-1 border-b border-white/[0.06] text-xs font-medium text-[#E5E7EB]">
                {section.icon}
                <span>{section.title}</span>
              </div>

              <div className="flex flex-col gap-2">
                {section.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between text-xs gap-2"
                  >
                    <span className="text-[#9CA3AF] text-xs leading-tight">
                      {item.label}
                    </span>
                    <div className="flex items-center gap-1 shrink-0 font-mono">
                      {item.keys.map((k, kIdx) =>
                        k === 'then' ? (
                          <span
                            key={kIdx}
                            className="text-xs text-[#9CA3AF] italic px-0.5"
                          >
                            then
                          </span>
                        ) : (
                          <kbd
                            key={kIdx}
                            className="inline-flex items-center justify-center min-w-[20px] px-1.5 py-0.5 text-xs font-mono text-[#E5E7EB] bg-white/[0.05] border border-white/[0.12] rounded shadow-[inset_0_-1px_0_rgba(0,0,0,0.4)]"
                          >
                            {k}
                          </kbd>
                        )
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer info tip */}
        <div className="flex items-center justify-between pt-2 border-t border-white/[0.06] text-xs text-[#9CA3AF]">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-[#9CA3AF]" />
            <span>Shortcuts are off while typing</span>
          </span>
          <span>
            Press <kbd className="px-1.5 py-0.5 text-xs bg-white/[0.05] border border-white/[0.1] rounded text-[#9CA3AF] font-mono">Esc</kbd> to exit
          </span>
        </div>
      </div>
    </div>
  );
}
