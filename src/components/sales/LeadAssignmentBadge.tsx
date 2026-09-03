import { UserCheck, UserX, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function LeadAssignmentBadge({
  assignmentStatus,
  assignedUserName,
}: {
  assignmentStatus: string;
  assignedUserName?: string | null;
}) {
  if (assignmentStatus === "ASSIGNED" && assignedUserName) {
    return (
      <Badge variant="outline" className="gap-1 border-tertiary/20 bg-tertiary/15 text-tertiary">
        <UserCheck className="size-3" aria-hidden="true" />
        {assignedUserName}
      </Badge>
    );
  }
  if (assignmentStatus === "REASSIGNMENT_REQUIRED") {
    return (
      <Badge variant="outline" className="gap-1 border-secondary/20 bg-secondary/15 text-secondary">
        <AlertTriangle className="size-3" aria-hidden="true" />
        Reassignment needed
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1 border-white/10 bg-muted text-muted-foreground">
      <UserX className="size-3" aria-hidden="true" />
      Unassigned
    </Badge>
  );
}
