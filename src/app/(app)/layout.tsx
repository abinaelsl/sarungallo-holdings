import { PortfolioProvider } from "@/components/PortfolioProvider";
import { AppShell } from "@/components/AppShell";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <PortfolioProvider>
      <AppShell>{children}</AppShell>
    </PortfolioProvider>
  );
}
