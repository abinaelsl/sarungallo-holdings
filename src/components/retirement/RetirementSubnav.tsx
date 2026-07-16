"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const SUBNAV = [
  { href: "/retirement", label: "Family", exact: true },
  { href: "/retirement/dad", label: "Dad" },
  { href: "/retirement/mom", label: "Mom" },
  { href: "/retirement/son", label: "Son" },
  { href: "/retirement/cashflow", label: "Cash Flow" },
  { href: "/retirement/tax", label: "Tax" },
  { href: "/retirement/perks", label: "Perks" },
  { href: "/retirement/miles", label: "Miles" },
];

export function RetirementSubnav() {
  const pathname = usePathname();

  return (
    <div className="-mx-1 overflow-x-auto pb-1">
      <nav className="flex min-w-max gap-1 px-1">
        {SUBNAV.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm transition-colors",
                active
                  ? "bg-gold-tint/70 font-medium text-foreground"
                  : "text-muted hover:bg-surface-2/60 hover:text-foreground",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
