import Link from 'next/link';
import { ArrowLeft, ArrowRight } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#242424] flex flex-col items-center justify-center px-4 py-20">
      <div className="max-w-lg w-full bg-white border border-[#E4DDD0] rounded-sm shadow-sm p-8 sm:p-10 text-center space-y-5">
        <p className="text-xs font-semibold tracking-[0.22em] uppercase text-[#B99A61]">
          GIRIDHAR FASHION
        </p>
        <h1 className="font-serif text-4xl sm:text-5xl font-semibold text-[#173D32] leading-tight">
          Page Not Available
        </h1>
        <p className="text-sm text-[#5A5853] leading-relaxed">
          The page or collection piece you requested is currently unavailable or has moved.
          Explore our active menswear collection, Style Guide, and VIP Membership.
        </p>
        <div className="pt-3 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#173D32] text-[#FAF9F6] text-xs font-semibold uppercase tracking-[0.14em] hover:bg-[#102B23] transition-colors rounded-sm"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return Home</span>
          </Link>
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 px-6 py-3 border border-[#173D32] text-[#173D32] text-xs font-semibold uppercase tracking-[0.14em] hover:bg-[#F5F0E7] transition-colors rounded-sm"
          >
            <span>Browse Shop</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
