'use client';

import Link from 'next/link';
import { RefreshCw } from 'lucide-react';

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#242424] flex flex-col items-center justify-center px-4 py-20">
      <div className="max-w-lg w-full bg-white border border-[#E4DDD0] rounded-sm shadow-sm p-8 sm:p-10 text-center space-y-5">
        <p className="text-xs font-semibold tracking-[0.22em] uppercase text-[#B99A61]">
          GIRIDHAR FASHION
        </p>
        <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-[#173D32]">
          Something Went Wrong
        </h1>
        <p className="text-sm text-[#5A5853] leading-relaxed">
          We encountered a temporary issue loading this page. Please refresh or return to the
          storefront.
        </p>
        <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#173D32] text-[#FAF9F6] text-xs font-semibold uppercase tracking-[0.14em] hover:bg-[#102B23] transition-colors rounded-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </button>
          <Link
            href="/"
            className="inline-flex items-center px-6 py-3 border border-[#D8CFC0] text-[#242424] text-xs font-semibold uppercase tracking-[0.14em] hover:border-[#173D32] transition-colors rounded-sm"
          >
            Return Home
          </Link>
        </div>
      </div>
    </div>
  );
}
