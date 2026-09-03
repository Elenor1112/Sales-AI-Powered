import { format } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { AssignmentHistoryWithNames } from "@/types/assignment";

export function AssignmentHistory({ history }: { history: AssignmentHistoryWithNames[] }) {
  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-10 text-center">
        <p className="text-sm font-medium">No assignment history</p>
        <p className="mt-1 text-sm text-muted-foreground">This lead hasn&apos;t been assigned or reassigned yet.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>From</TableHead>
            <TableHead>To</TableHead>
            <TableHead>Method</TableHead>
            <TableHead>Reason</TableHead>
            <TableHead className="text-right">When</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {history.map((entry) => (
            <TableRow key={entry.id}>
              <TableCell className="text-sm text-muted-foreground">
                {entry.previousUser?.name ?? entry.previousTeam?.name ?? "Unassigned"}
              </TableCell>
              <TableCell className="text-sm font-medium">
                {entry.newUser?.name ?? entry.newTeam?.name ?? "Unassigned"}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {entry.assignmentMethod.replaceAll("_", " ")}
              </TableCell>
              <TableCell className="max-w-64 truncate text-sm text-muted-foreground" title={entry.reason ?? undefined}>
                {entry.reason ?? "—"}
              </TableCell>
              <TableCell className="text-right text-sm text-muted-foreground">
                {format(new Date(entry.createdAt), "MMM d, yyyy p")}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
