import { useMemo } from 'react';
import { NEXT_ACTION_LABELS, STATUS_LABELS } from '@/lib/social-post-workflow';
import type { SocialPostStatus } from '@/lib/types';
import { SocialPostStatusBadge } from './status-badge';

interface SocialPostStatusInfoProps {
  status: SocialPostStatus;
  // New explicit ownership fields
  workerUserId: string | null;
  workerUserName?: string | null;
  reviewerUserId: string | null;
  reviewerUserName?: string | null;
  currentUserId?: string;
}

/**
 * Displays social post status badge, next action, and owner information.
 * Uses explicit worker/reviewer ownership model:
 * - Worker executes: draft, changes_requested, ready_to_publish, awaiting_live_link
 * - Reviewer approves: in_review, creative_approved
 * Used in list/card views to show ownership and what's expected next.
 */
export function SocialPostStatusInfo({
  status,
  workerUserId,
  workerUserName,
  reviewerUserId,
  reviewerUserName,
  currentUserId,
}: SocialPostStatusInfoProps) {
  // Derive current owner based on status and ownership model
  const currentOwnerUserId = useMemo(() => {
    if (status === 'in_review' || status === 'creative_approved') {
      return reviewerUserId;
    }
    return workerUserId; // draft, changes_requested, ready_to_publish, awaiting_live_link, published
  }, [status, workerUserId, reviewerUserId]);

  const currentOwnerUserName = useMemo(() => {
    if (status === 'in_review' || status === 'creative_approved') {
      return reviewerUserName;
    }
    return workerUserName;
  }, [status, workerUserName, reviewerUserName]);

  const isOwner = useMemo(
    () => currentUserId && currentOwnerUserId === currentUserId,
    [currentUserId, currentOwnerUserId]
  );

  const nextAction = useMemo(() => NEXT_ACTION_LABELS[status] || 'Continue', [status]);
  const statusLabel = useMemo(() => STATUS_LABELS[status] || status, [status]);

  return (
    <div className="space-y-1">
      {/* Status badge and label */}
      <div className="flex items-center gap-2">
        <SocialPostStatusBadge status={status} />
        <span className="text-xs font-medium text-slate-600">{statusLabel}</span>
      </div>

      {/* Ownership and next action */}
      <div className="flex flex-col gap-0.5">
        {currentOwnerUserId && currentOwnerUserName ? (
          <p className="text-xs text-slate-500">
            {isOwner ? (
              <strong className="text-slate-700">Assigned to you</strong>
            ) : (
              <>
                Assigned to <strong className="text-slate-700">{currentOwnerUserName}</strong>
              </>
            )}
          </p>
        ) : null}

        {status !== 'published' && (
          <p className="text-xs font-medium text-slate-600">
            {isOwner ? (
              <>Your next: {nextAction}</>
            ) : (
              <>Waiting for: {nextAction}</>
            )}
          </p>
        )}
      </div>
    </div>
  );
}
