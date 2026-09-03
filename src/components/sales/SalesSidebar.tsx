"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  ListChecks,
  KanbanSquare,
  BarChart3,
  UserX,
  UsersRound,
  Settings2,
  Share2,
} from "lucide-react";

import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/sales", label: "Dashboard", icon: LayoutDashboard },
  { href: "/sales/leads", label: "Leads", icon: Users },
  { href: "/sales/unassigned", label: "Unassigned", icon: UserX },
  { href: "/sales/tasks", label: "Tasks", icon: ListChecks },
  { href: "/sales/deals", label: "Deals", icon: KanbanSquare },
  { href: "/sales/team", label: "Team", icon: UsersRound },
  { href: "/sales/assignment", label: "Assignment", icon: Settings2 },
  { href: "/sales/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/settings/integrations/meta", label: "Meta Integration", icon: Share2 },
];

export function SalesSidebar({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <nav className={cn("flex h-full flex-col gap-1 p-3", className)} aria-label="Main navigation">
      <div className="px-3 py-4 text-lg font-extrabold tracking-tight text-primary">Vivid Sales CRM</div>
      <div className="flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const isActive = item.href === "/sales" ? pathname === "/sales" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                isActive
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
              )}
            >
              <Icon className="size-4" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </div>
      <Link
        href="/sales/leads"
        className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-secondary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-shadow hover:shadow-primary/40"
      >
        Add New Lead
      </Link>
    </nav>
  );
}
