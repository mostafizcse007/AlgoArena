// src/app/settings/loading.tsx
// Exact-geometry shimmer skeleton matching Settings layout (CLS = 0)

import { Container } from '@/components/layout/Container';

export default function SettingsLoading() {
  return (
    <Container className="flex-1 flex flex-col py-8">
      {/* Header Skeleton */}
      <div className="mb-8">
        <div className="h-8 w-44 bg-white/[0.05] rounded-xl animate-pulse mb-2" />
        <div className="h-4 w-96 max-w-full bg-white/[0.03] rounded-lg animate-pulse" />
      </div>

      {/* 2-Column Responsive Layout */}
      <div className="flex flex-col md:flex-row gap-6 items-start">
        {/* Left Sidebar Skeleton */}
        <div className="w-full md:w-60 shrink-0 bg-[#11141C] border border-white/[0.08] rounded-2xl p-2 flex flex-row md:flex-col gap-1 shadow-lg">
          <div className="h-10 bg-white/[0.08] rounded-xl animate-pulse" />
          <div className="h-10 bg-white/[0.03] rounded-xl animate-pulse" />
          <div className="h-10 bg-white/[0.03] rounded-xl animate-pulse" />
          <div className="h-10 bg-white/[0.03] rounded-xl animate-pulse" />
        </div>

        {/* Right Content Panel Skeleton */}
        <div className="flex-1 w-full bg-[#11141C] border border-white/[0.08] rounded-2xl p-6 sm:p-7 shadow-xl flex flex-col gap-6">
          <div>
            <div className="h-6 w-48 bg-white/[0.06] rounded-lg animate-pulse mb-1.5" />
            <div className="h-4 w-72 bg-white/[0.03] rounded animate-pulse" />
          </div>

          <div className="h-px bg-white/[0.07]" />

          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-2xl bg-white/[0.04] animate-pulse shrink-0" />
            <div className="flex flex-col gap-2">
              <div className="h-4 w-28 bg-white/[0.05] rounded animate-pulse" />
              <div className="h-3 w-56 bg-white/[0.03] rounded animate-pulse" />
            </div>
          </div>

          <div className="h-px bg-white/[0.07]" />

          <div className="flex flex-col gap-2 max-w-md">
            <div className="h-4 w-24 bg-white/[0.05] rounded animate-pulse" />
            <div className="h-10 w-full bg-white/[0.04] rounded-xl animate-pulse" />
          </div>

          <div className="flex flex-col gap-2 max-w-md">
            <div className="h-4 w-32 bg-white/[0.05] rounded animate-pulse" />
            <div className="h-10 w-full bg-white/[0.04] rounded-xl animate-pulse" />
          </div>
        </div>
      </div>
    </Container>
  );
}

