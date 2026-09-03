"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, CalendarIcon } from "lucide-react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { UserSelect } from "@/components/sales/UserSelect";
import { createTask } from "@/lib/api/tasks";
import { ClientApiError } from "@/lib/api/client";

const schema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  dueDate: z.date().optional(),
  assignedUserId: z.string().min(1, "Assignee is required"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  leadId: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export function NewTaskDialog() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { control, register, handleSubmit, reset, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { title: "", description: "", assignedUserId: "", priority: "MEDIUM", leadId: "" },
  });

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      createTask({
        ...values,
        dueDate: values.dueDate?.toISOString(),
        leadId: values.leadId || undefined,
        description: values.description || undefined,
      }),
    onSuccess: () => {
      toast.success("Task created");
      setOpen(false);
      reset();
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (error) => {
      toast.error(error instanceof ClientApiError ? error.message : "Failed to create task");
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Plus className="size-4" /> New Task
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New task</DialogTitle>
          <DialogDescription>Create a follow-up task for a salesperson.</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit((values) => mutation.mutate(values))}>
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input {...register("title")} placeholder="Follow up with lead" />
            {formState.errors.title && <p className="text-sm text-destructive">{formState.errors.title.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Description (optional)</Label>
            <Textarea {...register("description")} rows={2} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Due date</Label>
              <Controller
                control={control}
                name="dueDate"
                render={({ field }) => (
                  <Popover>
                    <PopoverTrigger render={<Button variant="outline" className="w-full justify-start font-normal" />}>
                      <CalendarIcon className="size-3.5" />
                      {field.value ? format(field.value, "MMM d, yyyy") : "No due date"}
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={field.value} onSelect={field.onChange} />
                    </PopoverContent>
                  </Popover>
                )}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Controller
                control={control}
                name="priority"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["LOW", "MEDIUM", "HIGH", "URGENT"].map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Assignee</Label>
            <Controller
              control={control}
              name="assignedUserId"
              render={({ field }) => <UserSelect value={field.value} onChange={field.onChange} />}
            />
            {formState.errors.assignedUserId && (
              <p className="text-sm text-destructive">{formState.errors.assignedUserId.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Lead ID (optional)</Label>
            <Input {...register("leadId")} placeholder="Link to an existing lead" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Creating..." : "Create task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
