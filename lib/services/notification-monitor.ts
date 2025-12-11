import { prisma } from "@/lib/db/prisma";
import {
  sendExecutionErrorNotification,
  sendWorkflowDeactivatedNotification,
} from "@/lib/notifications/push";
import { N8nClient } from "@/lib/n8n/client";

/**
 * Monitor workflow executions and send notifications based on user settings
 */
export async function monitorExecutionForNotifications(
  executionId: string
): Promise<void> {
  try {
    const execution = await prisma.execution.findUnique({
      where: { id: executionId },
      include: {
        workflow: {
          include: {
            instance: {
              include: {
                user: {
                  include: {
                    userSettings: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!execution || !execution.workflow) {
      return;
    }

    const workflow = execution.workflow;
    const instance = workflow.instance;
    const user = instance.user;
    const settings = user.userSettings;

    // Only process if user has notification settings
    if (!settings) {
      return;
    }

    // Get or create error counter for this workflow
    let errorCounter = await prisma.workflowErrorCounter.findUnique({
      where: { workflowId: workflow.id },
    });

    if (!errorCounter) {
      errorCounter = await prisma.workflowErrorCounter.create({
        data: {
          workflowId: workflow.id,
          consecutiveErrors: 0,
          totalErrors: 0,
        },
      });
    }

    // Update error counter based on execution status
    if (execution.status === "error") {
      errorCounter = await prisma.workflowErrorCounter.update({
        where: { id: errorCounter.id },
        data: {
          consecutiveErrors: { increment: 1 },
          totalErrors: { increment: 1 },
          lastErrorAt: new Date(),
        },
      });

      // Check if we should send notification
      const shouldNotify =
        settings.notifyOnError &&
        errorCounter.consecutiveErrors >= settings.errorThreshold;

      if (shouldNotify && settings.pushNotificationsEnabled) {
        // Send push notification
        await sendExecutionErrorNotification(user.id, {
          workflowName: workflow.name,
          instanceName: instance.name,
          executionId: execution.id,
          errorMessage: getErrorMessage(execution.data),
          consecutiveErrors: errorCounter.consecutiveErrors,
        });

        // Log notification
        await prisma.notificationLog.create({
          data: {
            userId: user.id,
            workflowId: workflow.id,
            instanceId: instance.id,
            executionId: execution.id,
            type: "error",
            title: `Workflow Error: ${workflow.name}`,
            message: `Failed after ${errorCounter.consecutiveErrors} consecutive errors`,
            metadata: JSON.stringify({
              errorMessage: getErrorMessage(execution.data),
            }),
            sent: true,
            sentAt: new Date(),
          },
        });
      }

      // Check if we should auto-deactivate
      if (
        settings.autoDeactivateWorkflow &&
        errorCounter.consecutiveErrors >= settings.autoDeactivateThreshold &&
        !errorCounter.isAutoDeactivated &&
        workflow.isActive
      ) {
        // Deactivate workflow in n8n
        const client = new N8nClient(instance.baseUrl, instance.apiKey);
        await client.deactivateWorkflow(workflow.n8nWorkflowId);

        // Update database
        await prisma.workflow.update({
          where: { id: workflow.id },
          data: { isActive: false },
        });

        await prisma.workflowErrorCounter.update({
          where: { id: errorCounter.id },
          data: { isAutoDeactivated: true },
        });

        // Send deactivation notification
        if (settings.pushNotificationsEnabled) {
          await sendWorkflowDeactivatedNotification(user.id, {
            workflowName: workflow.name,
            instanceName: instance.name,
            workflowId: workflow.id,
            reason: `Auto-deactivated after ${errorCounter.consecutiveErrors} consecutive errors`,
          });

          // Log notification
          await prisma.notificationLog.create({
            data: {
              userId: user.id,
              workflowId: workflow.id,
              instanceId: instance.id,
              type: "warning",
              title: `Workflow Auto-Deactivated`,
              message: `${workflow.name} was automatically deactivated`,
              sent: true,
              sentAt: new Date(),
            },
          });
        }
      }
    } else if (execution.status === "success") {
      // Reset consecutive errors counter on success
      await prisma.workflowErrorCounter.update({
        where: { id: errorCounter.id },
        data: {
          consecutiveErrors: 0,
          lastSuccessAt: new Date(),
        },
      });

      // Send success notification if enabled
      if (settings.notifyOnSuccess && settings.pushNotificationsEnabled) {
        // You can implement success notifications here
      }
    }
  } catch (error) {
    console.error("Error monitoring execution for notifications:", error);
  }
}

function getErrorMessage(data: string | null): string {
  if (!data) return "Unknown error";

  try {
    const parsed = JSON.parse(data);
    // Try to extract error message from n8n execution data
    if (parsed.data?.resultData?.error?.message) {
      return parsed.data.resultData.error.message;
    }
    if (parsed.error?.message) {
      return parsed.error.message;
    }
    return "Workflow execution failed";
  } catch {
    return "Workflow execution failed";
  }
}

/**
 * Background job to check all instances and sync executions,
 * then monitor for notifications
 */
export async function runNotificationMonitor(): Promise<void> {
  try {
    console.log("[Notification Monitor] Starting...");

    // Get all active instances
    const instances = await prisma.n8nInstance.findMany({
      where: { isActive: true },
      include: {
        user: {
          include: {
            userSettings: true,
          },
        },
        workflows: {
          where: { isActive: true },
        },
      },
    });

    for (const instance of instances) {
      // Only process if user has notifications enabled
      if (!instance.user.userSettings?.pushNotificationsEnabled) {
        continue;
      }

      try {
        const client = new N8nClient(instance.baseUrl, instance.apiKey);

        // Check recent executions for each workflow
        for (const workflow of instance.workflows) {
          const n8nExecutions = await client.getExecutions(
            workflow.n8nWorkflowId,
            10
          ); // Last 10 executions

          for (const n8nExecution of n8nExecutions.data) {
            // Check if we already have this execution
            const existingExecution = await prisma.execution.findFirst({
              where: {
                instanceId: instance.id,
                n8nExecutionId: n8nExecution.id,
              },
            });

            if (!existingExecution) {
              // New execution, create it and check for notifications
              const newExecution = await prisma.execution.create({
                data: {
                  instanceId: instance.id,
                  workflowId: workflow.id,
                  n8nExecutionId: n8nExecution.id,
                  status: n8nExecution.status,
                  startedAt: new Date(n8nExecution.startedAt),
                  finishedAt: n8nExecution.stoppedAt
                    ? new Date(n8nExecution.stoppedAt)
                    : null,
                  data: JSON.stringify(n8nExecution.data),
                },
              });

              // Monitor for notifications
              await monitorExecutionForNotifications(newExecution.id);
            }
          }
        }

        // Update instance last check
        await prisma.n8nInstance.update({
          where: { id: instance.id },
          data: { lastCheck: new Date() },
        });
      } catch (error) {
        console.error(
          `[Notification Monitor] Error processing instance ${instance.name}:`,
          error
        );
      }
    }

    console.log("[Notification Monitor] Completed");
  } catch (error) {
    console.error("[Notification Monitor] Fatal error:", error);
  }
}


