import { detectBlockers, DetectorInput, BlockerResult } from "@/lib/blocker-detector";

describe("Blocker Detector", () => {
  // Helper: Create base input
  function createInput(overrides: Partial<DetectorInput> = {}): DetectorInput {
    return {
      entityType: "blog",
      status: "draft",
      userRole: "writer",
      userIsOwner: true,
      userIsReviewer: false,
      fields: { title: true, writer_id: true },
      requiredFieldsForStatus: ["title", "writer_id"],
      nextAllowedStages: ["writer_review"],
      ...overrides
    };
  }

  describe("Missing Field Detection", () => {
    it("should detect missing title", () => {
      const input = createInput({
        fields: { title: false, writer_id: true },
        requiredFieldsForStatus: ["title", "writer_id"]
      });
      const result = detectBlockers(input);

      expect(result.blockers).toContainEqual(
        expect.objectContaining({
          type: "missing_field",
          field: "title",
          severity: "critical"
        })
      );
      expect(result.canProceedToNextStage).toBe(false);
    });

    it("should detect multiple missing fields", () => {
      const input = createInput({
        fields: { title: false, writer_id: false },
        requiredFieldsForStatus: ["title", "writer_id"]
      });
      const result = detectBlockers(input);

      // Intent: detect exactly one missing_field blocker per missing field.
      // Total blocker count is not strictly constrained because other detectors
      // (e.g. reviewer_assignment in execution stages) legitimately add warnings.
      expect(result.blockers.filter((b) => b.type === "missing_field").length).toBe(2);
    });

    it("should not detect blockers when all fields present", () => {
      const input = createInput({
        fields: { title: true, writer_id: true }
      });
      const result = detectBlockers(input);

      const fieldBlockers = result.blockers.filter((b) => b.type === "missing_field");
      expect(fieldBlockers.length).toBe(0);
    });
  });

  describe("Permission Detection", () => {
    it("should not block admin user", () => {
      const input = createInput({
        userRole: "admin"
      });
      const result = detectBlockers(input);

      const permBlockers = result.blockers.filter((b) => b.type === "permission");
      expect(permBlockers.length).toBe(0);
    });

    it("should warn if user is not reviewer", () => {
      const input = createInput({
        status: "writer_review",
        userRole: "writer",
        userIsReviewer: false
      });
      const result = detectBlockers(input);

      expect(result.blockers).toContainEqual(
        expect.objectContaining({
          type: "permission",
          severity: "warning"
        })
      );
    });

    it("should not warn if user is reviewer", () => {
      const input = createInput({
        status: "writer_review",
        userRole: "editor",
        userIsReviewer: true
      });
      const result = detectBlockers(input);

      const warningBlockers = result.blockers.filter((b) => b.severity === "warning");
      expect(warningBlockers.length).toBe(0);
    });
  });

  describe("Ownership Detection", () => {
    it("should block user not owner in draft", () => {
      const input = createInput({
        status: "draft",
        userIsOwner: false,
        userRole: "writer"
      });
      const result = detectBlockers(input);

      expect(result.blockers).toContainEqual(
        expect.objectContaining({
          type: "ownership",
          severity: "critical"
        })
      );
      expect(result.canProceedToNextStage).toBe(false);
    });

    it("should allow owner in draft", () => {
      const input = createInput({
        status: "draft",
        userIsOwner: true
      });
      const result = detectBlockers(input);

      const ownershipBlockers = result.blockers.filter((b) => b.type === "ownership");
      expect(ownershipBlockers.length).toBe(0);
    });

    it("should allow admin even if not owner", () => {
      const input = createInput({
        status: "draft",
        userIsOwner: false,
        userRole: "admin"
      });
      const result = detectBlockers(input);

      const ownershipBlockers = result.blockers.filter((b) => b.type === "ownership");
      expect(ownershipBlockers.length).toBe(0);
    });
  });

  describe("Social Post Blockers", () => {
    it("should detect missing caption for social post", () => {
      const input = createInput({
        entityType: "social_post",
        status: "creative_approved",
        fields: {
          product: true,
          type: true,
          canva_url: true,
          caption: false,
          platforms: true,
          scheduled_publish_date: true
        },
        requiredFieldsForStatus: ["product", "type", "canva_url", "caption", "platforms", "scheduled_publish_date"]
      });
      const result = detectBlockers(input);

      expect(result.blockers).toContainEqual(
        expect.objectContaining({
          field: "caption",
          severity: "critical"
        })
      );
    });

    it("should detect missing platforms", () => {
      const input = createInput({
        entityType: "social_post",
        status: "creative_approved",
        fields: {
          product: true,
          type: true,
          canva_url: true,
          caption: true,
          platforms: false,
          scheduled_publish_date: true
        },
        requiredFieldsForStatus: ["product", "type", "canva_url", "caption", "platforms", "scheduled_publish_date"]
      });
      const result = detectBlockers(input);

      expect(result.blockers).toContainEqual(
        expect.objectContaining({
          field: "platforms",
          severity: "critical"
        })
      );
    });
  });

  describe("Transition Validation", () => {
    it("should allow transition when no blockers", () => {
      const input = createInput({
        fields: { title: true, writer_id: true },
        nextAllowedStages: ["writer_review"]
      });
      const result = detectBlockers(input);

      const criticalBlockers = result.blockers.filter((b) => b.severity === "critical");
      expect(criticalBlockers.length).toBe(0);
      expect(result.canProceedToNextStage).toBe(true);
    });

    it("should not allow transition with missing fields", () => {
      const input = createInput({
        fields: { title: false, writer_id: true },
        nextAllowedStages: ["writer_review"]
      });
      const result = detectBlockers(input);

      expect(result.canProceedToNextStage).toBe(false);
    });

    it("should not allow transition from terminal stage", () => {
      const input = createInput({
        status: "completed",
        nextAllowedStages: []
      });
      const result = detectBlockers(input);

      expect(result.canProceedToNextStage).toBe(false);
    });
  });

  describe("Blocker Severity", () => {
    it("should mark field blockers as critical", () => {
      const input = createInput({
        fields: { title: false, writer_id: true }
      });
      const result = detectBlockers(input);

      const fieldBlockers = result.blockers.filter((b) => b.type === "missing_field");
      expect(fieldBlockers.every((b) => b.severity === "critical")).toBe(true);
    });

    it("should mark reviewer warning as non-critical", () => {
      const input = createInput({
        status: "writer_review",
        userRole: "writer",
        userIsReviewer: false
      });
      const result = detectBlockers(input);

      const warnings = result.blockers.filter((b) => b.severity === "warning");
      expect(warnings.length > 0).toBe(true);
      expect(result.canProceedToNextStage).toBe(true); // Warning doesn't block
    });
  });
});
