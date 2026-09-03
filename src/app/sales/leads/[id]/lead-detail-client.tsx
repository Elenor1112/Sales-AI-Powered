"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LeadProfile } from "@/components/sales/LeadProfile";
import { LeadAssignment } from "@/components/sales/LeadAssignment";
import { AssignmentHistory } from "@/components/sales/AssignmentHistory";
import { LeadActivityTimeline } from "@/components/sales/LeadActivityTimeline";
import { LeadNotes } from "@/components/sales/LeadNotes";
import { TaskList } from "@/components/sales/TaskList";
import { getLead, getLeadActivities, getLeadAssignmentHistory } from "@/lib/api/leads";

export function LeadDetailClient({ leadId }: { leadId: string }) {
  const leadQuery = useQuery({
    queryKey: ["lead", leadId],
    queryFn: () => getLead(leadId),
  });

  const activitiesQuery = useQuery({
    queryKey: ["lead-activities", leadId],
    queryFn: () => getLeadActivities(leadId),
  });

  const historyQuery = useQuery({
    queryKey: ["lead-assignment-history", leadId],
    queryFn: () => getLeadAssignmentHistory(leadId),
  });

  if (leadQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (leadQuery.isError || !leadQuery.data) {
    return (
      <Card className="glass-panel border-0">
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <p className="text-sm text-muted-foreground">Failed to load this lead.</p>
          <Button variant="outline" size="sm" onClick={() => leadQuery.refetch()}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const lead = leadQuery.data.lead;

  return (
    <div className="space-y-4">
      <Link href="/sales/leads" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
        <ArrowLeft className="size-3.5" /> Back to leads
      </Link>

      <LeadProfile lead={lead} />

      <Card className="glass-panel border-0">
        <CardHeader>
          <CardTitle className="text-base">Assignment</CardTitle>
        </CardHeader>
        <CardContent>
          <LeadAssignment lead={lead} activities={activitiesQuery.data?.activities} />
        </CardContent>
      </Card>

      <Tabs defaultValue="notes">
        <TabsList>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="history">Assignment history</TabsTrigger>
        </TabsList>
        <TabsContent value="notes" className="pt-4">
          <div className="glass-panel rounded-xl p-6">
            <LeadNotes leadId={lead.id} notes={lead.notes} />
          </div>
        </TabsContent>
        <TabsContent value="activity" className="pt-4">
          {activitiesQuery.isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <div className="glass-panel rounded-xl p-6">
              <LeadActivityTimeline activities={activitiesQuery.data?.activities ?? []} />
            </div>
          )}
        </TabsContent>
        <TabsContent value="tasks" className="pt-4">
          <TaskList leadId={lead.id} />
        </TabsContent>
        <TabsContent value="history" className="pt-4">
          {historyQuery.isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <AssignmentHistory history={historyQuery.data?.history ?? []} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
