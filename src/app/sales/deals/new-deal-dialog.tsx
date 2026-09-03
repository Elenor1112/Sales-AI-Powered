"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus } from "lucide-react";

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserSelect } from "@/components/sales/UserSelect";
import { createDeal } from "@/lib/api/deals";
import { ClientApiError } from "@/lib/api/client";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  value: z.string().optional(),
  currency: z.string().min(1),
  ownerId: z.string().min(1, "Owner is required"),
  stage: z.enum(["QUALIFICATION", "PROPOSAL", "NEGOTIATION", "WON", "LOST"]),
  leadId: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export function NewDealDialog() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { control, register, handleSubmit, reset, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", value: "", currency: "USD", ownerId: "", stage: "QUALIFICATION", leadId: "" },
  });

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      createDeal({
        ...values,
        value: values.value ? Number(values.value) : undefined,
        leadId: values.leadId || undefined,
      }),
    onSuccess: () => {
      toast.success("Deal created");
      setOpen(false);
      reset();
      queryClient.invalidateQueries({ queryKey: ["deals"] });
    },
    onError: (error) => {
      toast.error(error instanceof ClientApiError ? error.message : "Failed to create deal");
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Plus className="size-4" /> New Deal
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New deal</DialogTitle>
          <DialogDescription>Add a deal to your pipeline.</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit((values) => mutation.mutate(values))}>
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input {...register("name")} placeholder="Acme Inc. — Annual plan" />
            {formState.errors.name && <p className="text-sm text-destructive">{formState.errors.name.message}</p>}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Value</Label>
              <Input type="number" {...register("value")} placeholder="10000" />
            </div>
            <div className="space-y-1.5">
              <Label>Currency</Label>
              <Input {...register("currency")} placeholder="USD" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Owner</Label>
            <Controller
              control={control}
              name="ownerId"
              render={({ field }) => (
                <UserSelect value={field.value} onChange={field.onChange} placeholder="Select an owner" />
              )}
            />
            {formState.errors.ownerId && <p className="text-sm text-destructive">{formState.errors.ownerId.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Stage</Label>
            <Controller
              control={control}
              name="stage"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["QUALIFICATION", "PROPOSAL", "NEGOTIATION", "WON", "LOST"].map((s) => (
                      <SelectItem key={s} value={s}>
                        {s.charAt(0) + s.slice(1).toLowerCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
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
              {mutation.isPending ? "Creating..." : "Create deal"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
