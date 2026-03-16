import { StatusBadgeSystem } from "./status-badge-system";
import type {
  OverallBlogStatus,
  PublisherStageStatus,
  SocialPostStatus,
  WorkflowStage,
  WriterStageStatus,
} from "@/lib/types";

export function StatusBadge({ status }: { status: OverallBlogStatus }) {
  return <StatusBadgeSystem variant="overall" status={status} />;
}

export function WorkflowStageBadge({ stage }: { stage: WorkflowStage }) {
  return <StatusBadgeSystem variant="workflow" status={stage} />;
}

export function WriterStatusBadge({ status }: { status: WriterStageStatus }) {
  return <StatusBadgeSystem variant="writer" status={status} />;
}

export function PublisherStatusBadge({
  status,
}: {
  status: PublisherStageStatus;
}) {
  return <StatusBadgeSystem variant="publisher" status={status} />;
}

export function SocialPostStatusBadge({ status }: { status: SocialPostStatus }) {
  return <StatusBadgeSystem variant="social" status={status} />;
}
