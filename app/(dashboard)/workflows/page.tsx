"use client";

import { useMemo, useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAutoSync } from "@/lib/hooks/use-auto-sync";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Workflow, RefreshCw, LayoutGrid, List, Filter } from "lucide-react";
import Link from "next/link";
import { getStatusConfig } from "@/lib/utils/status";

export default function WorkflowsPage() {
  const [selectedInstance, setSelectedInstance] = useState<string>("all");
  const [showActive, setShowActive] = useState<"all" | "active" | "inactive">("all");
  const [showErrorsOnly, setShowErrorsOnly] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: instances } = useQuery({
    queryKey: ["instances"],
    queryFn: async () => {
      const res = await fetch("/api/instances");
      if (!res.ok) throw new Error("Failed to fetch instances");
      return res.json();
    },
  });

  const { data: workflows, isLoading } = useQuery({
    queryKey: ["workflows", selectedInstance, showActive, showErrorsOnly],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedInstance !== "all") {
        params.append("instanceId", selectedInstance);
      }
      if (showActive === "active") params.append("active", "true");
      if (showActive === "inactive") params.append("active", "false");
      if (showErrorsOnly) params.append("hasRecentErrors", "true");
      const res = await fetch(`/api/workflows?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch workflows");
      return res.json();
    },
  });

  const syncMutation = useMutation({
    mutationFn: async (instanceId: string) => {
      const res = await fetch("/api/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instanceId }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to sync workflows");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Workflows synced",
        description: `Synced ${data.count} workflows`,
      });
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
      queryClient.invalidateQueries({ queryKey: ["instances"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async (workflowId: string) => {
      const res = await fetch(`/api/workflows/${workflowId}/toggle`, {
        method: "POST",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to toggle workflow");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: data.message,
        description: `Workflow ${data.workflow.isActive ? "activated" : "deactivated"}`,
      });
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSync = async (instanceId: string) => {
    await triggerManualSync();
    syncMutation.mutate(instanceId);
  };

  const filteredWorkflows = useMemo(() => workflows?.workflows || [], [workflows]);

  const paginatedWorkflows = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return filteredWorkflows.slice(start, end);
  }, [filteredWorkflows, currentPage]);

  const totalPages = Math.ceil(filteredWorkflows.length / itemsPerPage);

  // Auto-sync workflows and executions every 5 minutes
  const { triggerManualSync } = useAutoSync({
    enabled: selectedInstance !== "all",
    interval: 5 * 60 * 1000, // 5 minutes
    instanceId: selectedInstance,
  });

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedInstance, showActive, showErrorsOnly]);

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <p className="text-muted-foreground">Loading workflows...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Workflows</h1>
          <p className="text-muted-foreground mt-2">
            Monitor and manage your n8n workflows
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedInstance} onValueChange={setSelectedInstance}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by instance" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Instances</SelectItem>
              {instances?.instances?.map((instance: any) => (
                <SelectItem key={instance.id} value={instance.id}>
                  {instance.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedInstance !== "all" && (
            <Button
              onClick={() => handleSync(selectedInstance)}
              disabled={syncMutation.isPending}
              variant="outline"
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${syncMutation.isPending ? "animate-spin" : ""}`}
              />
              Sync
            </Button>
          )}
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === "grid" ? "default" : "outline"}
              size="icon"
              onClick={() => setViewMode("grid")}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "outline"}
              size="icon"
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm">Filters</CardTitle>
          </div>
          <CardDescription>Refine workflows by status and errors</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <Label className="text-sm">Active state</Label>
            <Select value={showActive} onValueChange={(v) => setShowActive(v as any)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-3">
            <Switch
              id="errors-only"
              checked={showErrorsOnly}
              onCheckedChange={setShowErrorsOnly}
            />
            <Label htmlFor="errors-only" className="text-sm">
              Recently errored only
            </Label>
          </div>
          {selectedInstance !== "all" && (
            <Button
              onClick={() => handleSync(selectedInstance)}
              disabled={syncMutation.isPending}
              variant="outline"
              className="ml-auto"
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${syncMutation.isPending ? "animate-spin" : ""}`}
              />
              Sync workflows
            </Button>
          )}
        </CardContent>
      </Card>

      {filteredWorkflows?.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Workflow className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No workflows found</h3>
            <p className="text-muted-foreground mb-4">
              {selectedInstance !== "all"
                ? "Sync workflows from your n8n instance"
                : "Add an n8n instance and sync workflows to get started"}
            </p>
            {selectedInstance !== "all" && (
              <Button onClick={() => handleSync(selectedInstance)}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Sync Workflows
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {viewMode === "grid" ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {paginatedWorkflows?.map((workflow: any) => (
                <WorkflowCard
                  key={workflow.id}
                  workflow={workflow}
                  onToggle={() => toggleMutation.mutate(workflow.id)}
                  onSync={() => handleSync(workflow.instanceId)}
                  syncing={syncMutation.isPending}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {paginatedWorkflows?.map((workflow: any) => (
                <WorkflowRow
                  key={workflow.id}
                  workflow={workflow}
                  onToggle={() => toggleMutation.mutate(workflow.id)}
                  onSync={() => handleSync(workflow.instanceId)}
                  syncing={syncMutation.isPending}
                />
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function statusBadge(isActive: boolean) {
  return (
    <Badge variant={isActive ? "default" : "secondary"}>
      {isActive ? "Active" : "Inactive"}
    </Badge>
  );
}

function lastExecStatus(executions: any[]) {
  const last = executions?.[0];
  if (!last) return <Badge variant="secondary">No runs</Badge>;
  const config = getStatusConfig(last.status);
  const Icon = config.icon;
  return (
    <Badge variant={config.variant} className="gap-1">
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}

function WorkflowCard({
  workflow,
  onToggle,
  onSync,
  syncing,
}: {
  workflow: any;
  onToggle: () => void;
  onSync: () => void;
  syncing: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2">
              <Workflow className="h-5 w-5" />
              {workflow.name}
            </CardTitle>
            <CardDescription className="mt-1">
              {workflow.instance?.name}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {statusBadge(workflow.isActive)}
            {lastExecStatus(workflow.executions)}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Executions</span>
          <span className="font-medium">{workflow._count?.executions || 0}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Last run</span>
          <span className="font-medium">
            {workflow.executions?.[0]?.startedAt
              ? new Date(workflow.executions[0].startedAt).toLocaleString()
              : "—"}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Last sync</span>
          <span className="font-medium">
            {workflow.lastSync
              ? new Date(workflow.lastSync).toLocaleString()
              : "Never"}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Switch
              checked={workflow.isActive}
              onCheckedChange={onToggle}
              aria-label="Toggle workflow"
            />
            <span className="text-sm text-muted-foreground">
              {workflow.isActive ? "Disable" : "Enable"}
            </span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/workflows/${workflow.id}`}>View</Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onSync}
              disabled={syncing}
            >
              <RefreshCw
                className={`h-4 w-4 mr-1 ${syncing ? "animate-spin" : ""}`}
              />
              Sync
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function WorkflowRow({
  workflow,
  onToggle,
  onSync,
  syncing,
}: {
  workflow: any;
  onToggle: () => void;
  onSync: () => void;
  syncing: boolean;
}) {
  return (
    <Card>
      <CardContent className="py-4 flex flex-wrap items-center gap-3 justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Workflow className="h-5 w-5" />
            <span className="font-semibold">{workflow.name}</span>
          </div>
          <div className="text-sm text-muted-foreground">
            {workflow.instance?.name}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {statusBadge(workflow.isActive)}
          {lastExecStatus(workflow.executions)}
          <Badge variant="secondary">
            {workflow._count?.executions || 0} runs
          </Badge>
        </div>
        <div className="text-sm text-muted-foreground">
          Last run:{" "}
          {workflow.executions?.[0]?.startedAt
            ? new Date(workflow.executions[0].startedAt).toLocaleString()
            : "—"}
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={workflow.isActive} onCheckedChange={onToggle} />
          <Button variant="outline" size="sm" asChild>
            <Link href={`/workflows/${workflow.id}`}>View</Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onSync}
            disabled={syncing}
          >
            <RefreshCw
              className={`h-4 w-4 mr-1 ${syncing ? "animate-spin" : ""}`}
            />
            Sync
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

