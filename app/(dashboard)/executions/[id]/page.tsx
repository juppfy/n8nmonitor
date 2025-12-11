"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { getStatusConfig } from "@/lib/utils/status";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Clock3, Cpu, Activity, AlertTriangle } from "lucide-react";

export default function ExecutionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const { data, isLoading, isError } = useQuery({
    queryKey: ["execution", id],
    queryFn: async () => {
      const res = await fetch(`/api/executions/${id}`);
      if (!res.ok) throw new Error("Failed to fetch execution");
      return res.json();
    },
    enabled: !!id,
  });

  const execution = data?.execution;
  const statusConfig = getStatusConfig(execution?.status || "waiting");
  const StatusIcon = statusConfig.icon;

  const duration =
    execution?.finishedAt && execution?.startedAt
      ? Math.round(
          (new Date(execution.finishedAt).getTime() -
            new Date(execution.startedAt).getTime()) /
            1000
        )
      : null;

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Button
            variant="ghost"
            size="sm"
            className="mb-2"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold">Execution Details</h1>
          <p className="text-muted-foreground mt-1">
            Inspect execution metadata, status, and logs.
          </p>
        </div>
        {execution && (
          <Badge variant={statusConfig.variant} className="flex items-center gap-1 text-base">
            <StatusIcon className="h-4 w-4" />
            {execution.status?.toUpperCase()}
          </Badge>
        )}
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading execution...</p>
      ) : isError || !execution ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Execution not found.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">
                  Workflow
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                <div className="font-semibold">{execution.workflow?.name || "Unknown"}</div>
                <div className="text-sm text-muted-foreground">
                  {execution.workflow?.id || "—"}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">
                  Instance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                <div className="font-semibold">{execution.instance?.name || "Unknown"}</div>
                <div className="text-sm text-muted-foreground">
                  {execution.instance?.baseUrl || "—"}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">
                  Timing
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Clock3 className="h-4 w-4" /> Started
                  </span>
                  <span>{new Date(execution.startedAt).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Activity className="h-4 w-4" /> Finished
                  </span>
                  <span>
                    {execution.finishedAt
                      ? new Date(execution.finishedAt).toLocaleString()
                      : "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Cpu className="h-4 w-4" /> Duration
                  </span>
                  <span>
                    {duration !== null
                      ? `${duration}s`
                      : execution.status === "running"
                      ? "Running..."
                      : "—"}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Nodes Used</CardTitle>
              <CardDescription>Nodes referenced in the workflow graph.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {execution.data?.workflowData?.nodes?.length
                  ? execution.data.workflowData.nodes.map((node: any) => (
                      <Badge key={node.id} variant="secondary">
                        {node.name}
                      </Badge>
                    ))
                  : <span className="text-muted-foreground text-sm">No node data</span>}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Logs</CardTitle>
              <CardDescription>Raw execution payload for troubleshooting.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {execution.status === "error" && (
                <div className="flex items-center gap-2 text-amber-600 text-sm">
                  <AlertTriangle className="h-4 w-4" />
                  The execution ended with an error. Check payload below for details.
                </div>
              )}
              <pre className="bg-muted text-xs p-4 rounded overflow-x-auto whitespace-pre-wrap">
                {JSON.stringify(execution.data, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}


