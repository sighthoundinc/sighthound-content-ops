import { getWorkflowStage } from "@/lib/status";
import {
  getRequiredFieldsForStatus,
  getNextStagesForStatus,
  BLOG_WORKFLOW,
} from "@/lib/workflow-rules";
import { detectBlockers } from "@/lib/blocker-detector";
import { checkQuality } from "@/lib/quality-checker";
import { generateResponse } from "@/app/api/ai/utils/response-generator";
import { extractContextSync } from "@/app/api/ai/utils/context-extractor";
import { routePrompt } from "@/app/api/ai/utils/prompt-router";

/**
 * Regression coverage for the bug where a blog in the writing phase was
 * reported as "terminal stage, cannot transition" because BLOG_WORKFLOW
 * previously used made-up stages that didn't match real DB values.
 */
describe("Ask AI — blog in Writing phase (regression)", () => {
  const USER_ID = "user-writer-1";
  const BLOG_ID = "blog-1";

  /** Reproduces the exact path route.ts follows for a blog entity */
  function runPipelineForBlog(row: {
    writer_status: string;
    publisher_status: string;
    title: string | null;
    writer_id: string | null;
    google_doc_url: string | null;
    publisher_id: string | null;
    scheduled_publish_date: string | null;
  }) {
    // 1) Derive unified stage the same way route.ts now does
    const stage = getWorkflowStage({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      writerStatus: row.writer_status as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      publisherStatus: row.publisher_status as any,
    });

    // 2) Build entity state for the detector
    const entityState = {
      status: stage,
      fields: {
        title: !!row.title,
        writer_id: !!row.writer_id,
        draft_doc_link: !!row.google_doc_url,
        google_doc_url: !!row.google_doc_url,
        publisher_id: !!row.publisher_id,
        scheduled_publish_date: !!row.scheduled_publish_date,
      },
      ownerId: row.writer_id || USER_ID,
      reviewerId: row.publisher_id || undefined,
      title: row.title || undefined,
    };

    // 3) Extract context
    const context = extractContextSync(
      {
        entityType: "blog",
        entityId: BLOG_ID,
        userId: USER_ID,
        userRole: "writer",
      },
      entityState
    );

    // 4) Detect blockers + quality
    const requiredFields = getRequiredFieldsForStatus("blog", context.currentStatus);
    const nextAllowed = getNextStagesForStatus("blog", context.currentStatus);
    const blockerResult = detectBlockers({
      entityType: "blog",
      status: context.currentStatus,
      userRole: "writer",
      userIsOwner: context.userIsOwner,
      userIsReviewer: context.userIsReviewer,
      fields: context.fields,
      requiredFieldsForStatus: requiredFields,
      nextAllowedStages: nextAllowed,
    });
    const qualityResult = checkQuality({
      entityType: "blog",
      title: entityState.title,
    });

    // 5) Deterministic response + routed prompt (fallback path)
    const deterministicResult = generateResponse({
      context,
      blockers: blockerResult.blockers,
      qualityIssues: qualityResult.issues,
    });
    const routed = routePrompt({
      prompt: "What should I do next?",
      context,
      blockers: blockerResult.blockers,
      qualityIssues: qualityResult.issues,
      deterministicNextSteps: deterministicResult.nextSteps,
      canProceed: deterministicResult.canProceed,
    });

    return { stage, context, blockerResult, deterministicResult, routed };
  }

  it("maps writer_status=in_progress, publisher_status=not_started to 'writing'", () => {
    const { stage } = runPipelineForBlog({
      writer_status: "in_progress",
      publisher_status: "not_started",
      title: "My Blog",
      writer_id: USER_ID,
      google_doc_url: null,
      publisher_id: null,
      scheduled_publish_date: null,
    });

    expect(stage).toBe("writing");
    // Workflow must recognize writing and expose 'ready' as next
    expect(BLOG_WORKFLOW.transitions.writing).toEqual(["ready"]);
  });

  it("does NOT report a terminal-stage blocker for a blog in writing", () => {
    const { blockerResult, context } = runPipelineForBlog({
      writer_status: "in_progress",
      publisher_status: "not_started",
      title: "My Blog",
      writer_id: USER_ID,
      google_doc_url: null,
      publisher_id: null,
      scheduled_publish_date: null,
    });

    expect(context.currentStatus).toBe("writing");
    expect(context.nextAllowedStages).toEqual(["ready"]);

    const terminal = blockerResult.blockers.find(
      (b) => b.type === "invalid_transition"
    );
    expect(terminal).toBeUndefined();
  });

  it("generates human-friendly guidance without leaking 'terminal' wording", () => {
    const { deterministicResult, routed } = runPipelineForBlog({
      writer_status: "in_progress",
      publisher_status: "not_started",
      title: "My Blog",
      writer_id: USER_ID,
      google_doc_url: null,
      publisher_id: null,
      scheduled_publish_date: null,
    });

    // Current status in the response must be 'writing'
    expect(deterministicResult.currentState.status).toBe("writing");

    // No "terminal", "final", or raw enum leakage in the answer or next steps
    const corpus = [
      routed.answer,
      ...routed.nextSteps,
      ...deterministicResult.nextSteps,
    ]
      .join(" ")
      .toLowerCase();

    expect(corpus).not.toContain("terminal");
    expect(corpus).not.toContain("final stage");
    expect(corpus).not.toContain("writer_status");
    expect(corpus).not.toContain("publisher_status");
  });

  it("treats writer_status=completed, publisher_status=not_started as 'ready' (not terminal)", () => {
    const { stage, context, blockerResult } = runPipelineForBlog({
      writer_status: "completed",
      publisher_status: "not_started",
      title: "My Blog",
      writer_id: USER_ID,
      google_doc_url: "https://docs.google.com/doc",
      publisher_id: null,
      scheduled_publish_date: null,
    });

    expect(stage).toBe("ready");
    expect(context.nextAllowedStages).toEqual(["publishing"]);

    const terminal = blockerResult.blockers.find(
      (b) => b.type === "invalid_transition"
    );
    expect(terminal).toBeUndefined();
  });

  it("only marks 'published' (publisher_status=completed) as terminal", () => {
    const { stage, blockerResult } = runPipelineForBlog({
      writer_status: "completed",
      publisher_status: "completed",
      title: "My Blog",
      writer_id: USER_ID,
      google_doc_url: "https://docs.google.com/doc",
      publisher_id: "publisher-1",
      scheduled_publish_date: "2026-01-01",
    });

    expect(stage).toBe("published");

    const terminal = blockerResult.blockers.find(
      (b) => b.type === "invalid_transition"
    );
    expect(terminal).toBeDefined();
  });
});
