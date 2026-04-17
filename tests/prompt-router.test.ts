import { routePrompt } from "@/app/api/ai/utils/prompt-router";
import type { ExtractedContext } from "@/app/api/ai/utils/context-extractor";

function createContext(overrides: Partial<ExtractedContext> = {}): ExtractedContext {
  return {
    entityType: "social_post",
    entityId: "social-123",
    userId: "user-123",
    userRole: "writer",
    currentStatus: "ready_to_publish",
    userIsOwner: true,
    userIsReviewer: false,
    fields: {
      product: true,
      type: true,
      canva_url: true,
      caption: false,
      platforms: true,
      scheduled_publish_date: true
    },
    nextAllowedStages: ["awaiting_live_link"],
    workflowDefinition: {
      entityType: "social_post",
      stages: ["ready_to_publish", "awaiting_live_link", "published"],
      transitions: {
        ready_to_publish: ["awaiting_live_link"],
        awaiting_live_link: ["published"],
        published: []
      },
      requiredFieldsByStage: {
        ready_to_publish: ["product", "type", "canva_url", "caption", "platforms", "scheduled_publish_date"],
        awaiting_live_link: ["live_link"],
        published: []
      },
      description: "Social workflow"
    },
    extractedAt: new Date().toISOString(),
    ...overrides
  };
}

describe("prompt-router", () => {
  it("routes blocker question to blocker intent", () => {
    const routed = routePrompt({
      prompt: "Why can't I publish this?",
      context: createContext(),
      blockers: [
        {
          type: "missing_field",
          field: "caption",
          message: "caption is required",
          severity: "critical"
        }
      ],
      qualityIssues: [],
      deterministicNextSteps: ["Fill in the required field: caption"],
      canProceed: false
    });

    expect(routed.intent).toBe("blockers");
    expect(routed.answer.toLowerCase()).toMatch(/stuck|blocked|missing/);
    expect(routed.nextSteps.length).toBeGreaterThan(0);
  });

  it("routes requirement question to requirement intent and surfaces missing fields", () => {
    const routed = routePrompt({
      prompt: "What fields are required before I can continue?",
      context: createContext(),
      blockers: [
        {
          type: "missing_field",
          field: "caption",
          message: "caption is required",
          severity: "critical"
        }
      ],
      qualityIssues: [],
      deterministicNextSteps: ["Fill in the required field: caption"],
      canProceed: false
    });

    expect(routed.intent).toBe("requirements");
    expect(routed.nextSteps.some((step) => step.toLowerCase().includes("caption"))).toBe(true);
  });

  it("falls back to default prompt when empty prompt is provided", () => {
    const routed = routePrompt({
      prompt: "   ",
      context: createContext(),
      blockers: [],
      qualityIssues: [],
      deterministicNextSteps: ["Ready to move to the next stage: \"awaiting_live_link\""],
      canProceed: true
    });

    expect(routed.prompt).toBe("What should I do next?");
    expect(routed.nextSteps.length).toBeGreaterThan(0);
  });
});
