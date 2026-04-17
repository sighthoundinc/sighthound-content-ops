/**
 * Unified next-action helper.
 *
 * Derives the single verb a user should perform on a record, using the
 * canonical status maps in src/lib/social-post-workflow.ts and blog
 * writer/publisher statuses. Consumers render the string via the shared
 * <NextActionCell /> / <NextActionPill /> primitives.
 *
 * Rules:
 * - No raw enum keys surface in UI (AGENTS.md: Activity Message Language).
 * - When the current user is NOT the next actor, the label is "Waiting".
 * - For terminal states (published / writing approved), label is "Done".
 */

import {
  NEXT_ACTION_LABELS,
  STATUS_LABELS,
  type SocialPostStatus,
} from "@/lib/social-post-workflow";
import type {
  PublisherStageStatus,
  WriterStageStatus,
} from "@/lib/types";

export type NextActionDescriptor = {
  /** Verb phrase to render as the primary action ("Submit for Review"). */
  label: string;
  /** Owner display name when known, otherwise null. */
  owner: string | null;
  /**
   * When true, the current user is the one expected to act. Drives the
   * visual prominence of the Next-Action cell/pill.
   */
  isMine: boolean;
  /** Short waiting text for the row when `isMine` is false. */
  waitingFor: string;
};

export const BLOG_NEXT_ACTION_LABELS = {
  writer: {
    not_started: "Start Writing",
    in_progress: "Submit Draft",
    pending_review: "Awaiting Writing Review",
    needs_revision: "Apply Revisions",
    completed: "Writing Approved",
  } satisfies Record<WriterStageStatus, string>,
  publisher: {
    not_started: "Start Publishing",
    in_progress: "Submit for Review",
    pending_review: "Awaiting Publishing Review",
    publisher_approved: "Publish Blog",
    completed: "Published",
  } satisfies Record<PublisherStageStatus, string>,
} as const;

export const BLOG_WAITING_LABELS = {
  writer: {
    not_started: "Waiting on writing to start",
    in_progress: "Waiting on writer",
    pending_review: "Waiting on reviewer",
    needs_revision: "Waiting on writer",
    completed: "Ready for publishing",
  } satisfies Record<WriterStageStatus, string>,
  publisher: {
    not_started: "Waiting on publishing to start",
    in_progress: "Waiting on publisher",
    pending_review: "Waiting on reviewer",
    publisher_approved: "Waiting on publisher",
    completed: "Done",
  } satisfies Record<PublisherStageStatus, string>,
} as const;

type SocialNextActionInput = {
  status: SocialPostStatus;
  ownerId: string | null;
  ownerName: string | null;
  userId: string | null;
  isAdmin?: boolean;
};

export function socialNextAction(input: SocialNextActionInput): NextActionDescriptor {
  const { status, ownerId, ownerName, userId, isAdmin } = input;
  const label = NEXT_ACTION_LABELS[status] ?? "Open";
  const isMine =
    Boolean(userId && ownerId && userId === ownerId) || Boolean(isAdmin);
  const waitingFor =
    status === "published"
      ? "Done"
      : ownerName
        ? `Waiting on ${ownerName}`
        : `Waiting on ${STATUS_LABELS[status]}`;
  return {
    label,
    owner: ownerName,
    isMine,
    waitingFor,
  };
}

type BlogNextActionInput = {
  writerStatus: WriterStageStatus;
  publisherStatus: PublisherStageStatus;
  writerId: string | null;
  publisherId: string | null;
  writerName: string | null;
  publisherName: string | null;
  userId: string | null;
  isAdmin?: boolean;
};

export function blogNextAction(input: BlogNextActionInput): NextActionDescriptor {
  const {
    writerStatus,
    publisherStatus,
    writerId,
    publisherId,
    writerName,
    publisherName,
    userId,
    isAdmin,
  } = input;

  if (writerStatus !== "completed") {
    const label = BLOG_NEXT_ACTION_LABELS.writer[writerStatus];
    const waitingFor = BLOG_WAITING_LABELS.writer[writerStatus];
    const isMine =
      Boolean(userId && writerId && userId === writerId) || Boolean(isAdmin);
    return {
      label,
      owner: writerName,
      isMine,
      waitingFor: writerName ? `Waiting on ${writerName}` : waitingFor,
    };
  }

  const label = BLOG_NEXT_ACTION_LABELS.publisher[publisherStatus];
  const waitingFor = BLOG_WAITING_LABELS.publisher[publisherStatus];
  const isMine =
    Boolean(userId && publisherId && userId === publisherId) || Boolean(isAdmin);
  return {
    label,
    owner: publisherName,
    isMine,
    waitingFor: publisherName ? `Waiting on ${publisherName}` : waitingFor,
  };
}
