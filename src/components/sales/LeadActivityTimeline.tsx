import {
  Plus,
  RefreshCcw,
  UserCheck,
  UserCog,
  AlertTriangle,
  StickyNote,
  Phone,
  BadgeCheck,
  FileText,
  Trophy,
  XCircle,
  Import,
  Share2,
  ListTodo,
  CheckCircle2,
  Handshake,
  Tag,
  Circle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { LucideIcon } from "lucide-react";
import type { LeadActivityWithUser } from "@/types/lead";

const ACTIVITY_ICONS: Record<string, LucideIcon> = {
  CREATED: Plus,
  STATUS_CHANGED: RefreshCcw,
  ASSIGNED: UserCheck,
  REASSIGNED: UserCog,
  ASSIGNMENT_FAILED: AlertTriangle,
  NOTE_ADDED: StickyNote,
  CONTACTED: Phone,
  QUALIFIED: BadgeCheck,
  PROPOSAL_SENT: FileText,
  WON: Trophy,
  LOST: XCircle,
  IMPORTED: Import,
  META_SYNCHRONIZED: Share2,
  TASK_CREATED: ListTodo,
  TASK_COMPLETED: CheckCircle2,
  DEAL_CREATED: Handshake,
  DEAL_UPDATED: Handshake,
  TAG_ADDED: Tag,
};

function describeActivity(activity: LeadActivityWithUser): string {
  const meta = (activity.metadata ?? {}) as Record<string, unknown>;
  switch (activity.activityType) {
    case "CREATED":
      return "Lead was created";
    case "STATUS_CHANGED":
      return `Status changed${meta.from ? ` from ${meta.from}` : ""}${meta.to ? ` to ${meta.to}` : ""}`;
    case "ASSIGNED":
      return `Assigned${meta.userName ? ` to ${meta.userName}` : ""}${meta.teamName ? ` (${meta.teamName})` : ""}`;
    case "REASSIGNED":
      return `Reassigned${meta.userName ? ` to ${meta.userName}` : ""}`;
    case "ASSIGNMENT_FAILED":
      return `Assignment failed${meta.reason ? `: ${meta.reason}` : ""}`;
    case "NOTE_ADDED":
      return "Note added";
    case "CONTACTED":
      return "Lead was contacted";
    case "QUALIFIED":
      return "Lead qualified";
    case "PROPOSAL_SENT":
      return "Proposal sent";
    case "WON":
      return "Lead marked as won";
    case "LOST":
      return `Lead marked as lost${meta.reason ? `: ${meta.reason}` : ""}`;
    case "IMPORTED":
      return "Lead imported";
    case "META_SYNCHRONIZED":
      return "Synchronized from Meta";
    case "TASK_CREATED":
      return `Task created${meta.title ? `: ${meta.title}` : ""}`;
    case "TASK_COMPLETED":
      return `Task completed${meta.title ? `: ${meta.title}` : ""}`;
    case "DEAL_CREATED":
      return `Deal created${meta.name ? `: ${meta.name}` : ""}`;
    case "DEAL_UPDATED":
      return `Deal updated${meta.stage ? ` to ${meta.stage}` : ""}`;
    case "TAG_ADDED":
      return `Tag added${meta.tagNames ? `: ${(meta.tagNames as string[]).join(", ")}` : ""}`;
    default:
      return String(activity.activityType).replaceAll("_", " ").toLowerCase();
  }
}

export function LeadActivityTimeline({ activities }: { activities: LeadActivityWithUser[] }) {
  if (activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
        <p className="text-sm font-medium">No activity yet</p>
        <p className="mt-1 text-sm text-muted-foreground">Actions on this lead will show up here.</p>
      </div>
    );
  }

  return (
    <ol className="relative space-y-6 border-l pl-6">
      {activities.map((activity) => {
        const Icon = ACTIVITY_ICONS[activity.activityType] ?? Circle;
        return (
          <li key={activity.id} className="relative">
            <span className="absolute -left-[31px] flex size-6 items-center justify-center rounded-full border bg-background">
              <Icon className="size-3.5 text-muted-foreground" aria-hidden="true" />
            </span>
            <p className="text-sm">{describeActivity(activity)}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {activity.user?.name ?? "System"} &middot;{" "}
              {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
