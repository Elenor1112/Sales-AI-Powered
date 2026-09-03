"use client";

import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SalesTeamTable } from "@/components/sales/SalesTeamTable";
import { SalespersonWorkload } from "@/components/sales/SalespersonWorkload";
import { getWorkload } from "@/lib/api/assignment";
import { listTeams, listTeamMembers } from "@/lib/api/sales-teams";
import { NewTeamDialog } from "./new-team-dialog";
import { AddMemberDialog } from "./add-member-dialog";

function initials(name?: string | null) {
  if (!name) return "?";
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

function TeamMembersPanel({ teamId, canManage }: { teamId: string; canManage: boolean }) {
  const membersQuery = useQuery({
    queryKey: ["team-members", teamId],
    queryFn: () => listTeamMembers(teamId),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Members</CardTitle>
        {canManage && <AddMemberDialog teamId={teamId} />}
      </CardHeader>
      <CardContent>
        {membersQuery.isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : membersQuery.isError ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <p className="text-sm text-muted-foreground">Failed to load members.</p>
            <Button variant="outline" size="sm" onClick={() => membersQuery.refetch()}>
              Retry
            </Button>
          </div>
        ) : membersQuery.data?.members.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No members on this team yet.</p>
        ) : (
          <ul className="divide-y">
            {membersQuery.data?.members.map((member) => (
              <li key={member.id} className="flex items-center gap-3 py-2.5">
                <Avatar className="size-8">
                  <AvatarFallback className="text-xs">{initials(member.user.name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{member.user.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{member.user.email}</p>
                </div>
                {member.isPaused && (
                  <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                    Paused
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export default function TeamPage() {
  const { data: session } = useSession();
  const canManage = session?.user?.role === "ADMIN" || session?.user?.role === "SALES_MANAGER";

  const workloadQuery = useQuery({ queryKey: ["workload"], queryFn: () => getWorkload() });
  const teamsQuery = useQuery({ queryKey: ["teams"], queryFn: () => listTeams() });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Team</h1>
          <p className="text-sm text-muted-foreground">Manage sales teams, members, and workload.</p>
        </div>
        {canManage && <NewTeamDialog />}
      </div>

      <Tabs defaultValue="workload">
        <TabsList>
          <TabsTrigger value="workload">Workload</TabsTrigger>
          <TabsTrigger value="members">Members table</TabsTrigger>
          <TabsTrigger value="teams">Teams</TabsTrigger>
        </TabsList>

        <TabsContent value="workload" className="space-y-4 pt-4">
          {workloadQuery.isLoading ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-40 w-full" />
              ))}
            </div>
          ) : workloadQuery.isError ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
                <p className="text-sm text-muted-foreground">Failed to load workload.</p>
                <Button variant="outline" size="sm" onClick={() => workloadQuery.refetch()}>
                  Retry
                </Button>
              </CardContent>
            </Card>
          ) : (
            <SalespersonWorkload workload={workloadQuery.data?.workload ?? []} />
          )}
        </TabsContent>

        <TabsContent value="members" className="pt-4">
          {workloadQuery.isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : workloadQuery.isError ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
                <p className="text-sm text-muted-foreground">Failed to load team members.</p>
                <Button variant="outline" size="sm" onClick={() => workloadQuery.refetch()}>
                  Retry
                </Button>
              </CardContent>
            </Card>
          ) : (
            <SalesTeamTable workload={workloadQuery.data?.workload ?? []} canManage={canManage} />
          )}
        </TabsContent>

        <TabsContent value="teams" className="space-y-4 pt-4">
          {teamsQuery.isLoading ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-56 w-full" />
              ))}
            </div>
          ) : teamsQuery.isError ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
                <p className="text-sm text-muted-foreground">Failed to load teams.</p>
                <Button variant="outline" size="sm" onClick={() => teamsQuery.refetch()}>
                  Retry
                </Button>
              </CardContent>
            </Card>
          ) : teamsQuery.data?.teams.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
              <p className="text-sm font-medium">No teams yet</p>
              <p className="mt-1 text-sm text-muted-foreground">Create your first team to start organizing salespeople.</p>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {teamsQuery.data?.teams.map((team) => (
                <div key={team.id} className="space-y-2">
                  <div>
                    <h3 className="font-medium">{team.name}</h3>
                    {team.description && <p className="text-sm text-muted-foreground">{team.description}</p>}
                  </div>
                  <TeamMembersPanel teamId={team.id} canManage={canManage} />
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
