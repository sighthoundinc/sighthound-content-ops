import { detectBlockers } from "@/lib/blocker-detector";
import { checkQuality } from "@/lib/quality-checker";
import {
  getNextStagesForStatus,
  getRequiredFieldsForStatus,
} from "@/lib/workflow-rules";
import { extractContextSync } from "@/app/api/ai/utils/context-extractor";
import type { BlogFacts } from "@/app/api/ai/utils/fact-provider";
import { routePrompt } from "@/app/api/ai/utils/prompt-router";
import { generateResponse } from "@/app/api/ai/utils/response-generator";

/**
 * End-to-end test for the RAG-based factual Q&A path.
 * We bypass Supabase by injecting a precomputed BlogFacts value —
 * this mirrors what the runtime pipeline does after fact-provider resolves.
 */

const USER_ID = "user-writer-1";
const BLOG_ID = "blog-1";

const publishedFacts: BlogFacts = {
  kind: "blog",
  id: BLOG_ID,
  title: "The Rise of Multi-Site Video Management",
  site: "sighthound.com",
  slug: "rise-of-multi-site-vms",
  writerName: "Ali Khan",
  writerEmail: "ali@sighthound.com",
  publisherName: "Jane Smith",
  publisherEmail: "jane@sighthound.com",
  googleDocUrl: "https://docs.google.com/doc/abc",
  liveUrl: "https://www.sighthound.com/blog/rise-of-multi-site-vms",
  createdAt: "2026-03-10T12:00:00.000Z",
  scheduledPublishDate: "2026-04-02",
  displayPublishedDate: "2026-04-02",
  actualPublishedAt: "2026-04-02T09:30:00.000Z",
  timeToPublishDays: 23,
  workflowStage: "published",
  writerStatus: "completed",
  publisherStatus: "completed",
};

function runPipeline(prompt: string, facts: BlogFacts | null) {
  const entityState = {
    status: facts?.workflowStage ?? "writing",
    fields: {
      title: !!facts?.title,
      writer_id: !!facts?.writerName,
      draft_doc_link: !!facts?.googleDocUrl,
      google_doc_url: !!facts?.googleDocUrl,
      publisher_id: !!facts?.publisherName,
      scheduled_publish_date: !!facts?.scheduledPublishDate,
    },
    ownerId: USER_ID,
    reviewerId: undefined as string | undefined,
    title: facts?.title,
  };

  const context = extractContextSync(
    {
      entityType: "blog",
      entityId: BLOG_ID,
      userId: USER_ID,
      userRole: "writer",
    },
    entityState,
    facts
  );

  const required = getRequiredFieldsForStatus("blog", context.currentStatus);
  const next = getNextStagesForStatus("blog", context.currentStatus);
  const blockerResult = detectBlockers({
    entityType: "blog",
    status: context.currentStatus,
    userRole: "writer",
    userIsOwner: true,
    userIsReviewer: false,
    fields: context.fields,
    requiredFieldsForStatus: required,
    nextAllowedStages: next,
  });
  const qualityResult = checkQuality({
    entityType: "blog",
    title: facts?.title,
  });
  const deterministic = generateResponse({
    context,
    blockers: blockerResult.blockers,
    qualityIssues: qualityResult.issues,
  });
  const routed = routePrompt({
    prompt,
    context,
    blockers: blockerResult.blockers,
    qualityIssues: qualityResult.issues,
    deterministicNextSteps: deterministic.nextSteps,
    canProceed: deterministic.canProceed,
  });

  return { context, routed };
}

describe("Ask AI — RAG factual Q&A (blogs)", () => {
  it("answers 'what is the name of this blog?' from facts", () => {
    const { routed } = runPipeline(
      "What is the name of this blog?",
      publishedFacts
    );
    expect(routed.intent).toBe("identity");
    expect(routed.answer).toContain("The Rise of Multi-Site Video Management");
    expect(routed.answer).toContain("sighthound.com");
    expect(routed.nextSteps).toEqual([]);
  });

  it("answers 'who is the writer?' with a resolved display name", () => {
    const { routed } = runPipeline("Who is the writer?", publishedFacts);
    expect(routed.intent).toBe("people");
    expect(routed.answer).toContain("Ali Khan");
    expect(routed.answer).toContain("wrote it");
  });

  it("answers 'who published this?' with the publisher name", () => {
    const { routed } = runPipeline("Who published this?", publishedFacts);
    expect(routed.intent).toBe("people");
    expect(routed.answer).toContain("Jane Smith");
    expect(routed.answer).toContain("publishing");
  });

  it("answers 'when was this published?' with a friendly date", () => {
    const { routed } = runPipeline(
      "When was this blog published?",
      publishedFacts
    );
    expect(routed.intent).toBe("timeline");
    expect(routed.answer.toLowerCase()).toContain("published");
    expect(routed.answer).toContain("Apr 2, 2026");
  });

  it("answers 'how long from draft to publish?' with a friendly duration", () => {
    const { routed } = runPipeline(
      "How long did it take from draft to publish?",
      publishedFacts
    );
    expect(routed.intent).toBe("timeline");
    expect(routed.answer).toContain("23 days");
    expect(routed.answer).toContain("draft to publish");
  });

  it("never leaks raw enum keys or UUIDs in factual answers", () => {
    const prompts = [
      "What is the title?",
      "Who is the writer?",
      "When was this published?",
    ];
    for (const p of prompts) {
      const { routed } = runPipeline(p, publishedFacts);
      const text = routed.answer.toLowerCase();
      expect(text).not.toContain("writer_id");
      expect(text).not.toContain("publisher_id");
      expect(text).not.toContain("writer_status");
      expect(text).not.toContain("publisher_status");
      // UUID-ish
      expect(text).not.toMatch(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}/);
    }
  });

  it("admits when a fact is missing (identity) without inventing a title", () => {
    const partialFacts: BlogFacts = {
      ...publishedFacts,
      title: undefined,
      site: undefined,
    };
    const { routed } = runPipeline("What is the title?", partialFacts);
    expect(routed.intent).toBe("identity");
    expect(routed.answer.toLowerCase()).toContain("don");
    expect(routed.answer.toLowerCase()).toContain("title");
  });

  it("admits when people facts are missing", () => {
    const partialFacts: BlogFacts = {
      ...publishedFacts,
      writerName: undefined,
      publisherName: undefined,
    };
    const { routed } = runPipeline("Who wrote this?", partialFacts);
    expect(routed.intent).toBe("people");
    expect(routed.answer.toLowerCase()).toContain("don");
  });

  it("falls back gracefully when facts are entirely unavailable", () => {
    const { routed } = runPipeline("What is the title of this blog?", null);
    // Factual intent still detected
    expect(routed.intent).toBe("identity");
    // But since facts are null, falls back to workflow-style answer (still harmless)
    expect(typeof routed.answer).toBe("string");
    expect(routed.answer.length).toBeGreaterThan(0);
  });

  it("does NOT misroute 'Why can't I publish this?' to a factual intent", () => {
    const { routed } = runPipeline(
      "Why can't I publish this blog?",
      publishedFacts
    );
    expect(routed.intent).toBe("blockers");
  });
});
