import {
  PUBLISHER_STATUS_COLORS,
  PUBLISHER_STATUS_LABELS,
  STATUS_COLORS,
  STATUS_LABELS,
  WORKFLOW_STAGE_COLORS,
  WORKFLOW_STAGE_LABELS,
  WRITER_STATUS_COLORS,
  WRITER_STATUS_LABELS,
} from "@/lib/status";
import type {
  OverallBlogStatus,
  PublisherStageStatus,
  WorkflowStage,
  WriterStageStatus,
} from "@/lib/types";
import { cn } from "@/lib/utils";
function BaseStatusBadge({
  className,
  children,
}: {
  className: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
        className
      )}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: OverallBlogStatus }) {
  return (
    <BaseStatusBadge className={STATUS_COLORS[status]}>
      {STATUS_LABELS[status]}
    </BaseStatusBadge>
  );
}

export function WorkflowStageBadge({ stage }: { stage: WorkflowStage }) {
  return (
    <BaseStatusBadge className={WORKFLOW_STAGE_COLORS[stage]}>
      {WORKFLOW_STAGE_LABELS[stage]}
    </BaseStatusBadge>
  );
}

export function WriterStatusBadge({ status }: { status: WriterStageStatus }) {
  return (
    <BaseStatusBadge className={WRITER_STATUS_COLORS[status]}>
      {WRITER_STATUS_LABELS[status]}
    </BaseStatusBadge>
  );
}

export function PublisherStatusBadge({
  status,
}: {
  status: PublisherStageStatus;
}) {
  return (
    <BaseStatusBadge className={PUBLISHER_STATUS_COLORS[status]}>
      {PUBLISHER_STATUS_LABELS[status]}
    </BaseStatusBadge>
  );
}
