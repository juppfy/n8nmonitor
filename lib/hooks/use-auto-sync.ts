import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

interface UseAutoSyncOptions {
  enabled?: boolean;
  interval?: number; // in milliseconds
  instanceId?: string;
  onSync?: () => void;
}

export function useAutoSync({
  enabled = true,
  interval = 5 * 60 * 1000, // 5 minutes default
  instanceId,
  onSync,
}: UseAutoSyncOptions = {}) {
  const queryClient = useQueryClient();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const syncWorkflows = async () => {
      try {
        if (instanceId && instanceId !== "all") {
          console.log(`[Auto-sync] Syncing workflows for instance: ${instanceId}`);
          const res = await fetch("/api/workflows", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ instanceId }),
          });
          
          if (res.ok) {
            const data = await res.json();
            console.log(`[Auto-sync] Synced ${data.count} workflows`);
            queryClient.invalidateQueries({ queryKey: ["workflows"] });
            queryClient.invalidateQueries({ queryKey: ["instances"] });
            onSync?.();
          }
        }
      } catch (error) {
        console.error("[Auto-sync] Failed to sync workflows:", error);
      }
    };

    const syncExecutions = async () => {
      try {
        if (instanceId && instanceId !== "all") {
          console.log(`[Auto-sync] Syncing executions for instance: ${instanceId}`);
          const res = await fetch("/api/executions/sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ instanceId }),
          });
          
          if (res.ok) {
            const data = await res.json();
            console.log(`[Auto-sync] Synced ${data.count} executions`);
            queryClient.invalidateQueries({ queryKey: ["executions"] });
            queryClient.invalidateQueries({ queryKey: ["workflow-executions"] });
          }
        }
      } catch (error) {
        console.error("[Auto-sync] Failed to sync executions:", error);
      }
    };

    const syncAll = async () => {
      await Promise.all([syncWorkflows(), syncExecutions()]);
    };

    // Initial sync
    syncAll();

    // Set up polling
    intervalRef.current = setInterval(syncAll, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, interval, instanceId, queryClient, onSync]);

  const triggerManualSync = async () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    if (instanceId && instanceId !== "all") {
      await Promise.all([
        fetch("/api/workflows", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ instanceId }),
        }),
        fetch("/api/executions/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ instanceId }),
        }),
      ]);

      queryClient.invalidateQueries({ queryKey: ["workflows"] });
      queryClient.invalidateQueries({ queryKey: ["instances"] });
      queryClient.invalidateQueries({ queryKey: ["executions"] });
      queryClient.invalidateQueries({ queryKey: ["workflow-executions"] });
    }

    // Restart polling
    intervalRef.current = setInterval(async () => {
      if (instanceId && instanceId !== "all") {
        await Promise.all([
          fetch("/api/workflows", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ instanceId }),
          }),
          fetch("/api/executions/sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ instanceId }),
          }),
        ]);
        queryClient.invalidateQueries({ queryKey: ["workflows"] });
        queryClient.invalidateQueries({ queryKey: ["instances"] });
        queryClient.invalidateQueries({ queryKey: ["executions"] });
      }
    }, interval);
  };

  return { triggerManualSync };
}


