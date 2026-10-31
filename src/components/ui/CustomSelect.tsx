'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Search } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
}

interface CustomSelectProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  className?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  searchEmptyText?: string;
}

export function CustomSelect({
  label,
  value,
  onChange,
  options,
  className = '',
  searchable = false,
  searchPlaceholder = 'Search...',
  searchEmptyText = 'No matching options found',
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const selectedOption = options.find((opt) => opt.value === value) || options[0];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
        setSearchQuery('');
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
      if (searchable) {
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, searchable]);

  const filteredOptions = searchable && searchQuery.trim()
    ? options.filter(
        (opt) =>
          opt.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          opt.value.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : options;

  return (
    <div className={`relative flex flex-col gap-1 ${className}`} ref={containerRef}>
      {label && <label className="text-xs text-[#9CA3AF] font-medium">{label}</label>}

      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => {
          if (isOpen) setSearchQuery('');
          setIsOpen(!isOpen);
        }}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className="w-full px-3 py-2 rounded-lg bg-[#0B0D12] border border-white/[0.08] hover:border-white/[0.15] text-xs text-[#E5E7EB] flex items-center justify-between transition cursor-pointer focus:outline-none focus:border-sky-400/50 shadow-inner"
      >
        <span className="truncate">{selectedOption?.label || value}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-[#9CA3AF] transition-transform duration-150 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-[#161A24] border border-white/[0.1] rounded-lg p-1 shadow-2xl backdrop-blur-xl flex flex-col gap-0.5 max-h-72"
        >
          {searchable && (
            <div className="p-1.5 border-b border-white/[0.08] mb-1">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#6B7280] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full pl-8 pr-2.5 py-1.5 bg-[#0B0D12] border border-white/[0.08] rounded-md text-xs text-white placeholder-[#6B7280] focus:outline-none focus:border-sky-400/50"
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                />
              </div>
            </div>
          )}

          <div className={searchable ? 'max-h-56 overflow-y-auto flex flex-col gap-0.5' : 'flex flex-col gap-0.5'}>
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-xs text-[#9CA3AF] text-center">
                {searchEmptyText}
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                      setSearchQuery('');
                    }}
                    className={`w-full px-2.5 py-1.5 rounded-md text-xs text-left flex items-center justify-between transition cursor-pointer ${
                      isSelected
                        ? 'bg-sky-500/10 text-sky-300 font-medium'
                        : 'text-[#D1D5DB] hover:bg-white/[0.05] hover:text-white'
                    }`}
                  >
                    <div className="truncate pr-2">
                      <div className="truncate">{opt.label}</div>
                      {opt.description && (
                        <div className="text-xs text-[#9CA3AF] truncate">{opt.description}</div>
                      )}
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-sky-400 shrink-0 ml-2" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
