"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FileText, ExternalLink, Filter, RefreshCw, LayoutGrid, List } from "lucide-react";
import Link from "next/link";
import { getStatusConfig } from "@/lib/utils/status";
import { useAutoSync } from "@/lib/hooks/use-auto-sync";
import { Button } from "@/components/ui/button";

export default function ExecutionsPage() {
  const [selectedInstance, setSelectedInstance] = useState<string>("all");
  const [selectedWorkflow, setSelectedWorkflow] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const queryClient = useQueryClient();

  // Auto-sync executions every 5 minutes
  const { triggerManualSync } = useAutoSync({
    enabled: selectedInstance !== "all",
    interval: 5 * 60 * 1000, // 5 minutes
    instanceId: selectedInstance,
  });

  const { data: instances } = useQuery({
    queryKey: ["instances"],
    queryFn: async () => {
      const res = await fetch("/api/instances");
      if (!res.ok) throw new Error("Failed to fetch instances");
      return res.json();
    },
  });

  const { data: workflows } = useQuery({
    queryKey: ["workflows", selectedInstance],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedInstance !== "all") {
        params.append("instanceId", selectedInstance);
      }
      const res = await fetch(`/api/workflows?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch workflows");
      return res.json();
    },
    enabled: selectedInstance !== "all",
  });

  const { data: executions, isLoading } = useQuery({
    queryKey: ["executions", selectedInstance, selectedWorkflow, selectedStatus],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedInstance !== "all") {
        params.append("instanceId", selectedInstance);
      }
      if (selectedWorkflow !== "all") {
        params.append("workflowId", selectedWorkflow);
      }
      if (selectedStatus !== "all") {
        params.append("status", selectedStatus);
      }
      params.append("limit", "100");
      const res = await fetch(`/api/executions?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch executions");
      return res.json();
    },
  });

  const syncExecutions = useMutation({
    mutationFn: async (instanceId: string) => {
      const res = await fetch("/api/executions/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instanceId, limit: 100 }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to sync executions");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["executions"] });
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
    },
  });

  const getStatusBadge = (status: string) => {
    const config = getStatusConfig(status);
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <p className="text-muted-foreground">Loading executions...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Execution Logs</h1>
          <p className="text-muted-foreground mt-2">
            View and monitor workflow executions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === "table" ? "default" : "outline"}
            size="icon"
            onClick={() => setViewMode("table")}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "cards" ? "default" : "outline"}
            size="icon"
            onClick={() => setViewMode("cards")}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm">Filters</CardTitle>
          </div>
          <CardDescription>Scope executions by instance, workflow, status</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4 items-center">
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

        <Select value={selectedWorkflow} onValueChange={setSelectedWorkflow}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by workflow" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Workflows</SelectItem>
            {workflows?.workflows?.map((workflow: any) => (
              <SelectItem key={workflow.id} value={workflow.id}>
                {workflow.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="success">Success</SelectItem>
            <SelectItem value="error">Error</SelectItem>
            <SelectItem value="running">Running</SelectItem>
            <SelectItem value="waiting">Waiting</SelectItem>
            <SelectItem value="canceled">Canceled</SelectItem>
          </SelectContent>
        </Select>
          {selectedInstance !== "all" && (
            <Button
              variant="outline"
              onClick={() => syncExecutions.mutate(selectedInstance)}
              disabled={syncExecutions.isPending}
              className="ml-auto"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${syncExecutions.isPending ? "animate-spin" : ""}`} />
              Sync executions
            </Button>
          )}
        </CardContent>
      </Card>

      {executions?.executions?.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No executions found</h3>
            <p className="text-muted-foreground">
              Executions will appear here once workflows start running
            </p>
          </CardContent>
        </Card>
      ) : viewMode === "table" ? (
        <Card>
          <CardHeader>
            <CardTitle>Executions</CardTitle>
            <CardDescription>
              {executions?.executions?.length || 0} execution(s) found
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Workflow</TableHead>
                  <TableHead>Instance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Finished</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {executions?.executions?.map((execution: any) => (
                  <ExecutionRow key={execution.id} execution={execution} />
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {executions?.executions?.map((execution: any) => (
            <ExecutionCard key={execution.id} execution={execution} />
          ))}
        </div>
      )}
    </div>
  );
}

function ExecutionRow({ execution }: { execution: any }) {
  const duration = execution.finishedAt
    ? Math.round(
        (new Date(execution.finishedAt).getTime() -
          new Date(execution.startedAt).getTime()) /
          1000
      )
    : null;

  const badge = (
    <Badge
      variant={
        execution.status === "error"
          ? "destructive"
          : execution.status === "success"
          ? "default"
          : "secondary"
      }
    >
      {execution.status?.toUpperCase()}
    </Badge>
  );

  return (
    <TableRow>
      <TableCell>{execution.workflow?.name || "Unknown"}</TableCell>
      <TableCell>{execution.instance?.name || "Unknown"}</TableCell>
      <TableCell>{badge}</TableCell>
      <TableCell>{new Date(execution.startedAt).toLocaleString()}</TableCell>
      <TableCell>
        {execution.finishedAt
          ? new Date(execution.finishedAt).toLocaleString()
          : "-"}
      </TableCell>
      <TableCell>
        {duration !== null
          ? `${duration}s`
          : execution.status === "running"
          ? "Running..."
          : "-"}
      </TableCell>
      <TableCell>
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/executions/${execution.id}`}>
            <ExternalLink className="h-4 w-4" />
          </Link>
        </Button>
      </TableCell>
    </TableRow>
  );
}

function ExecutionCard({ execution }: { execution: any }) {
  const duration = execution.finishedAt
    ? Math.round(
        (new Date(execution.finishedAt).getTime() -
          new Date(execution.startedAt).getTime()) /
          1000
      )
    : null;

  const badge = (
    <Badge
      variant={
        execution.status === "error"
          ? "destructive"
          : execution.status === "success"
          ? "default"
          : "secondary"
      }
    >
      {execution.status?.toUpperCase()}
    </Badge>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          <span>{execution.workflow?.name || "Unknown workflow"}</span>
          {badge}
        </CardTitle>
        <CardDescription>{execution.instance?.name || "Unknown instance"}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Started</span>
          <span>{new Date(execution.startedAt).toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Finished</span>
          <span>
            {execution.finishedAt
              ? new Date(execution.finishedAt).toLocaleString()
              : "-"}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Duration</span>
          <span>
            {duration !== null
              ? `${duration}s`
              : execution.status === "running"
              ? "Running..."
              : "-"}
          </span>
        </div>
        <div className="pt-2">
          <Button variant="outline" size="sm" asChild className="w-full">
            <Link href={`/executions/${execution.id}`}>
              <ExternalLink className="h-4 w-4 mr-2" />
              View details
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}


