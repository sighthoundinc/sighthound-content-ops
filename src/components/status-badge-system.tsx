import { cn } from "@/lib/utils";
import type {
  OverallBlogStatus,
  PublisherStageStatus,
  SocialPostStatus,
  WorkflowStage,
  WriterStageStatus,
} from "@/lib/types";
import {
  PUBLISHER_STATUS_COLORS,
  PUBLISHER_STATUS_LABELS,
  SOCIAL_POST_STATUS_COLORS,
  SOCIAL_POST_STATUS_LABELS,
  STATUS_COLORS,
  STATUS_LABELS,
  WORKFLOW_STAGE_COLORS,
  WORKFLOW_STAGE_LABELS,
  WRITER_STATUS_COLORS,
  WRITER_STATUS_LABELS,
} from "@/lib/status";

type StatusBadgeVariant = "overall" | "writer" | "publisher" | "workflow" | "social";
type StatusValue =
  | OverallBlogStatus
  | WriterStageStatus
  | PublisherStageStatus
  | WorkflowStage
  | SocialPostStatus;

interface StatusBadgeSystemProps {
  variant: StatusBadgeVariant;
  status: StatusValue;
  className?: string;
}

/**
 * Unified status badge system component for consistent status display across the application.
 * Supports all status types: overall blog status, writer stage, publisher stage, workflow stages, and social post status.
 *
 * @example
 * <StatusBadgeSystem variant="overall" status="writing" />
 * <StatusBadgeSystem variant="writer" status="in_progress" />
 * <StatusBadgeSystem variant="workflow" status="published" />
 */
export function StatusBadgeSystem({
  variant,
  status,
  className,
}: StatusBadgeSystemProps) {
  let colorClass = "";
  let label = "";

  switch (variant) {
    case "overall":
      colorClass = STATUS_COLORS[status as OverallBlogStatus];
      label = STATUS_LABELS[status as OverallBlogStatus];
      break;
    case "writer":
      colorClass = WRITER_STATUS_COLORS[status as WriterStageStatus];
      label = WRITER_STATUS_LABELS[status as WriterStageStatus];
      break;
    case "publisher":
      colorClass = PUBLISHER_STATUS_COLORS[status as PublisherStageStatus];
      label = PUBLISHER_STATUS_LABELS[status as PublisherStageStatus];
      break;
    case "workflow":
      colorClass = WORKFLOW_STAGE_COLORS[status as WorkflowStage];
      label = WORKFLOW_STAGE_LABELS[status as WorkflowStage];
      break;
    case "social":
      colorClass = SOCIAL_POST_STATUS_COLORS[status as SocialPostStatus];
      label = SOCIAL_POST_STATUS_LABELS[status as SocialPostStatus];
      break;
  }

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full px-2.5 py-1 text-center text-xs font-medium leading-4 whitespace-nowrap",
        colorClass,
        className
      )}
    >
      {label}
    </span>
  );
}
