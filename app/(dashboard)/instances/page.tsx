"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Server, Trash2, Edit, TestTube, CheckCircle2, XCircle, LayoutGrid, List } from "lucide-react";
import { getStatusConfig } from "@/lib/utils/status";

export default function InstancesPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingInstance, setEditingInstance] = useState<any>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [formData, setFormData] = useState({
    name: "",
    baseUrl: "",
    apiKey: "",
  });
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ["instances"],
    queryFn: async () => {
      const res = await fetch("/api/instances");
      if (!res.ok) throw new Error("Failed to fetch instances");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/instances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create instance");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Instance created",
        description: "n8n instance has been added successfully",
      });
      setIsDialogOpen(false);
      setFormData({ name: "", baseUrl: "", apiKey: "" });
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

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await fetch(`/api/instances/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update instance");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Instance updated",
        description: "Instance has been updated successfully",
      });
      setIsDialogOpen(false);
      setEditingInstance(null);
      setFormData({ name: "", baseUrl: "", apiKey: "" });
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

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/instances/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to delete instance");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Instance deleted",
        description: "Instance has been deleted successfully",
      });
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

  const testMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/instances/${id}/test`, {
        method: "POST",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to test connection");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: data.connected ? "Connection successful" : "Connection failed",
        description: data.message,
        variant: data.connected ? "default" : "destructive",
      });
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

  const handleOpenDialog = (instance?: any) => {
    if (instance) {
      setEditingInstance(instance);
      setFormData({
        name: instance.name,
        baseUrl: instance.baseUrl,
        apiKey: "", // Don't pre-fill API key for security
      });
    } else {
      setEditingInstance(null);
      setFormData({ name: "", baseUrl: "", apiKey: "" });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingInstance) {
      updateMutation.mutate({ id: editingInstance.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <p className="text-muted-foreground">Loading instances...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">n8n Instances</h1>
          <p className="text-muted-foreground mt-2">
            Manage your n8n instances and monitor workflows
          </p>
        </div>
        <div className="flex gap-2">
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
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Instance
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingInstance ? "Edit Instance" : "Add n8n Instance"}
              </DialogTitle>
              <DialogDescription>
                {editingInstance
                  ? "Update your n8n instance configuration"
                  : "Add a new n8n instance to monitor"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Instance Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Production n8n"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="baseUrl">Base URL</Label>
                <Input
                  id="baseUrl"
                  type="url"
                  value={formData.baseUrl}
                  onChange={(e) =>
                    setFormData({ ...formData, baseUrl: e.target.value })
                  }
                  placeholder="https://n8n.example.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="apiKey">API Key</Label>
                <Input
                  id="apiKey"
                  type="password"
                  value={formData.apiKey}
                  onChange={(e) =>
                    setFormData({ ...formData, apiKey: e.target.value })
                  }
                  placeholder={editingInstance ? "Leave blank to keep existing" : "n8n_api_..."}
                  required={!editingInstance}
                />
                <p className="text-sm text-muted-foreground">
                  {editingInstance
                    ? "Leave blank to keep existing API key"
                    : "Your n8n API key (found in Settings > API)"}
                </p>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {editingInstance ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {data?.instances?.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Server className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No instances yet</h3>
            <p className="text-muted-foreground mb-4">
              Add your first n8n instance to start monitoring workflows
            </p>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Instance
            </Button>
          </CardContent>
        </Card>
      ) : viewMode === "grid" ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data?.instances?.map((instance: any) => (
            <InstanceCard
              key={instance.id}
              instance={instance}
              onEdit={() => handleOpenDialog(instance)}
              onDelete={() => {
                if (confirm(`Are you sure you want to delete "${instance.name}"?`)) {
                  deleteMutation.mutate(instance.id);
                }
              }}
              onTest={() => testMutation.mutate(instance.id)}
              testPending={testMutation.isPending}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {data?.instances?.map((instance: any) => (
            <InstanceRow
              key={instance.id}
              instance={instance}
              onEdit={() => handleOpenDialog(instance)}
              onDelete={() => {
                if (confirm(`Are you sure you want to delete "${instance.name}"?`)) {
                  deleteMutation.mutate(instance.id);
                }
              }}
              onTest={() => testMutation.mutate(instance.id)}
              testPending={testMutation.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function InstanceCard({ instance, onEdit, onDelete, onTest, testPending }: any) {
  const statusConfig = getStatusConfig(instance.isActive ? "success" : "waiting");
  const StatusIcon = statusConfig.icon;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              {instance.name}
            </CardTitle>
            <CardDescription className="mt-1">
              {instance.baseUrl}
            </CardDescription>
          </div>
          <Badge variant={statusConfig.variant} className="gap-1">
            <StatusIcon className="h-3 w-3" />
            {instance.isActive ? "Active" : "Inactive"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Workflows:</span>
          <span className="font-medium">
            {instance._count?.workflows || 0}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Executions:</span>
          <span className="font-medium">
            {instance._count?.executions || 0}
          </span>
        </div>
        {instance.lastCheck && (
          <div className="text-xs text-muted-foreground">
            Last checked: {new Date(instance.lastCheck).toLocaleString()}
          </div>
        )}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onTest}
            disabled={testPending}
            className="flex-1"
          >
            <TestTube className="h-4 w-4 mr-1" />
            Test
          </Button>
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function InstanceRow({ instance, onEdit, onDelete, onTest, testPending }: any) {
  const statusConfig = getStatusConfig(instance.isActive ? "success" : "waiting");
  const StatusIcon = statusConfig.icon;

  return (
    <Card>
      <CardContent className="py-4 flex flex-wrap items-center gap-3 justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            <span className="font-semibold">{instance.name}</span>
          </div>
          <div className="text-sm text-muted-foreground">
            {instance.baseUrl}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={statusConfig.variant} className="gap-1">
            <StatusIcon className="h-3 w-3" />
            {instance.isActive ? "Active" : "Inactive"}
          </Badge>
          <Badge variant="secondary">
            {instance._count?.workflows || 0} workflows
          </Badge>
          <Badge variant="secondary">
            {instance._count?.executions || 0} runs
          </Badge>
        </div>
        {instance.lastCheck && (
          <div className="text-sm text-muted-foreground">
            Last checked: {new Date(instance.lastCheck).toLocaleString()}
          </div>
        )}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onTest} disabled={testPending}>
            <TestTube className="h-4 w-4 mr-1" />
            Test
          </Button>
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}


