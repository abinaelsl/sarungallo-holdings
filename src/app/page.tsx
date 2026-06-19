import Link from "next/link";

export default function HomePage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6">
      {/* Decorative background rings */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(900px 700px at 50% 40%, rgba(176,141,63,0.07), transparent 65%), radial-gradient(600px 400px at 80% 80%, rgba(122,46,42,0.05), transparent 60%)",
        }}
      />

      <div className="relative z-10 flex flex-col items-center text-center">
        {/* Logo */}
        <div className="mb-10">
          <img
            src="/brand/logo-horizontal-color.svg"
            alt="Sarungallo Holdings"
            className="mx-auto h-14 w-auto dark:hidden"
          />
          <img
            src="/brand/logo-horizontal-reversed-white.svg"
            alt="Sarungallo Holdings"
            className="mx-auto hidden h-14 w-auto dark:block"
          />
        </div>

        {/* Divider */}
        <div className="mb-8 h-px w-16 bg-gold/60" />

        {/* Tagline */}
        <p
          className="font-serif text-lg italic text-muted"
          style={{ letterSpacing: "0.02em" }}
        >
          Private Family Office Portfolio Intelligence
        </p>

        {/* CTA */}
        <div className="mt-12">
          <Link
            href="/login"
            className="inline-block rounded-lg bg-gold px-8 py-3 text-sm font-semibold tracking-wide text-[#1c1a18] transition-colors hover:bg-gold-soft"
          >
            Sign in
          </Link>
        </div>
      </div>

      {/* Footer mark */}
      <div className="absolute bottom-8 text-[11px] uppercase tracking-[0.25em] text-muted/60">
        Confidential · Family Use Only
      </div>
    </div>
  );
}
