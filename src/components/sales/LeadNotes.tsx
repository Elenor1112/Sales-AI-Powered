"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { addLeadNote } from "@/lib/api/leads";
import type { LeadWithRelations } from "@/types/lead";
import { ClientApiError } from "@/lib/api/client";

function initials(name?: string | null) {
  if (!name) return "?";
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export function LeadNotes({ leadId, notes }: { leadId: string; notes: LeadWithRelations["notes"] }) {
  const [content, setContent] = useState("");
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => addLeadNote(leadId, content.trim()),
    onSuccess: () => {
      setContent("");
      toast.success("Note added");
      queryClient.invalidateQueries({ queryKey: ["lead", leadId] });
      queryClient.invalidateQueries({ queryKey: ["lead-activities", leadId] });
    },
    onError: (error) => {
      toast.error(error instanceof ClientApiError ? error.message : "Failed to add note");
    },
  });

  const sorted = [...(notes ?? [])].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Textarea
          placeholder="Add a note about this lead..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
        />
        <div className="flex justify-end">
          <Button
            size="sm"
            disabled={!content.trim() || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? "Adding..." : "Add note"}
          </Button>
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-10 text-center">
          <p className="text-sm font-medium">No notes yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Add the first note to keep track of this lead.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {sorted.map((note) => (
            <li key={note.id} className="flex gap-3 rounded-lg border p-3">
              <Avatar className="size-8 shrink-0">
                <AvatarFallback className="text-xs">{initials(note.user?.name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{note.user?.name ?? "Unknown"}</p>
                  <p className="shrink-0 text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}
                  </p>
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{note.content}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
