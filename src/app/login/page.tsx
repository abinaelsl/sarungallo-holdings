"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const from = search.get("from") || "/dashboard";
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setLoading(false);
    if (res.ok) {
      router.push(from);
      router.refresh();
    } else {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Incorrect password");
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center p-4">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="card accent-top w-full max-w-sm p-8 animate-fade-in">
        <div className="mb-7 flex flex-col items-center text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/logo-stacked-color.svg"
            alt="Sarungallo Holdings"
            className="h-24 w-auto dark:hidden"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/logo-horizontal-reversed-white.svg"
            alt="Sarungallo Holdings"
            className="hidden h-12 w-auto dark:block"
          />
          <div className="rule-gold mt-5 w-20" />
          <div className="mt-4 flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-muted">
            <Lock size={12} /> Private access
          </div>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted">
              Access password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-gold/60 focus:ring-2 focus:ring-gold/15"
              placeholder="••••••••"
            />
          </div>
          {error && <div className="text-sm text-loss">{error}</div>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-gold px-4 py-2.5 text-sm font-semibold text-[#1c1a18] transition-colors hover:bg-gold-soft disabled:opacity-60 cursor-pointer"
          >
            {loading ? "Verifying…" : "Enter"}
          </button>
        </form>
        <p className="mt-7 text-center text-[11px] uppercase tracking-[0.18em] text-muted/70">
          Sarungallo Holdings · Family Office
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
