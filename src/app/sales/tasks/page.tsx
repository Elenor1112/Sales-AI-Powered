"use client";

import { useState } from "react";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TaskList } from "@/components/sales/TaskList";
import { NewTaskDialog } from "./new-task-dialog";

const STATUS_OPTIONS = ["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"];

export default function TasksPage() {
  const [status, setStatus] = useState<string | undefined>(undefined);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
          <p className="text-sm text-muted-foreground">Follow-ups and to-dos across your team.</p>
        </div>
        <NewTaskDialog />
      </div>

      <Select value={status ?? "all"} onValueChange={(v) => setStatus(v === "all" ? undefined : v ?? undefined)}>
        <SelectTrigger className="w-48">
          <SelectValue placeholder="All statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          {STATUS_OPTIONS.map((s) => (
            <SelectItem key={s} value={s}>
              {s.replaceAll("_", " ")}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <TaskList filters={status ? { status } : undefined} />
    </div>
  );
}
