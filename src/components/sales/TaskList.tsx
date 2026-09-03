"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, isPast } from "date-fns";
import { toast } from "sonner";
import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { listTasks, completeTask } from "@/lib/api/tasks";
import { ClientApiError } from "@/lib/api/client";

const PRIORITY_STYLES: Record<string, string> = {
  LOW: "bg-muted text-muted-foreground border border-white/10",
  MEDIUM: "bg-primary/15 text-primary border border-primary/20",
  HIGH: "bg-secondary/15 text-secondary border border-secondary/20",
  URGENT: "bg-destructive/15 text-destructive border border-destructive/20",
};

export function TaskList({
  leadId,
  filters,
}: {
  leadId?: string;
  filters?: Record<string, string | number | boolean | undefined>;
}) {
  const queryClient = useQueryClient();
  const queryFilters = { ...filters, ...(leadId ? { leadId } : {}) };

  const tasksQuery = useQuery({
    queryKey: ["tasks", queryFilters],
    queryFn: () => listTasks(queryFilters),
  });

  const completeMutation = useMutation({
    mutationFn: (id: string) => completeTask(id),
    onSuccess: () => {
      toast.success("Task completed");
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (error) => {
      toast.error(error instanceof ClientApiError ? error.message : "Failed to complete task");
    },
  });

  if (tasksQuery.isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (tasksQuery.isError) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <p className="text-sm text-muted-foreground">Failed to load tasks.</p>
          <Button variant="outline" size="sm" onClick={() => tasksQuery.refetch()}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const tasks = tasksQuery.data?.items ?? [];

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
        <p className="text-sm font-medium">No tasks yet</p>
        <p className="mt-1 text-sm text-muted-foreground">Create a task to keep track of follow-ups.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Due date</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Assignee</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map((task) => {
            const overdue = task.dueDate && task.status !== "COMPLETED" && isPast(new Date(task.dueDate));
            return (
              <TableRow key={task.id}>
                <TableCell className="font-medium">{task.title}</TableCell>
                <TableCell className={overdue ? "text-sm font-medium text-destructive" : "text-sm text-muted-foreground"}>
                  {task.dueDate ? format(new Date(task.dueDate), "MMM d, yyyy") : "—"}
                  {overdue && " (overdue)"}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={`border-transparent font-medium ${PRIORITY_STYLES[task.priority]}`}>
                    {task.priority}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{task.assignedUser?.name ?? "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{task.status.replaceAll("_", " ")}</TableCell>
                <TableCell className="text-right">
                  {task.status !== "COMPLETED" && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={completeMutation.isPending}
                      onClick={() => completeMutation.mutate(task.id)}
                    >
                      <Check className="size-3.5" /> Complete
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
