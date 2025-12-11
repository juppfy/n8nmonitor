"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Workflow,
  ArrowLeft,
  Clock,
  Activity,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Server,
  RefreshCw,
  Eye,
  GitBranch,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import Link from "next/link";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, Legend } from "recharts";

export default function WorkflowDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const workflowId = params.id as string;

  const { data, isLoading } = useQuery({
    queryKey: ["workflow", workflowId],
    queryFn: async () => {
      const res = await fetch(`/api/workflows/${workflowId}`);
      if (!res.ok) throw new Error("Failed to fetch workflow");
      return res.json();
    },
  });

  const { data: executionsData } = useQuery({
    queryKey: ["workflow-executions", workflowId],
    queryFn: async () => {
      const res = await fetch(`/api/executions?workflowId=${workflowId}&limit=100`);
      if (!res.ok) throw new Error("Failed to fetch executions");
      return res.json();
    },
  });

  const { data: nodesData } = useQuery({
    queryKey: ["workflow-nodes", workflowId],
    queryFn: async () => {
      const res = await fetch(`/api/workflows/${workflowId}/nodes`);
      if (!res.ok) throw new Error("Failed to fetch workflow nodes");
      return res.json();
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async () => {
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
      queryClient.invalidateQueries({ queryKey: ["workflow", workflowId] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/executions/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instanceId: data?.workflow?.instance?.id }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to sync executions");
      }
      return res.json();
    },
    onSuccess: (result) => {
      toast({
        title: "Executions synced",
        description: `Synced ${result.count} executions`,
      });
      queryClient.invalidateQueries({ queryKey: ["workflow-executions", workflowId] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <p className="text-muted-foreground">Loading workflow details...</p>
      </div>
    );
  }

  const workflow = data?.workflow;
  const executions = executionsData?.executions || [];

  if (!workflow) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Workflow not found</h3>
            <Button asChild className="mt-4">
              <Link href="/workflows">Back to Workflows</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculate execution stats
  const stats = {
    total: executions.length,
    success: executions.filter((e: any) => e.status === "success").length,
    error: executions.filter((e: any) => e.status === "error").length,
    running: executions.filter((e: any) => e.status === "running").length,
    waiting: executions.filter((e: any) => e.status === "waiting").length,
  };

  const pieData = [
    { name: "Success", value: stats.success, color: "#22c55e" },
    { name: "Error", value: stats.error, color: "#ef4444" },
    { name: "Running", value: stats.running, color: "#3b82f6" },
    { name: "Waiting", value: stats.waiting, color: "#f59e0b" },
  ].filter((item) => item.value > 0);

  const recentExecutions = executions.slice(0, 10);
  const lastExecution = executions[0];

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: any; icon: any; label: string }> = {
      success: {
        variant: "default",
        icon: CheckCircle2,
        label: "Success",
      },
      error: {
        variant: "destructive",
        icon: XCircle,
        label: "Error",
      },
      running: {
        variant: "outline",
        icon: Activity,
        label: "Running",
      },
      waiting: {
        variant: "secondary",
        icon: Clock,
        label: "Waiting",
      },
    };

    const statusConfig = config[status] || config.waiting;
    const Icon = statusConfig.icon;

    return (
      <Badge variant={statusConfig.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {statusConfig.label}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/workflows">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Workflows
          </Link>
        </Button>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Workflow className="h-8 w-8" />
              {workflow.name}
            </h1>
            <p className="text-muted-foreground mt-2 flex items-center gap-2">
              <Server className="h-4 w-4" />
              {workflow.instance?.name}
            </p>
          </div>
          <div className="flex gap-2">
            {getStatusBadge(workflow.isActive ? "success" : "waiting")}
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Eye className="h-4 w-4 mr-2" />
                  View Nodes
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Workflow Nodes</DialogTitle>
                  <DialogDescription>
                    Nodes and connections in {workflow.name}
                  </DialogDescription>
                </DialogHeader>
                <WorkflowNodesView nodes={nodesData?.nodes || []} connections={nodesData?.connections || {}} />
              </DialogContent>
            </Dialog>
            <Button
              variant="outline"
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending}
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${syncMutation.isPending ? "animate-spin" : ""}`}
              />
              Sync Executions
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Executions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Successful
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.success}</div>
            {stats.total > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {((stats.success / stats.total) * 100).toFixed(1)}% success rate
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Failed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.error}</div>
            {stats.total > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {((stats.error / stats.total) * 100).toFixed(1)}% error rate
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Last Execution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lastExecution ? (
              <>
                <div className="text-sm font-medium">
                  {new Date(lastExecution.startedAt).toLocaleDateString()}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(lastExecution.startedAt).toLocaleTimeString()}
                </p>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">No executions yet</div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Execution Status Distribution</CardTitle>
            <CardDescription>
              Visual breakdown of execution statuses (last {stats.total} runs)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${name}: ${(percent * 100).toFixed(0)}%`
                    }
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No execution data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Workflow Controls</CardTitle>
            <CardDescription>Manage workflow activation state</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <Label className="text-base font-semibold">
                  Workflow Status
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  {workflow.isActive
                    ? "Workflow is currently active and running"
                    : "Workflow is currently inactive"}
                </p>
              </div>
              <Switch
                checked={workflow.isActive}
                onCheckedChange={() => toggleMutation.mutate()}
                disabled={toggleMutation.isPending}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Quick Info</Label>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="p-2 bg-muted rounded">
                  <div className="text-muted-foreground">Workflow ID</div>
                  <div className="font-mono text-xs mt-1 truncate">
                    {workflow.n8nWorkflowId}
                  </div>
                </div>
                <div className="p-2 bg-muted rounded">
                  <div className="text-muted-foreground">Last Synced</div>
                  <div className="font-medium text-xs mt-1">
                    {workflow.lastSync
                      ? new Date(workflow.lastSync).toLocaleString()
                      : "Never"}
                  </div>
                </div>
              </div>
            </div>

            <Button className="w-full" asChild>
              <Link href={`/executions?workflowId=${workflow.id}`}>
                View All Executions
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Executions</CardTitle>
          <CardDescription>
            Last {recentExecutions.length} execution runs for this workflow
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentExecutions.length > 0 ? (
            <div className="space-y-2">
              {recentExecutions.map((execution: any) => (
                <Link
                  key={execution.id}
                  href={`/executions/${execution.id}`}
                  className="block"
                >
                  <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      {getStatusBadge(execution.status)}
                      <div>
                        <div className="text-sm font-medium">
                          {new Date(execution.startedAt).toLocaleString()}
                        </div>
                        {execution.finishedAt && (
                          <div className="text-xs text-muted-foreground">
                            Duration:{" "}
                            {Math.round(
                              (new Date(execution.finishedAt).getTime() -
                                new Date(execution.startedAt).getTime()) /
                                1000
                            )}
                            s
                          </div>
                        )}
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      View Details
                    </Button>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No executions found for this workflow
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function WorkflowNodesView({ nodes, connections }: { nodes: any[]; connections: any }) {
  if (!nodes || nodes.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No nodes data available
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3">
        {nodes.map((node: any, idx: number) => {
          const outgoing = Object.keys(connections[node.name] || {}).length;
          return (
            <Card key={idx} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <GitBranch className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-semibold">{node.name}</div>
                    <div className="text-sm text-muted-foreground">
                      Type: {node.type}
                    </div>
                  </div>
                </div>
                <Badge variant="outline">
                  {outgoing} connection{outgoing !== 1 ? "s" : ""}
                </Badge>
              </div>
              {node.parameters && Object.keys(node.parameters).length > 0 && (
                <div className="mt-3 pt-3 border-t">
                  <div className="text-xs text-muted-foreground mb-2">Parameters:</div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {Object.entries(node.parameters).slice(0, 4).map(([key, value]: any) => (
                      <div key={key} className="p-2 bg-muted rounded">
                        <span className="font-medium">{key}:</span>{" "}
                        <span className="text-muted-foreground">
                          {typeof value === "object" ? "..." : String(value).slice(0, 30)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
      <div className="p-4 bg-muted rounded-lg">
        <div className="text-sm font-medium mb-2">Workflow Summary</div>
        <div className="text-sm text-muted-foreground">
          Total nodes: {nodes.length} | 
          Connections: {Object.keys(connections).length}
        </div>
      </div>
    </div>
  );
}

