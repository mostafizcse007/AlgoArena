import React from 'react';

interface DuelMarkProps {
  className?: string;
  size?: number;
}

/**
 * Geometric duel mark: two offset triangles forming a diagonal split,
 * hinting at two competing algorithms facing off in a duel.
 * Strictly single-color as required.
 */
export function DuelMark({ className = 'text-[#38BDF8]', size = 18 }: DuelMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 18 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Top-left facet */}
      <path
        d="M2.5 3C2.5 2.72386 2.72386 2.5 3 2.5H12.8C13.2454 2.5 13.4684 3.03857 13.1536 3.35355L3.35355 13.1536C3.03857 13.4684 2.5 13.2454 2.5 12.8V3Z"
        fill="currentColor"
      />
      {/* Bottom-right facet */}
      <path
        d="M15.5 15C15.5 15.2761 15.2761 15.5 15 15.5H5.2C4.75456 15.5 4.53157 14.9614 4.84645 14.6464L14.6464 4.84645C14.9614 4.53157 15.5 4.75456 15.5 5.2V15Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function BrandLogo({
  markSize = 18,
  textClassName = 'text-[15px]',
  className = '',
}: {
  markSize?: number;
  textClassName?: string;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2 group ${className}`}>
      <DuelMark
        size={markSize}
        className="text-[#38BDF8] group-hover:text-[#7DD3FC] transition-colors shrink-0"
      />
      <span
        className={`font-display font-semibold tracking-[-0.03em] text-[#F3F4F6] group-hover:text-white transition-colors ${textClassName}`}
      >
        AlgoArena
      </span>
    </span>
  );
}
