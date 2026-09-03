import { SalesHeader } from "./SalesHeader";
import { SalesSidebar } from "./SalesSidebar";

export function SalesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex h-svh overflow-hidden bg-background">
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0 ambient-glow-1" />
        <div className="absolute inset-0 ambient-glow-2" />
      </div>
      <aside className="relative z-10 hidden w-64 shrink-0 border-r border-white/10 bg-sidebar/80 backdrop-blur-xl md:block">
        <SalesSidebar />
      </aside>
      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        <SalesHeader />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
