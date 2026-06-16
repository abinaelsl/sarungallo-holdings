"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Wallet,
  RefreshCw,
  LogOut,
  Menu,
  X,
  Check,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { usePortfolio } from "./PortfolioProvider";
import { formatDateTime } from "@/lib/format";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/holdings", label: "Holdings", icon: Wallet },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { refreshPrices, refreshing, currency, setCurrency, holdings } =
    usePortfolio();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);

  const lastUpdated = holdings
    .map((h) => h.price_updated_at)
    .filter(Boolean)
    .sort()
    .pop();

  async function handleRefresh() {
    const r = await refreshPrices();
    if (r && r.ok) {
      const failed = r.failures?.length ?? 0;
      setToast({
        ok: failed === 0,
        msg:
          failed === 0
            ? "Prices refreshed & snapshot saved"
            : `Refreshed — ${failed} price(s) unavailable`,
      });
    } else {
      setToast({ ok: false, msg: "Refresh failed" });
    }
    setTimeout(() => setToast(null), 4000);
  }

  async function handleLogout() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const SidebarInner = (
    <div className="flex h-full flex-col">
      <div className="px-5 py-6">
        <Link href="/" className="block" onClick={() => setMobileOpen(false)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/logo-horizontal-color.svg"
            alt="Sarungallo Holdings"
            className="h-9 w-auto"
          />
        </Link>
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {NAV.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                active
                  ? "bg-surface-2 text-foreground"
                  : "text-muted hover:bg-surface-2/60 hover:text-foreground",
              )}
            >
              <Icon size={18} className={active ? "text-gold" : ""} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-border p-3">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted hover:bg-surface-2 hover:text-foreground cursor-pointer"
        >
          <LogOut size={18} />
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 border-r border-border bg-surface/40 lg:block">
        {SidebarInner}
      </aside>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute left-0 top-0 h-full w-60 border-r border-border bg-surface">
            {SidebarInner}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/80 px-4 py-3 backdrop-blur sm:px-6">
          <button
            className="rounded-md p-2 text-muted hover:bg-surface-2 lg:hidden cursor-pointer"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Menu"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <div className="hidden text-sm text-muted sm:block">
            {lastUpdated ? (
              <>Last priced {formatDateTime(lastUpdated)}</>
            ) : (
              <>Prices not yet refreshed</>
            )}
          </div>

          <div className="ml-auto flex items-center gap-2">
            {/* Currency toggle */}
            <div className="flex rounded-lg border border-border bg-surface p-0.5">
              {(["USD", "IDR"] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => setCurrency(c)}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer",
                    currency === c
                      ? "bg-gold text-[#1c1a18]"
                      : "text-muted hover:text-foreground",
                  )}
                >
                  {c}
                </button>
              ))}
            </div>

            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-lg bg-gold px-3.5 py-2 text-sm font-semibold text-[#1c1a18] hover:bg-gold-soft disabled:opacity-60 cursor-pointer"
            >
              <RefreshCw
                size={16}
                className={refreshing ? "animate-spin-slow" : ""}
              />
              <span className="hidden sm:inline">
                {refreshing ? "Refreshing…" : "Refresh"}
              </span>
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={cn(
            "fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-fade-in rounded-lg border px-4 py-2.5 text-sm shadow-lg",
            toast.ok
              ? "border-gain/40 bg-surface text-gain"
              : "border-loss/40 bg-surface text-loss",
          )}
        >
          <span className="flex items-center gap-2">
            {toast.ok ? <Check size={16} /> : <AlertTriangle size={16} />}
            {toast.msg}
          </span>
        </div>
      )}
    </div>
  );
}
