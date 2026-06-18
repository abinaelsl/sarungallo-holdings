import Link from "next/link";
import { Building2, LineChart, Coins, Bitcoin, Shield, TrendingUp, Globe, BarChart3 } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* ── Nav ──────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/logo-horizontal-color.svg"
            alt="Sarungallo Holdings"
            className="h-8 w-auto dark:hidden"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/logo-horizontal-reversed-white.svg"
            alt="Sarungallo Holdings"
            className="hidden h-8 w-auto dark:block"
          />
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="/login"
              className="rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-[#1c1a18] transition-colors hover:bg-gold-soft"
            >
              Private Access
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* ── Hero ─────────────────────────────────────────────── */}
        <section className="relative flex min-h-[88vh] flex-col items-center justify-center px-6 py-24 text-center">
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute left-1/2 top-0 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-gold/5 blur-3xl" />
            <div className="absolute -left-32 top-1/3 h-[400px] w-[400px] rounded-full bg-burgundy/5 blur-3xl" />
          </div>

          <div className="relative animate-fade-in">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold-tint px-4 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-gold">
              <Shield size={12} />
              Private Family Office
            </div>

            <h1 className="font-serif text-5xl font-semibold leading-tight text-foreground sm:text-6xl lg:text-7xl">
              Precision intelligence<br />
              <span className="italic text-gold">for generational wealth</span>
            </h1>

            <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-muted">
              A closed investment management platform for the Sarungallo family — tracking
              real assets, equities, gold, and digital assets across multiple currencies.
            </p>

            <div className="rule-gold mx-auto mt-8 w-24" />

            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link
                href="/login"
                className="group inline-flex items-center gap-2 rounded-lg bg-gold px-6 py-3 text-sm font-semibold text-[#1c1a18] transition-all hover:bg-gold-soft hover:shadow-lg hover:shadow-gold/20"
              >
                Access Portfolio
                <span className="transition-transform group-hover:translate-x-0.5">→</span>
              </Link>
              <a
                href="#about"
                className="inline-flex items-center gap-2 rounded-lg border border-border px-6 py-3 text-sm font-medium text-muted transition-colors hover:border-gold/40 hover:text-foreground"
              >
                Learn more
              </a>
            </div>
          </div>
        </section>

        {/* ── About ────────────────────────────────────────────── */}
        <section id="about" className="border-y border-border bg-surface/50 px-6 py-20">
          <div className="mx-auto max-w-4xl">
            <div className="grid gap-12 md:grid-cols-2 md:items-center">
              <div className="fade-up">
                <div className="text-xs uppercase tracking-[0.2em] text-muted">About</div>
                <h2 className="mt-3 font-serif text-3xl text-foreground">
                  A private office<br />built for one family
                </h2>
                <div className="rule-gold mt-4 w-20" />
                <p className="mt-5 leading-relaxed text-muted">
                  Sarungallo Holdings is a single-family office managing a diversified portfolio
                  across real estate, public equities, commodities, and digital assets. The platform
                  provides real-time visibility into portfolio performance, cost basis, and passive
                  income streams.
                </p>
                <p className="mt-4 leading-relaxed text-muted">
                  Access is strictly private. All data is encrypted and held on dedicated
                  infrastructure with no third-party data sharing.
                </p>
              </div>

              <div className="fade-up grid grid-cols-2 gap-4" style={{ animationDelay: "80ms" }}>
                {[
                  { label: "Asset Classes", value: "4" },
                  { label: "Currencies", value: "USD · IDR" },
                  { label: "Live Prices", value: "Real-time" },
                  { label: "Access", value: "Private" },
                ].map((stat) => (
                  <div key={stat.label} className="card accent-top p-5">
                    <div className="hero-figure font-serif text-2xl text-foreground">
                      {stat.value}
                    </div>
                    <div className="mt-1 text-xs uppercase tracking-wide text-muted">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Asset Classes ─────────────────────────────────────── */}
        <section className="px-6 py-20">
          <div className="mx-auto max-w-5xl">
            <div className="mb-12 text-center fade-up">
              <div className="text-xs uppercase tracking-[0.2em] text-muted">Portfolio</div>
              <h2 className="mt-3 font-serif text-3xl text-foreground">Asset classes under management</h2>
              <div className="rule-gold mx-auto mt-4 w-24" />
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  icon: Building2,
                  label: "Real Estate",
                  desc: "Direct property ownership tracked at appraised value with transaction history.",
                  delay: "0ms",
                },
                {
                  icon: LineChart,
                  label: "Equities",
                  desc: "Indonesian (IDX) and global listed stocks with live price feeds and lot-size awareness.",
                  delay: "60ms",
                },
                {
                  icon: Coins,
                  label: "Gold",
                  desc: "Physical gold holdings valued against live spot prices per troy ounce.",
                  delay: "120ms",
                },
                {
                  icon: Bitcoin,
                  label: "Crypto",
                  desc: "Digital asset positions valued via CoinGecko market data with P&L tracking.",
                  delay: "180ms",
                },
              ].map(({ icon: Icon, label, desc, delay }) => (
                <div
                  key={label}
                  className="card card-hover accent-top fade-up p-6"
                  style={{ animationDelay: delay }}
                >
                  <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gold-tint">
                    <Icon size={20} className="text-gold" />
                  </div>
                  <h3 className="font-serif text-lg font-medium text-foreground">{label}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Features ─────────────────────────────────────────── */}
        <section className="border-t border-border bg-surface/50 px-6 py-20">
          <div className="mx-auto max-w-5xl">
            <div className="mb-12 text-center fade-up">
              <div className="text-xs uppercase tracking-[0.2em] text-muted">Platform</div>
              <h2 className="mt-3 font-serif text-3xl text-foreground">Built for serious portfolio management</h2>
              <div className="rule-gold mx-auto mt-4 w-24" />
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {[
                {
                  icon: TrendingUp,
                  label: "Live valuations",
                  desc: "One-click price refresh pulls real-time data across all asset classes and saves a dated snapshot.",
                  delay: "0ms",
                },
                {
                  icon: BarChart3,
                  label: "Historical tracking",
                  desc: "Every portfolio snapshot is preserved so you can chart total value and cost basis over time.",
                  delay: "80ms",
                },
                {
                  icon: Globe,
                  label: "Multi-currency",
                  desc: "Switch between USD and IDR at any time. Exchange rates are captured alongside each snapshot.",
                  delay: "160ms",
                },
                {
                  icon: Coins,
                  label: "Income tracking",
                  desc: "Log dividends and yield events per holding. View trailing yield-on-cost and current yield.",
                  delay: "0ms",
                },
                {
                  icon: LineChart,
                  label: "P&L analysis",
                  desc: "Weighted-average cost basis, unrealized gain/loss, and return percentage per position.",
                  delay: "80ms",
                },
                {
                  icon: Shield,
                  label: "Private & secure",
                  desc: "Password-gated with server-side session tokens. No third-party analytics or data sharing.",
                  delay: "160ms",
                },
              ].map(({ icon: Icon, label, desc, delay }) => (
                <div
                  key={label}
                  className="fade-up flex gap-4"
                  style={{ animationDelay: delay }}
                >
                  <div className="mt-0.5 shrink-0">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-gold/30 bg-gold-tint">
                      <Icon size={15} className="text-gold" />
                    </div>
                  </div>
                  <div>
                    <div className="font-medium text-foreground">{label}</div>
                    <p className="mt-1 text-sm leading-relaxed text-muted">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ──────────────────────────────────────────────── */}
        <section className="px-6 py-20">
          <div className="mx-auto max-w-2xl text-center fade-up">
            <h2 className="font-serif text-3xl text-foreground">Ready to access the portfolio?</h2>
            <p className="mt-4 text-muted">
              This platform is restricted to authorised family members. If you have been
              granted access, use your private password to enter.
            </p>
            <div className="rule-gold mx-auto mt-6 w-20" />
            <Link
              href="/login"
              className="mt-8 inline-flex items-center gap-2 rounded-lg bg-gold px-8 py-3.5 text-sm font-semibold text-[#1c1a18] transition-all hover:bg-gold-soft hover:shadow-lg hover:shadow-gold/20"
            >
              Enter private access
            </Link>
          </div>
        </section>
      </main>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="border-t border-border px-6 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="text-xs uppercase tracking-[0.2em] text-muted/60">
            © {new Date().getFullYear()} Sarungallo Holdings · Private Family Office
          </div>
          <Link
            href="/login"
            className="text-xs uppercase tracking-[0.15em] text-muted/60 transition-colors hover:text-gold"
          >
            Private Access →
          </Link>
        </div>
      </footer>
    </div>
  );
}
