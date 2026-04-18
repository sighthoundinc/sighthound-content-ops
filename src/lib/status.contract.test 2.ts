/**
 * Status label + color contract test.
 *
 * Locks the canonical labels and color tokens defined in AGENTS.md's
 * "Global Vocabulary Contract" and "Workflow row colorization" rules.
 * If a label or token drifts, this test fails at the boundary instead of
 * surfacing as a visual regression.
 */

import {
  PUBLISHER_STATUS_COLORS,
  PUBLISHER_STATUS_LABELS,
  SOCIAL_POST_STATUS_COLORS,
  STATUS_COLORS,
  STATUS_LABELS,
  WORKFLOW_STAGE_COLORS,
  WRITER_STATUS_COLORS,
  WRITER_STATUS_LABELS,
} from "@/lib/status";

describe("status labels contract", () => {
  it("writer status labels use the canonical pipeline-noun form", () => {
    expect(WRITER_STATUS_LABELS).toEqual({
      not_started: "Not Started",
      in_progress: "Writing in Progress",
      pending_review: "Awaiting Writing Review",
      needs_revision: "Needs Revision",
      completed: "Writing Approved",
    });
  });

  it("publisher status labels use the canonical pipeline-noun form", () => {
    expect(PUBLISHER_STATUS_LABELS).toEqual({
      not_started: "Not Started",
      in_progress: "Publishing in Progress",
      pending_review: "Awaiting Publishing Review",
      publisher_approved: "Approved for Publishing",
      completed: "Published",
    });
  });

  it("overall blog status labels remain canonical", () => {
    expect(STATUS_LABELS).toEqual({
      planned: "Draft",
      writing: "Writing",
      needs_revision: "Needs Revision",
      ready_to_publish: "Ready",
      published: "Published",
    });
  });
});

const EMERALD = "bg-emerald-100 text-emerald-700 border border-emerald-200";
const SKY = "bg-sky-100 text-sky-700 border border-sky-200";
const VIOLET = "bg-violet-100 text-violet-700 border border-violet-200";
const ROSE = "bg-rose-100 text-rose-700 border border-rose-200";
const BLUE = "bg-blue-100 text-blue-700 border border-blue-200";
const AMBER = "bg-amber-100 text-amber-700 border border-amber-200";
const SLATE = "bg-slate-100 text-slate-700 border border-slate-200";

describe("status color contract", () => {
  it("overall blog status colors match AGENTS.md workflow row colorization", () => {
    expect(STATUS_COLORS.planned).toBe(SLATE);
    expect(STATUS_COLORS.writing).toBe(BLUE);
    expect(STATUS_COLORS.needs_revision).toBe(ROSE);
    expect(STATUS_COLORS.ready_to_publish).toBe(SKY);
    expect(STATUS_COLORS.published).toBe(EMERALD);
  });

  it("writer status colors match the contract", () => {
    expect(WRITER_STATUS_COLORS.not_started).toBe(SLATE);
    expect(WRITER_STATUS_COLORS.in_progress).toBe(BLUE);
    expect(WRITER_STATUS_COLORS.pending_review).toBe(VIOLET);
    expect(WRITER_STATUS_COLORS.needs_revision).toBe(ROSE);
    expect(WRITER_STATUS_COLORS.completed).toBe(EMERALD);
  });

  it("publisher status colors match the contract", () => {
    expect(PUBLISHER_STATUS_COLORS.not_started).toBe(SLATE);
    expect(PUBLISHER_STATUS_COLORS.in_progress).toBe(BLUE);
    expect(PUBLISHER_STATUS_COLORS.pending_review).toBe(VIOLET);
    expect(PUBLISHER_STATUS_COLORS.publisher_approved).toBe(EMERALD);
    expect(PUBLISHER_STATUS_COLORS.completed).toBe(EMERALD);
  });

  it("social post status colors match the contract", () => {
    expect(SOCIAL_POST_STATUS_COLORS.draft).toBe(SLATE);
    expect(SOCIAL_POST_STATUS_COLORS.in_review).toBe(VIOLET);
    expect(SOCIAL_POST_STATUS_COLORS.changes_requested).toBe(ROSE);
    expect(SOCIAL_POST_STATUS_COLORS.creative_approved).toBe(EMERALD);
    expect(SOCIAL_POST_STATUS_COLORS.ready_to_publish).toBe(SKY);
    expect(SOCIAL_POST_STATUS_COLORS.awaiting_live_link).toBe(AMBER);
    expect(SOCIAL_POST_STATUS_COLORS.published).toBe(EMERALD);
  });

  it("workflow stage colors use the soft pastel palette consistently", () => {
    expect(WORKFLOW_STAGE_COLORS.writing).toBe(BLUE);
    expect(WORKFLOW_STAGE_COLORS.ready).toBe(SKY);
    expect(WORKFLOW_STAGE_COLORS.publishing).toBe(BLUE);
    expect(WORKFLOW_STAGE_COLORS.published).toBe(EMERALD);
  });
});
