/**
 * Preflight computation for Content Relay.
 *
 * Centralizes "what is this record missing before it can move to the
 * next stage?" logic so detail pages, list rings, and AI guidance all
 * read from a single source.
 *
 * Authority:
 * - Social post transitions are gated by REQUIRED_FIELDS_FOR_STATUS in
 *   src/lib/social-post-workflow.ts (mirrored on server RLS).
 * - Blog transitions require writer/publisher status progression plus
 *   Google Doc and Live URL presence.
 *
 * This helper is UI-only — the server remains authoritative. Rendering
 * a "ready" ring does NOT permit a transition; the server still enforces
 * ownership + required fields.
 */

import {
  REQUIRED_FIELDS_FOR_STATUS,
  TRANSITION_GRAPH,
  type SocialPostStatus,
} from "@/lib/social-post-workflow";
import type { BlogRecord, PublisherStageStatus, WriterStageStatus } from "@/lib/types";

export type PreflightField = {
  /** Stable key used to focus the field via data-preflight attribute. */
  key: string;
  /** User-facing label (must avoid raw enum keys per AGENTS.md vocab contract). */
  label: string;
};

export type PreflightReport = {
  /** Next status the record can reach if all required fields are satisfied. */
  nextStatus: string | null;
  /** Total number of fields required for the next transition. */
  requiredCount: number;
  /** Fields still missing for the next transition. */
  missing: PreflightField[];
  /** true when nothing is missing. */
  ready: boolean;
};

const SOCIAL_FIELD_LABELS: Record<string, string> = {
  product: "Product",
  type: "Type",
  canva_url: "Canva link",
  platforms: "Platforms",
  caption: "Caption",
  scheduled_date: "Scheduled publish date",
};

export type SocialPostPreflightInput = {
  status: SocialPostStatus;
  fields: Partial<Record<string, unknown>>;
  liveLinkCount: number;
};

/**
 * Compute preflight for a social post.
 * The "next status" follows the canonical TRANSITION_GRAPH; for published
 * records, preflight reports ready with zero missing fields.
 */
export function computeSocialPostPreflight(
  input: SocialPostPreflightInput
): PreflightReport {
  const allowedNext = TRANSITION_GRAPH[input.status] ?? [];
  // Primary forward target = first non-backward option.
  const nextStatus = pickForwardTarget(input.status, allowedNext);
  if (!nextStatus) {
    return { nextStatus: null, requiredCount: 0, missing: [], ready: true };
  }

  const requiredKeys = REQUIRED_FIELDS_FOR_STATUS[nextStatus as SocialPostStatus] ?? [];
  const missing: PreflightField[] = [];
  for (const key of requiredKeys) {
    if (!isFieldPresent(input.fields[key])) {
      missing.push({ key, label: SOCIAL_FIELD_LABELS[key] ?? key });
    }
  }
  if (nextStatus === "published" && input.liveLinkCount < 1) {
    missing.push({ key: "live_links", label: "At least one live link" });
  }
  return {
    nextStatus,
    requiredCount: requiredKeys.length + (nextStatus === "published" ? 1 : 0),
    missing,
    ready: missing.length === 0,
  };
}

export type BlogPreflightInput = Pick<
  BlogRecord,
  | "writer_status"
  | "publisher_status"
  | "google_doc_url"
  | "live_url"
  | "scheduled_publish_date"
> & { actualPublishedAt?: string | null };

/**
 * Compute preflight for a blog.
 * Focuses on the *next* milestone visible in the UI:
 *   - writer ready → submit for review
 *   - publisher ready → start publishing / complete publishing
 *   - published → nothing missing
 */
export function computeBlogPreflight(input: BlogPreflightInput): PreflightReport {
  const { writer_status, publisher_status } = input;

  // Writer pipeline first.
  if (writer_status !== "completed") {
    const missing: PreflightField[] = [];
    if (!input.google_doc_url) {
      missing.push({ key: "google_doc_url", label: "Google Doc link" });
    }
    if (writer_status === "not_started" || writer_status === "in_progress") {
      // Needs submission path: writer must have doc link to submit.
      const next = (writer_status === "not_started"
        ? "in_progress"
        : "pending_review") satisfies WriterStageStatus;
      return {
        nextStatus: `writer:${next}`,
        requiredCount: 1,
        missing,
        ready: missing.length === 0,
      };
    }
    // needs_revision / pending_review paths live with reviewer; no extra fields gate.
    return {
      nextStatus: `writer:${nextWriterStage(writer_status)}`,
      requiredCount: missing.length,
      missing,
      ready: missing.length === 0,
    };
  }

  // Publisher pipeline.
  if (publisher_status !== "completed") {
    const missing: PreflightField[] = [];
    if (!input.live_url) {
      missing.push({ key: "live_url", label: "Live URL" });
    }
    if (!input.scheduled_publish_date) {
      missing.push({
        key: "scheduled_publish_date",
        label: "Scheduled publish date",
      });
    }
    return {
      nextStatus: `publisher:${nextPublisherStage(publisher_status)}`,
      requiredCount: 2,
      missing,
      ready: missing.length === 0,
    };
  }

  return { nextStatus: null, requiredCount: 0, missing: [], ready: true };
}

function nextWriterStage(status: WriterStageStatus): WriterStageStatus {
  switch (status) {
    case "not_started":
      return "in_progress";
    case "in_progress":
      return "pending_review";
    case "pending_review":
      return "completed";
    case "needs_revision":
      return "in_progress";
    case "completed":
    default:
      return "completed";
  }
}

function nextPublisherStage(status: PublisherStageStatus): PublisherStageStatus {
  switch (status) {
    case "not_started":
      return "in_progress";
    case "in_progress":
      return "pending_review";
    case "pending_review":
      return "publisher_approved";
    case "publisher_approved":
      return "completed";
    case "completed":
    default:
      return "completed";
  }
}

function pickForwardTarget(
  current: SocialPostStatus,
  options: SocialPostStatus[]
): SocialPostStatus | null {
  // Backward transitions always route to "changes_requested"; prefer the
  // non-changes_requested option when available so preflight reflects
  // the natural forward path.
  const forward = options.find((option) => option !== "changes_requested");
  if (forward) {
    return forward;
  }
  if (current === "changes_requested") {
    return "in_review";
  }
  return options[0] ?? null;
}

function isFieldPresent(value: unknown): boolean {
  if (value === null || value === undefined) {
    return false;
  }
  if (typeof value === "string") {
    return value.trim().length > 0;
  }
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  if (typeof value === "number") {
    return !Number.isNaN(value);
  }
  return Boolean(value);
}
