import {
  validateAIRequest,
  resultToAPIResponse,
  createErrorResponse,
  isSuccessResponse,
  isErrorResponse
} from "@/app/api/ai/models";
import { generateResponse } from "@/app/api/ai/utils/response-generator";
import { extractContextSync } from "@/app/api/ai/utils/context-extractor";

describe("API Assistant Integration", () => {
  describe("Request Validation", () => {
    it("should validate correct request", () => {
      const request = {
        entityType: "blog",
        entityId: "blog-123",
        userId: "user-456",
        userRole: "writer"
      };
      const result = validateAIRequest(request);

      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it("should reject missing entityType", () => {
      const request = {
        entityId: "blog-123",
        userId: "user-456",
        userRole: "writer"
      };
      const result = validateAIRequest(request);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ field: "entityType" })
      );
    });

    it("should reject invalid entityType", () => {
      const request = {
        entityType: "invalid",
        entityId: "blog-123",
        userId: "user-456",
        userRole: "writer"
      };
      const result = validateAIRequest(request);

      expect(result.valid).toBe(false);
    });

    it("should reject missing entityId", () => {
      const request = {
        entityType: "blog",
        userId: "user-456",
        userRole: "writer"
      };
      const result = validateAIRequest(request);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ field: "entityId" })
      );
    });

    it("should reject missing userId", () => {
      const request = {
        entityType: "blog",
        entityId: "blog-123",
        userRole: "writer"
      };
      const result = validateAIRequest(request);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ field: "userId" })
      );
    });

    it("should reject invalid userRole", () => {
      const request = {
        entityType: "blog",
        entityId: "blog-123",
        userId: "user-456",
        userRole: "invalid"
      };
      const result = validateAIRequest(request);

      expect(result.valid).toBe(false);
    });

    it("should reject non-object body", () => {
      const result = validateAIRequest("not an object");

      expect(result.valid).toBe(false);
    });
  });

  describe("Response Conversion", () => {
    it("should convert deterministic result to API response", () => {
      const context = {
        entityType: "blog" as const,
        entityId: "blog-123",
        userId: "user-456",
        userRole: "writer" as const,
        currentStatus: "draft",
        userIsOwner: true,
        userIsReviewer: false,
        fields: { title: true, writer_id: true },
        nextAllowedStages: ["writer_review"],
        workflowDefinition: { transitions: {} },
        extractedAt: new Date().toISOString()
      };

      const result = generateResponse({
        context,
        blockers: [],
        qualityIssues: [],
        qualityScore: 100
      });

      const apiResponse = resultToAPIResponse(result);

      expect(apiResponse.success).toBe(true);
      expect(apiResponse.data).toBeDefined();
      expect(apiResponse.data?.currentState.status).toBe("draft");
    });

    it("should include all required fields in response", () => {
      const context = {
        entityType: "blog" as const,
        entityId: "blog-123",
        userId: "user-456",
        userRole: "writer" as const,
        currentStatus: "draft",
        userIsOwner: true,
        userIsReviewer: false,
        fields: { title: true, writer_id: true },
        nextAllowedStages: ["writer_review"],
        workflowDefinition: { transitions: {} },
        extractedAt: new Date().toISOString()
      };

      const result = generateResponse({
        context,
        blockers: [],
        qualityIssues: [],
        qualityScore: 100
      });

      const apiResponse = resultToAPIResponse(result);

      expect(apiResponse.data?.currentState).toBeDefined();
      expect(apiResponse.data?.blockers).toBeDefined();
      expect(apiResponse.data?.nextSteps).toBeDefined();
      expect(apiResponse.data?.qualityIssues).toBeDefined();
      expect(apiResponse.data?.canProceed).toBeDefined();
      expect(apiResponse.data?.confidence).toBeDefined();
    });
  });

  describe("Error Response", () => {
    it("should create error response", () => {
      const response = createErrorResponse("INVALID_INPUT", "Test error");

      expect(response.success).toBe(false);
      expect(response.error.code).toBe("INVALID_INPUT");
      expect(response.error.message).toBe("Test error");
      expect(response.generatedAt).toBeDefined();
    });

    it("should support all error codes", () => {
      const codes = ["INVALID_INPUT", "NOT_FOUND", "UNAUTHORIZED", "INTERNAL_ERROR"] as const;

      codes.forEach((code) => {
        const response = createErrorResponse(code, "Test");
        expect(response.error.code).toBe(code);
      });
    });
  });

  describe("Type Guards", () => {
    it("should identify success response", () => {
      const context = {
        entityType: "blog" as const,
        entityId: "blog-123",
        userId: "user-456",
        userRole: "writer" as const,
        currentStatus: "draft",
        userIsOwner: true,
        userIsReviewer: false,
        fields: { title: true, writer_id: true },
        nextAllowedStages: ["writer_review"],
        workflowDefinition: { transitions: {} },
        extractedAt: new Date().toISOString()
      };

      const result = generateResponse({
        context,
        blockers: [],
        qualityIssues: [],
        qualityScore: 100
      });

      const apiResponse = resultToAPIResponse(result);

      expect(isSuccessResponse(apiResponse)).toBe(true);
      expect(isErrorResponse(apiResponse)).toBe(false);
    });

    it("should identify error response", () => {
      const errorResponse = createErrorResponse("INVALID_INPUT", "Test");

      expect(isSuccessResponse(errorResponse)).toBe(false);
      expect(isErrorResponse(errorResponse)).toBe(true);
    });
  });

  describe("End-to-End Scenarios", () => {
    it("should handle blog scenario", () => {
      const request = {
        entityType: "blog" as const,
        entityId: "blog-123",
        userId: "user-456",
        userRole: "writer" as const
      };

      const validation = validateAIRequest(request);
      expect(validation.valid).toBe(true);
    });

    it("should handle social post scenario", () => {
      const request = {
        entityType: "social_post" as const,
        entityId: "social-123",
        userId: "user-789",
        userRole: "editor" as const
      };

      const validation = validateAIRequest(request);
      expect(validation.valid).toBe(true);
    });

    it("should handle admin scenario", () => {
      const request = {
        entityType: "idea" as const,
        entityId: "idea-123",
        userId: "admin-1",
        userRole: "admin" as const
      };

      const validation = validateAIRequest(request);
      expect(validation.valid).toBe(true);
    });
  });
});
