import {
  generateResponse,
  formatResponseAsText,
  ResponseGeneratorInput,
  DeterministicResult
} from "@/app/api/ai/utils/response-generator";
import { ExtractedContext } from "@/app/api/ai/utils/context-extractor";
import { Blocker } from "@/lib/blocker-detector";
import { QualityIssue } from "@/lib/quality-checker";

describe("Response Generator", () => {
  function createContext(overrides: Partial<ExtractedContext> = {}): ExtractedContext {
    return {
      entityType: "blog",
      entityId: "blog-123",
      userId: "user-456",
      userRole: "writer",
      currentStatus: "draft",
      userIsOwner: true,
      userIsReviewer: false,
      fields: { title: true, writer_id: true },
      nextAllowedStages: ["writer_review"],
      workflowDefinition: {
        transitions: { draft: ["writer_review"], writer_review: [] },
        requiredFieldsByStage: { writer_review: ["draft_doc_link"] }
      },
      extractedAt: new Date().toISOString(),
      ...overrides
    };
  }

  function createInput(overrides: Partial<ResponseGeneratorInput> = {}): ResponseGeneratorInput {
    return {
      context: createContext(),
      blockers: [],
      qualityIssues: [],
      qualityScore: 100,
      ...overrides
    };
  }

  describe("Response Generation", () => {
    it("should generate response with no blockers", () => {
      const input = createInput();
      const result = generateResponse(input);

      expect(result.currentState.status).toBe("draft");
      expect(result.blockers).toEqual([]);
      expect(result.canProceed).toBe(true);
    });

    it("should set canProceed to false with critical blockers", () => {
      const input = createInput({
        blockers: [
          {
            type: "missing_field",
            field: "title",
            severity: "critical",
            message: "Title is required"
          }
        ]
      });
      const result = generateResponse(input);

      expect(result.canProceed).toBe(false);
    });

    it("should set canProceed to true with warnings only", () => {
      const input = createInput({
        blockers: [
          {
            type: "permission",
            severity: "warning",
            message: "You are not a reviewer"
          }
        ]
      });
      const result = generateResponse(input);

      expect(result.canProceed).toBe(true);
    });

    it("should include blockers in result", () => {
      const blocker: Blocker = {
        type: "missing_field",
        field: "title",
        severity: "critical",
        message: "Title is required"
      };
      const input = createInput({ blockers: [blocker] });
      const result = generateResponse(input);

      expect(result.blockers).toContain(blocker);
    });

    it("should include quality issues in result", () => {
      const issue: QualityIssue = {
        type: "title_too_short",
        field: "title",
        severity: "warning",
        message: "Title is too short",
        currentLength: 3,
        minLength: 5
      };
      const input = createInput({ qualityIssues: [issue] });
      const result = generateResponse(input);

      expect(result.qualityIssues).toContain(issue);
    });

    it("should generate next steps", () => {
      const input = createInput();
      const result = generateResponse(input);

      expect(result.nextSteps.length).toBeGreaterThan(0);
      expect(result.nextSteps[0]).toContain("writer_review");
    });

    it("should include confidence score", () => {
      const input = createInput();
      const result = generateResponse(input);

      expect(result.confidence).toBe(99);
    });

    it("should include generated timestamp", () => {
      const input = createInput();
      const result = generateResponse(input);

      expect(result.generatedAt).toBeDefined();
      expect(new Date(result.generatedAt)).toBeInstanceOf(Date);
    });
  });

  describe("Next Steps Generation", () => {
    it("should suggest next stage when no blockers", () => {
      const input = createInput();
      const result = generateResponse(input);

      expect(result.nextSteps.some((s) => s.includes("writer_review"))).toBe(true);
    });

    it("should list critical blockers in steps", () => {
      const input = createInput({
        blockers: [
          {
            type: "missing_field",
            field: "title",
            severity: "critical",
            message: "Title is required"
          }
        ]
      });
      const result = generateResponse(input);

      expect(result.nextSteps.some((s) => s.includes("title"))).toBe(true);
    });

    it("should handle terminal status", () => {
      const input = createInput({
        context: createContext({
          currentStatus: "completed",
          nextAllowedStages: []
        })
      });
      const result = generateResponse(input);

      expect(result.nextSteps.some((s) => s.includes("final stage"))).toBe(true);
    });

    it("should include ownership message when not owner", () => {
      const input = createInput({
        context: createContext({ userIsOwner: false }),
        blockers: [
          {
            type: "ownership",
            severity: "critical",
            message: "Not the owner"
          }
        ]
      });
      const result = generateResponse(input);

      expect(result.nextSteps.some((s) => s.includes("owner"))).toBe(true);
    });
  });

  describe("Response Formatting", () => {
    it("should format response as text", () => {
      const input = createInput();
      const result = generateResponse(input);
      const text = formatResponseAsText(result);

      expect(text).toContain("Workflow Guidance");
      expect(text).toContain("draft");
      expect(text).toContain("writer");
    });

    it("should include issues in formatted text", () => {
      const input = createInput({
        blockers: [
          {
            type: "missing_field",
            field: "title",
            severity: "critical",
            message: "Title is required"
          }
        ]
      });
      const result = generateResponse(input);
      const text = formatResponseAsText(result);

      expect(text).toContain("Issues Found");
      expect(text).toContain("Title is required");
    });

    it("should include next steps in formatted text", () => {
      const input = createInput();
      const result = generateResponse(input);
      const text = formatResponseAsText(result);

      expect(text).toContain("Next Steps");
    });

    it("should include quality feedback in formatted text", () => {
      const input = createInput({
        qualityIssues: [
          {
            type: "title_too_short",
            field: "title",
            severity: "warning",
            message: "Title is too short",
            currentLength: 3,
            minLength: 5
          }
        ]
      });
      const result = generateResponse(input);
      const text = formatResponseAsText(result);

      expect(text).toContain("Quality Feedback");
      expect(text).toContain("Title is too short");
    });

    it("should show ready message when can proceed", () => {
      const input = createInput();
      const result = generateResponse(input);
      const text = formatResponseAsText(result);

      expect(text).toContain("Ready to proceed");
    });

    it("should show blocked message when cannot proceed", () => {
      const input = createInput({
        context: createContext({ nextAllowedStages: [] })
      });
      const result = generateResponse(input);
      const text = formatResponseAsText(result);

      expect(text).toContain("Cannot proceed");
    });
  });

  describe("Multiple Scenarios", () => {
    it("should handle social post scenario", () => {
      const input = createInput({
        context: createContext({
          entityType: "social_post",
          currentStatus: "in_review",
          fields: { product: true, type: true, canva_url: true }
        })
      });
      const result = generateResponse(input);

      expect(result.currentState.entityType).toBe("social_post");
      expect(result.nextSteps.length).toBeGreaterThan(0);
    });

    it("should handle complex blocker scenario", () => {
      const input = createInput({
        blockers: [
          {
            type: "missing_field",
            field: "title",
            severity: "critical",
            message: "Title is required"
          },
          {
            type: "missing_field",
            field: "draft_doc_link",
            severity: "critical",
            message: "Draft doc link is required"
          }
        ]
      });
      const result = generateResponse(input);

      expect(result.blockers.length).toBe(2);
      expect(result.canProceed).toBe(false);
      expect(result.nextSteps.length).toBeGreaterThan(0);
    });
  });
});
