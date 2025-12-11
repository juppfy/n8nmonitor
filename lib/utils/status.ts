import { CheckCircle2, XCircle, Clock, Activity, AlertCircle } from "lucide-react";

export type ExecutionStatus = "success" | "error" | "running" | "waiting" | "canceled";

export const STATUS_CONFIG = {
  success: {
    variant: "default" as const,
    icon: CheckCircle2,
    label: "Success",
    color: "text-green-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
  },
  error: {
    variant: "destructive" as const,
    icon: XCircle,
    label: "Error",
    color: "text-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
  },
  running: {
    variant: "outline" as const,
    icon: Activity,
    label: "Running",
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
  },
  waiting: {
    variant: "secondary" as const,
    icon: Clock,
    label: "Waiting",
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
  },
  canceled: {
    variant: "secondary" as const,
    icon: AlertCircle,
    label: "Canceled",
    color: "text-gray-600",
    bgColor: "bg-gray-50",
    borderColor: "border-gray-200",
  },
};

export function getStatusConfig(status: string) {
  return STATUS_CONFIG[status as ExecutionStatus] || STATUS_CONFIG.waiting;
}


