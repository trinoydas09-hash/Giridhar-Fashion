import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function AffiliatesPage() {
  return (
    <main className="min-h-[75vh] bg-[#FAF9F6] px-4 py-16 sm:py-24">
      <section className="mx-auto max-w-5xl overflow-hidden border border-[#E4DDD0] bg-white">
        <div className="bg-[#173D32] px-6 py-14 text-center text-[#F5F0E7] sm:px-12 sm:py-20">
          <p className="text-[11px] uppercase tracking-[.24em] text-[#B99A61]">GIRIDHAR FASHION · PARTNER PROGRAMME</p>
          <h1 className="mx-auto mt-5 max-w-3xl font-serif text-4xl leading-tight sm:text-5xl">Share Your Style.<br />Earn With Every Referral.</h1>
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-[#F5F0E7]/80 sm:text-base">
            Join the GIRIDHAR FASHION Affiliate Programme. Share products you love with your audience, track referrals, and view your commissions from one simple dashboard.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/affiliates/signup" className="inline-flex min-h-12 items-center justify-center bg-[#B99A61] px-7 py-3 text-xs font-semibold uppercase tracking-[.14em] text-[#173D32] transition-colors hover:bg-[#D0B77F]">Become an Affiliate</Link>
            <Link href="/affiliates/login" className="inline-flex min-h-12 items-center justify-center border border-[#F5F0E7]/50 px-7 py-3 text-xs font-semibold uppercase tracking-[.14em] text-[#F5F0E7] transition-colors hover:bg-white/10">Affiliate Login</Link>
          </div>
        </div>
        <div className="grid gap-8 px-6 py-10 sm:grid-cols-3 sm:px-12 sm:py-14">
          <div>
            <p className="font-serif text-2xl text-[#173D32]">01</p>
            <h2 className="mt-3 text-sm font-semibold text-[#173D32]">Create your account</h2>
            <p className="mt-2 text-sm leading-6 text-[#68645D]">Apply with your name, email, and WhatsApp number. Your application will be reviewed by our team.</p>
          </div>
          <div>
            <p className="font-serif text-2xl text-[#173D32]">02</p>
            <h2 className="mt-3 text-sm font-semibold text-[#173D32]">Share referral links</h2>
            <p className="mt-2 text-sm leading-6 text-[#68645D]">After approval, create trackable links for GIRIDHAR FASHION products and pages to share with your audience.</p>
          </div>
          <div>
            <p className="font-serif text-2xl text-[#173D32]">03</p>
            <h2 className="mt-3 text-sm font-semibold text-[#173D32]">Track your rewards</h2>
            <p className="mt-2 text-sm leading-6 text-[#68645D]">See referral clicks, confirmed sales, commission history, and payout requests in your affiliate dashboard.</p>
          </div>
        </div>
        <div className="border-t border-[#E4DDD0] px-6 py-6 text-center text-xs text-[#68645D] sm:px-12">
          Already applied? <Link href="/affiliates/login" className="font-semibold text-[#173D32] underline underline-offset-4">Sign in to your affiliate account</Link>
        </div>
      </section>
    </main>
  );
}
