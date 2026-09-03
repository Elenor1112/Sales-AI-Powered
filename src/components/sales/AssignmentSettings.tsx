"use client";

import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { getAssignmentSettings, updateAssignmentSettings } from "@/lib/api/assignment";
import { listTeams } from "@/lib/api/sales-teams";
import { ClientApiError } from "@/lib/api/client";

const schema = z.object({
  automaticAssignmentEnabled: z.boolean(),
  defaultStrategy: z.enum(["ROUND_ROBIN", "LEAST_ASSIGNED", "WEIGHTED_ROUND_ROBIN", "MANUAL"]),
  defaultTeamId: z.string().nullable(),
  enforceCapacity: z.boolean(),
  notifyAssignedUser: z.boolean(),
  notifyManagersOnUnassigned: z.boolean(),
  fallbackBehavior: z.enum(["UNASSIGNED_QUEUE", "DEFAULT_TEAM"]),
});

type FormValues = z.infer<typeof schema>;

export function AssignmentSettings() {
  const queryClient = useQueryClient();

  const settingsQuery = useQuery({
    queryKey: ["assignment-settings"],
    queryFn: () => getAssignmentSettings(),
  });

  const teamsQuery = useQuery({
    queryKey: ["teams"],
    queryFn: () => listTeams(),
  });

  const { control, handleSubmit, reset, watch } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      automaticAssignmentEnabled: true,
      defaultStrategy: "ROUND_ROBIN",
      defaultTeamId: null,
      enforceCapacity: true,
      notifyAssignedUser: true,
      notifyManagersOnUnassigned: true,
      fallbackBehavior: "UNASSIGNED_QUEUE",
    },
  });

  useEffect(() => {
    if (settingsQuery.data?.settings) {
      const s = settingsQuery.data.settings;
      reset({
        automaticAssignmentEnabled: s.automaticAssignmentEnabled,
        defaultStrategy: s.defaultStrategy,
        defaultTeamId: s.defaultTeamId,
        enforceCapacity: s.enforceCapacity,
        notifyAssignedUser: s.notifyAssignedUser,
        notifyManagersOnUnassigned: s.notifyManagersOnUnassigned,
        fallbackBehavior: s.fallbackBehavior,
      });
    }
  }, [settingsQuery.data, reset]);

  const mutation = useMutation({
    mutationFn: (values: FormValues) => updateAssignmentSettings(values),
    onSuccess: () => {
      toast.success("Assignment settings saved");
      queryClient.invalidateQueries({ queryKey: ["assignment-settings"] });
    },
    onError: (error) => {
      toast.error(error instanceof ClientApiError ? error.message : "Failed to save settings");
    },
  });

  const automaticEnabled = watch("automaticAssignmentEnabled");

  if (settingsQuery.isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  if (settingsQuery.isError) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <p className="text-sm text-muted-foreground">Failed to load assignment settings.</p>
          <Button variant="outline" size="sm" onClick={() => settingsQuery.refetch()}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit((values) => mutation.mutate(values))}>
      <Card>
        <CardHeader>
          <CardTitle>Assignment settings</CardTitle>
          <CardDescription>Control how new leads are automatically routed to your sales team.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <Label>Automatic assignment</Label>
              <p className="text-sm text-muted-foreground">Automatically route new leads to salespeople.</p>
            </div>
            <Controller
              control={control}
              name="automaticAssignmentEnabled"
              render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Default strategy</Label>
              <Controller
                control={control}
                name="defaultStrategy"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange} disabled={!automaticEnabled}>
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

            <div className="space-y-1.5">
              <Label>Default team</Label>
              <Controller
                control={control}
                name="defaultTeamId"
                render={({ field }) => (
                  <Select
                    value={field.value ?? "none"}
                    onValueChange={(v) => field.onChange(v === "none" ? null : v)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="No default team" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No default team</SelectItem>
                      {teamsQuery.data?.teams.map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Enforce capacity limits</Label>
              <p className="text-sm text-muted-foreground">Skip salespeople who are at their max active lead limit.</p>
            </div>
            <Controller
              control={control}
              name="enforceCapacity"
              render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Notify assigned user</Label>
              <p className="text-sm text-muted-foreground">Send a notification when a lead is assigned to someone.</p>
            </div>
            <Controller
              control={control}
              name="notifyAssignedUser"
              render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Notify managers on unassigned</Label>
              <p className="text-sm text-muted-foreground">Alert managers when a lead can&apos;t be automatically assigned.</p>
            </div>
            <Controller
              control={control}
              name="notifyManagersOnUnassigned"
              render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Fallback behavior</Label>
            <Controller
              control={control}
              name="fallbackBehavior"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full sm:w-64">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UNASSIGNED_QUEUE">Send to unassigned queue</SelectItem>
                    <SelectItem value="DEFAULT_TEAM">Assign to default team</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Saving..." : "Save settings"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
