"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Server, Workflow, FileText, AlertCircle, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function DashboardOverview() {
  const { data: instances, isLoading: instancesLoading } = useQuery({
    queryKey: ["instances"],
    queryFn: async () => {
      const res = await fetch("/api/instances");
      if (!res.ok) throw new Error("Failed to fetch instances");
      return res.json();
    },
  });

  const { data: workflows, isLoading: workflowsLoading } = useQuery({
    queryKey: ["workflows"],
    queryFn: async () => {
      const res = await fetch("/api/workflows");
      if (!res.ok) throw new Error("Failed to fetch workflows");
      return res.json();
    },
  });

  const { data: executions, isLoading: executionsLoading } = useQuery({
    queryKey: ["executions", "recent"],
    queryFn: async () => {
      const res = await fetch("/api/executions?limit=10");
      if (!res.ok) throw new Error("Failed to fetch executions");
      return res.json();
    },
  });

  if (instancesLoading || workflowsLoading || executionsLoading) {
    return (
      <div className="text-muted-foreground">Loading dashboard data...</div>
    );
  }

  const stats = {
    instances: instances?.instances?.length || 0,
    activeInstances: instances?.instances?.filter((i: any) => i.isActive).length || 0,
    workflows: workflows?.workflows?.length || 0,
    activeWorkflows: workflows?.workflows?.filter((w: any) => w.isActive).length || 0,
    totalExecutions: executions?.executions?.length || 0,
    failedExecutions: executions?.executions?.filter((e: any) => e.status === "error").length || 0,
    recentExecutions: executions?.executions?.slice(0, 5) || [],
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Instances</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.instances}</div>
            <p className="text-xs text-muted-foreground">
              {stats.activeInstances} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Workflows</CardTitle>
            <Workflow className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.workflows}</div>
            <p className="text-xs text-muted-foreground">
              {stats.activeWorkflows} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Executions</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalExecutions}</div>
            <p className="text-xs text-muted-foreground">
              Recent executions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed Executions</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {stats.failedExecutions}
            </div>
            <p className="text-xs text-muted-foreground">
              Require attention
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Executions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Executions</CardTitle>
              <CardDescription>
                Latest workflow executions across all instances
              </CardDescription>
            </div>
            <Button variant="outline" asChild>
              <Link href="/executions">View All</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {stats.recentExecutions.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No executions yet. Workflows will appear here once they start running.
            </p>
          ) : (
            <div className="space-y-2">
              {stats.recentExecutions.map((execution: any) => (
                <div
                  key={execution.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {execution.workflow?.name || "Unknown Workflow"}
                      </span>
                      <Badge
                        variant={
                          execution.status === "success"
                            ? "default"
                            : execution.status === "error"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {execution.status}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {execution.instance?.name} •{" "}
                      {new Date(execution.startedAt).toLocaleString()}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/executions/${execution.id}`}>View</Link>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Instances</CardTitle>
            <CardDescription>Manage your n8n instances</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/instances">Manage Instances</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Workflows</CardTitle>
            <CardDescription>Monitor and control workflows</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full" variant="outline">
              <Link href="/workflows">View Workflows</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Executions</CardTitle>
            <CardDescription>View execution logs</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full" variant="outline">
              <Link href="/executions">View Executions</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


