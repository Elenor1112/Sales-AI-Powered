"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import type { LeadWithRelations } from "@/types/lead";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LeadStatusBadge } from "./LeadStatusBadge";
import { LeadAssignmentBadge } from "./LeadAssignmentBadge";
import { Skeleton } from "@/components/ui/skeleton";

function initials(name?: string | null) {
  if (!name) return "?";
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export function LeadTableSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}

export function LeadTable({ leads }: { leads: LeadWithRelations[] }) {
  if (leads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
        <p className="text-sm font-medium">No leads found</p>
        <p className="mt-1 text-sm text-muted-foreground">Try adjusting your filters or create a new lead.</p>
      </div>
    );
  }

  return (
    <div className="glass-card overflow-x-auto rounded-xl">
      <Table>
        <TableHeader>
          <TableRow className="border-white/10 bg-muted/40 hover:bg-muted/40">
            <TableHead>Name</TableHead>
            <TableHead>Source</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Assignment</TableHead>
            <TableHead>Team</TableHead>
            <TableHead className="text-right">Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.map((lead) => (
            <TableRow key={lead.id} className="cursor-pointer border-white/5 hover:bg-white/[0.02]">
              <TableCell>
                <Link href={`/sales/leads/${lead.id}`} className="flex items-center gap-3 hover:underline">
                  <Avatar className="size-8">
                    <AvatarFallback className="text-xs">{initials(lead.name)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{lead.name}</p>
                    <p className="text-xs text-muted-foreground">{lead.email ?? lead.phone ?? "—"}</p>
                  </div>
                </Link>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">{lead.source}</TableCell>
              <TableCell>
                <LeadStatusBadge status={lead.status} />
              </TableCell>
              <TableCell>
                <LeadAssignmentBadge
                  assignmentStatus={lead.assignmentStatus}
                  assignedUserName={lead.assignedUser?.name}
                />
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">{lead.assignedTeam?.name ?? "—"}</TableCell>
              <TableCell className="text-right text-sm text-muted-foreground">
                {formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true })}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
