"use client";

import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

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
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createAssignmentRule, updateAssignmentRule } from "@/lib/api/assignment";
import { listTeams } from "@/lib/api/sales-teams";
import { ClientApiError } from "@/lib/api/client";
import type { AssignmentRuleWithTeam } from "@/types/assignment";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  priority: z.number().int().min(0),
  teamId: z.string().min(1, "Team is required"),
  strategy: z.enum(["ROUND_ROBIN", "LEAST_ASSIGNED", "WEIGHTED_ROUND_ROBIN", "MANUAL"]),
  isActive: z.boolean(),
  source: z.string().optional(),
  metaPageId: z.string().optional(),
  metaFormId: z.string().optional(),
  metaCampaignId: z.string().optional(),
  metaAdSetId: z.string().optional(),
  metaAdId: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const SOURCE_OPTIONS = ["META", "FACEBOOK", "INSTAGRAM", "WEBSITE", "MANUAL", "OTHER"];

function toFormValues(rule?: AssignmentRuleWithTeam): FormValues {
  return {
    name: rule?.name ?? "",
    priority: rule?.priority ?? 0,
    teamId: rule?.teamId ?? "",
    strategy: rule?.strategy ?? "ROUND_ROBIN",
    isActive: rule?.isActive ?? true,
    source: rule?.source ?? undefined,
    metaPageId: rule?.metaPageId ?? "",
    metaFormId: rule?.metaFormId ?? "",
    metaCampaignId: rule?.metaCampaignId ?? "",
    metaAdSetId: rule?.metaAdSetId ?? "",
    metaAdId: rule?.metaAdId ?? "",
  };
}

export function AssignmentRuleForm({
  rule,
  trigger,
}: {
  rule?: AssignmentRuleWithTeam;
  trigger: React.ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const isEdit = !!rule;

  const teamsQuery = useQuery({ queryKey: ["teams"], queryFn: () => listTeams() });

  const { control, handleSubmit, reset, register, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: toFormValues(rule),
  });

  useEffect(() => {
    if (open) reset(toFormValues(rule));
  }, [open, rule, reset]);

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const payload = {
        ...values,
        source: values.source || undefined,
        metaPageId: values.metaPageId || undefined,
        metaFormId: values.metaFormId || undefined,
        metaCampaignId: values.metaCampaignId || undefined,
        metaAdSetId: values.metaAdSetId || undefined,
        metaAdId: values.metaAdId || undefined,
      };
      return isEdit ? updateAssignmentRule(rule!.id, payload) : createAssignmentRule(payload);
    },
    onSuccess: () => {
      toast.success(isEdit ? "Rule updated" : "Rule created");
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["assignment-rules"] });
    },
    onError: (error) => {
      toast.error(error instanceof ClientApiError ? error.message : "Failed to save rule");
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit assignment rule" : "New assignment rule"}</DialogTitle>
          <DialogDescription>
            Rules are evaluated in priority order (lower runs first) and route matching leads to a team and strategy.
          </DialogDescription>
        </DialogHeader>
        <form
          className="max-h-[70vh] space-y-4 overflow-y-auto pr-1"
          onSubmit={handleSubmit((values) => mutation.mutate(values))}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input {...register("name")} placeholder="e.g. Facebook leads to Team A" />
              {formState.errors.name && <p className="text-sm text-destructive">{formState.errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Input type="number" {...register("priority", { valueAsNumber: true })} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Team</Label>
              <Controller
                control={control}
                name="teamId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a team" />
                    </SelectTrigger>
                    <SelectContent>
                      {teamsQuery.data?.teams.map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {formState.errors.teamId && <p className="text-sm text-destructive">{formState.errors.teamId.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Strategy</Label>
              <Controller
                control={control}
                name="strategy"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ROUND_ROBIN">Round robin</SelectItem>
                      <SelectItem value="LEAST_ASSIGNED">Least assigned</SelectItem>
                      <SelectItem value="WEIGHTED_ROUND_ROBIN">Weighted round robin</SelectItem>
                      <SelectItem value="MANUAL">Manual</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Label>Active</Label>
            <Controller
              control={control}
              name="isActive"
              render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Source (optional)</Label>
            <Controller
              control={control}
              name="source"
              render={({ field }) => (
                <Select value={field.value ?? "any"} onValueChange={(v) => field.onChange(v === "any" ? undefined : v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Any source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any source</SelectItem>
                    {SOURCE_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Meta page ID</Label>
              <Input {...register("metaPageId")} placeholder="Optional" />
            </div>
            <div className="space-y-1.5">
              <Label>Meta form ID</Label>
              <Input {...register("metaFormId")} placeholder="Optional" />
            </div>
            <div className="space-y-1.5">
              <Label>Meta campaign ID</Label>
              <Input {...register("metaCampaignId")} placeholder="Optional" />
            </div>
            <div className="space-y-1.5">
              <Label>Meta ad set ID</Label>
              <Input {...register("metaAdSetId")} placeholder="Optional" />
            </div>
            <div className="space-y-1.5">
              <Label>Meta ad ID</Label>
              <Input {...register("metaAdId")} placeholder="Optional" />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving..." : isEdit ? "Save changes" : "Create rule"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
