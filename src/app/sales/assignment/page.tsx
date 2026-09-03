"use client";

import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { Plus, ShieldAlert } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AssignmentSettings } from "@/components/sales/AssignmentSettings";
import { AssignmentRuleList } from "@/components/sales/AssignmentRuleList";
import { AssignmentRuleForm } from "@/components/sales/AssignmentRuleForm";
import { listAssignmentRules } from "@/lib/api/assignment";

function RulesPanel() {
  const rulesQuery = useQuery({
    queryKey: ["assignment-rules"],
    queryFn: () => listAssignmentRules(),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Rules route specific leads (by source or Meta campaign) to a team and strategy, evaluated by priority.
        </p>
        <AssignmentRuleForm
          trigger={
            <Button size="sm">
              <Plus className="size-3.5" /> Add rule
            </Button>
          }
        />
      </div>
      {rulesQuery.isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : rulesQuery.isError ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <p className="text-sm text-muted-foreground">Failed to load assignment rules.</p>
            <Button variant="outline" size="sm" onClick={() => rulesQuery.refetch()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : (
        <AssignmentRuleList rules={rulesQuery.data?.rules ?? []} />
      )}
    </div>
  );
}

export default function AssignmentPage() {
  const { data: session } = useSession();
  const canManage = session?.user?.role === "ADMIN" || session?.user?.role === "SALES_MANAGER";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Assignment</h1>
        <p className="text-sm text-muted-foreground">
          Configure how leads are automatically routed to your sales team.
        </p>
      </div>

      {!canManage ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-16 text-center">
            <ShieldAlert className="size-8 text-muted-foreground" />
            <p className="text-sm font-medium">Manager access required</p>
            <p className="text-sm text-muted-foreground">
              Assignment settings and rules can only be viewed and changed by admins and sales managers.
            </p>
          </CardContent>
        </Card>
      ) : (
      <Tabs defaultValue="settings">
        <TabsList>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="rules">Rules</TabsTrigger>
        </TabsList>
        <TabsContent value="settings" className="pt-4">
          <AssignmentSettings />
        </TabsContent>
        <TabsContent value="rules" className="pt-4">
          <RulesPanel />
        </TabsContent>
      </Tabs>
      )}
    </div>
  );
}
