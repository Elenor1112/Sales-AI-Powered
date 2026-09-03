import { formatDistanceToNow } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CapacityIndicator } from "./CapacityIndicator";
import type { WorkloadEntry } from "@/types/assignment";

function initials(name?: string | null) {
  if (!name) return "?";
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export function SalespersonWorkload({ workload }: { workload: WorkloadEntry[] }) {
  if (workload.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
        <p className="text-sm font-medium">No salespeople yet</p>
        <p className="mt-1 text-sm text-muted-foreground">Add team members to see workload here.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {workload.map((member) => (
        <Card key={member.userId}>
          <CardContent className="space-y-3 p-4">
            <div className="flex items-center gap-3">
              <Avatar className="size-9">
                <AvatarFallback className="text-xs">{initials(member.name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{member.name}</p>
                <p className="truncate text-xs text-muted-foreground">{member.teamName}</p>
              </div>
              {member.isPaused && (
                <span className="ml-auto shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                  Paused
                </span>
              )}
            </div>
            <CapacityIndicator active={member.activeLeadCount} max={member.maxActiveLeads} />
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <div>
                <p>Total assigned</p>
                <p className="text-sm font-medium text-foreground">{member.totalAssignedCount}</p>
              </div>
              <div>
                <p>Won</p>
                <p className="text-sm font-medium text-foreground">{member.wonLeadCount}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Last assigned:{" "}
              {member.lastAssignedAt
                ? formatDistanceToNow(new Date(member.lastAssignedAt), { addSuffix: true })
                : "Never"}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
