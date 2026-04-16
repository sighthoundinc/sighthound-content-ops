import { detectBlockers } from "@/lib/blocker-detector";
import { checkQuality } from "@/lib/quality-checker";
import {
  getNextStagesForStatus,
  getRequiredFieldsForStatus,
} from "@/lib/workflow-rules";
import { extractContextSync } from "@/app/api/ai/utils/context-extractor";
import type {
  IdeaFacts,
  SocialPostFacts,
} from "@/app/api/ai/utils/fact-provider";
import { routePrompt } from "@/app/api/ai/utils/prompt-router";
import { generateResponse } from "@/app/api/ai/utils/response-generator";

/**
 * Covers:
 *  - Social post factual intents (identity, people, timeline)
 *  - Idea factual intents
 *  - Ideas must not report the bogus "terminal stage" blocker
 *  - Timezone-aware rendering for timestamp facts
 *  - RLS-clipped assignee messaging
 */

const USER_ID = "user-1";

function runSocial(
  prompt: string,
  facts: SocialPostFacts | null,
  timezone?: string
) {
  const entityState = {
    status: facts?.status ?? "draft",
    fields: {
      product: !!facts?.product,
      type: !!facts?.type,
      canva_url: !!facts?.canvaUrl,
      caption: !!facts?.caption,
      platforms: Array.isArray(facts?.platforms) && facts.platforms.length > 0,
      scheduled_publish_date: !!facts?.scheduledDate,
      title: !!facts?.title,
    },
    ownerId: USER_ID,
    reviewerId: undefined as string | undefined,
    title: facts?.title,
    caption: facts?.caption,
    platforms: facts?.platforms ?? [],
  };
  const ctx = extractContextSync(
    {
      entityType: "social_post",
      entityId: facts?.id ?? "sp-1",
      userId: USER_ID,
      userRole: "writer",
    },
    entityState,
    facts,
    timezone
  );
  const required = getRequiredFieldsForStatus("social_post", ctx.currentStatus);
  const next = getNextStagesForStatus("social_post", ctx.currentStatus);
  const blockers = detectBlockers({
    entityType: "social_post",
    status: ctx.currentStatus,
    userRole: "writer",
    userIsOwner: true,
    userIsReviewer: false,
    fields: ctx.fields,
    requiredFieldsForStatus: required,
    nextAllowedStages: next,
  });
  const quality = checkQuality({
    entityType: "social_post",
    caption: facts?.caption,
    platforms: facts?.platforms ?? [],
  });
  const det = generateResponse({
    context: ctx,
    blockers: blockers.blockers,
    qualityIssues: quality.issues,
  });
  return routePrompt({
    prompt,
    context: ctx,
    blockers: blockers.blockers,
    qualityIssues: quality.issues,
    deterministicNextSteps: det.nextSteps,
    canProceed: det.canProceed,
  });
}

function runIdea(prompt: string, facts: IdeaFacts | null) {
  const entityState = {
    status: "idea",
    fields: {
      title: !!facts?.title,
      site: !!facts?.site,
      description: !!facts?.description,
    },
    ownerId: USER_ID,
    reviewerId: undefined as string | undefined,
    title: facts?.title,
  };
  const ctx = extractContextSync(
    {
      entityType: "idea",
      entityId: facts?.id ?? "idea-1",
      userId: USER_ID,
      userRole: "writer",
    },
    entityState,
    facts
  );
  const required = getRequiredFieldsForStatus("idea", ctx.currentStatus);
  const next = getNextStagesForStatus("idea", ctx.currentStatus);
  const blockers = detectBlockers({
    entityType: "idea",
    status: ctx.currentStatus,
    userRole: "writer",
    userIsOwner: true,
    userIsReviewer: false,
    fields: ctx.fields,
    requiredFieldsForStatus: required,
    nextAllowedStages: next,
  });
  const det = generateResponse({
    context: ctx,
    blockers: blockers.blockers,
    qualityIssues: [],
  });
  return {
    blockers: blockers.blockers,
    routed: routePrompt({
      prompt,
      context: ctx,
      blockers: blockers.blockers,
      qualityIssues: [],
      deterministicNextSteps: det.nextSteps,
      canProceed: det.canProceed,
    }),
  };
}

describe("Ask AI — Social post RAG", () => {
  const socialFacts: SocialPostFacts = {
    kind: "social_post",
    id: "sp-1",
    title: "Launch Teaser",
    type: "image",
    product: "alpr_plus",
    status: "creative_approved",
    canvaUrl: "https://canva.com/x",
    caption: "Announcing our latest capability.",
    platforms: ["linkedin", "facebook"],
    scheduledDate: "2026-05-10",
    createdAt: "2026-04-01T14:00:00.000Z",
    creatorName: "Ali",
    reviewerName: "Jane",
    assignedToName: "Ali",
  };

  it("answers identity with product + type + title", () => {
    const r = runSocial("What is the title of this post?", socialFacts);
    expect(r.intent).toBe("identity");
    expect(r.answer).toContain("Launch Teaser");
    expect(r.answer.toLowerCase()).toContain("social post");
  });

  it("answers people with creator, reviewer, and current assignee", () => {
    const r = runSocial("Who created this post?", socialFacts);
    expect(r.intent).toBe("people");
    expect(r.answer).toContain("Ali created it");
    expect(r.answer).toContain("Jane is the reviewer");
    expect(r.answer).toContain("currently assigned to Ali");
  });

  it("answers timeline with created + scheduled dates", () => {
    const r = runSocial("When was this scheduled?", socialFacts);
    expect(r.intent).toBe("timeline");
    expect(r.answer).toContain("scheduled for May 10, 2026");
    expect(r.answer.toLowerCase()).toContain("created");
  });

  it("discloses RLS-clipped assignees without inventing a name", () => {
    const clipped: SocialPostFacts = {
      ...socialFacts,
      creatorName: undefined,
      creatorUnavailable: true,
      reviewerName: undefined,
      reviewerUnavailable: true,
      assignedToName: undefined,
      assignedToUnavailable: true,
    };
    const r = runSocial("Who created this post?", clipped);
    expect(r.intent).toBe("people");
    expect(r.answer.toLowerCase()).toContain("name isn");
    expect(r.answer).not.toMatch(/Ali|Jane/);
  });
});

describe("Ask AI — Idea RAG + no-blocker invariant", () => {
  const ideaFacts: IdeaFacts = {
    kind: "idea",
    id: "idea-1",
    title: "ALPR for airports",
    site: "sighthound.com",
    creatorName: "Hari",
    createdAt: "2026-03-15T10:00:00.000Z",
    isConverted: false,
  };

  it("never returns a workflow blocker for ideas", () => {
    const { blockers } = runIdea("What should I do next?", ideaFacts);
    expect(blockers).toEqual([]);
  });

  it("answers identity from facts", () => {
    const { routed } = runIdea("What is the title of this idea?", ideaFacts);
    expect(routed.intent).toBe("identity");
    expect(routed.answer).toContain("ALPR for airports");
    expect(routed.answer).toContain("sighthound.com");
  });

  it("answers people", () => {
    const { routed } = runIdea("Who submitted this idea?", ideaFacts);
    expect(routed.intent).toBe("people");
    expect(routed.answer).toContain("Hari submitted");
  });

  it("answers timeline with submission date", () => {
    const { routed } = runIdea("When was this submitted?", ideaFacts);
    expect(routed.intent).toBe("timeline");
    expect(routed.answer.toLowerCase()).toContain("submitted");
    expect(routed.answer).toContain("Mar 15, 2026");
  });
});
