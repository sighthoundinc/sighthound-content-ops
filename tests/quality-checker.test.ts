import { checkQuality, QualityCheckInput, getQualityRules } from "@/lib/quality-checker";

describe("Quality Checker", () => {
  const rules = getQualityRules();

  // Helper: Create base social post input
  function createSocialPostInput(overrides: Partial<QualityCheckInput> = {}): QualityCheckInput {
    return {
      entityType: "social_post",
      caption: "This is a great social media post with enough content",
      platforms: ["linkedin", "twitter"],
      ...overrides
    };
  }

  // Helper: Create base blog input
  function createBlogInput(overrides: Partial<QualityCheckInput> = {}): QualityCheckInput {
    return {
      entityType: "blog",
      title: "This is a well-written blog title",
      ...overrides
    };
  }

  describe("Social Post Caption Checks", () => {
    it("should detect caption that is too short", () => {
      const input = createSocialPostInput({
        caption: "Short"
      });
      const result = checkQuality(input);

      expect(result.issues).toContainEqual(
        expect.objectContaining({
          type: "caption_too_short",
          severity: "warning",
          field: "caption"
        })
      );
    });

    it("should not flag empty caption as too short", () => {
      const input = createSocialPostInput({
        caption: ""
      });
      const result = checkQuality(input);

      const shortIssues = result.issues.filter((i) => i.type === "caption_too_short");
      expect(shortIssues.length).toBe(0);
    });

    it("should detect caption that is too long", () => {
      const input = createSocialPostInput({
        caption: "a".repeat(rules.CAPTION.MAX_LENGTH + 1)
      });
      const result = checkQuality(input);

      expect(result.issues).toContainEqual(
        expect.objectContaining({
          type: "caption_too_long",
          severity: "error",
          field: "caption"
        })
      );
    });

    it("should not flag caption within limits", () => {
      const input = createSocialPostInput({
        caption: "This is a perfect caption with exactly the right length for sharing."
      });
      const result = checkQuality(input);

      const captionIssues = result.issues.filter((i) => i.field === "caption");
      expect(captionIssues.length).toBe(0);
    });

    it("should accept caption at maximum length", () => {
      const input = createSocialPostInput({
        caption: "a".repeat(rules.CAPTION.MAX_LENGTH)
      });
      const result = checkQuality(input);

      const tooLongIssues = result.issues.filter((i) => i.type === "caption_too_long");
      expect(tooLongIssues.length).toBe(0);
    });

    it("should accept caption at minimum length", () => {
      const input = createSocialPostInput({
        caption: "a".repeat(rules.CAPTION.MIN_LENGTH)
      });
      const result = checkQuality(input);

      const shortIssues = result.issues.filter((i) => i.type === "caption_too_short");
      expect(shortIssues.length).toBe(0);
    });

    it("should include character count in error message", () => {
      const input = createSocialPostInput({
        caption: "a".repeat(rules.CAPTION.MAX_LENGTH + 10)
      });
      const result = checkQuality(input);

      const tooLongIssue = result.issues.find((i) => i.type === "caption_too_long");
      expect(tooLongIssue?.currentLength).toBe(rules.CAPTION.MAX_LENGTH + 10);
      expect(tooLongIssue?.maxLength).toBe(rules.CAPTION.MAX_LENGTH);
    });
  });

  describe("Social Post Platform Checks", () => {
    it("should detect when no platforms are selected", () => {
      const input = createSocialPostInput({
        platforms: []
      });
      const result = checkQuality(input);

      expect(result.issues).toContainEqual(
        expect.objectContaining({
          type: "no_platforms_selected",
          severity: "error",
          field: "platforms"
        })
      );
    });

    it("should detect when platforms array has empty strings", () => {
      const input = createSocialPostInput({
        platforms: ["", "  ", ""]
      });
      const result = checkQuality(input);

      expect(result.issues).toContainEqual(
        expect.objectContaining({
          type: "no_platforms_selected",
          severity: "error"
        })
      );
    });

    it("should accept one platform", () => {
      const input = createSocialPostInput({
        platforms: ["twitter"]
      });
      const result = checkQuality(input);

      const platformIssues = result.issues.filter((i) => i.type === "no_platforms_selected");
      expect(platformIssues.length).toBe(0);
    });

    it("should accept multiple platforms", () => {
      const input = createSocialPostInput({
        platforms: ["twitter", "linkedin", "instagram"]
      });
      const result = checkQuality(input);

      const platformIssues = result.issues.filter((i) => i.type === "no_platforms_selected");
      expect(platformIssues.length).toBe(0);
    });

    it("should handle undefined platforms", () => {
      const input = createSocialPostInput({
        platforms: undefined
      });
      const result = checkQuality(input);

      // Should not have platform issues if platforms are undefined
      expect(result.issues.filter((i) => i.field === "platforms").length).toBe(0);
    });
  });

  describe("Blog Title Checks", () => {
    it("should detect title that is too short", () => {
      const input = createBlogInput({
        title: "ABC"
      });
      const result = checkQuality(input);

      expect(result.issues).toContainEqual(
        expect.objectContaining({
          type: "title_too_short",
          severity: "warning",
          field: "title"
        })
      );
    });

    it("should not flag empty title as too short", () => {
      const input = createBlogInput({
        title: ""
      });
      const result = checkQuality(input);

      const shortIssues = result.issues.filter((i) => i.type === "title_too_short");
      expect(shortIssues.length).toBe(0);
    });

    it("should detect title that is too long", () => {
      const input = createBlogInput({
        title: "a".repeat(rules.TITLE.MAX_LENGTH + 1)
      });
      const result = checkQuality(input);

      expect(result.issues).toContainEqual(
        expect.objectContaining({
          type: "title_too_long",
          severity: "error",
          field: "title"
        })
      );
    });

    it("should not flag title within limits", () => {
      const input = createBlogInput({
        title: "Understanding Modern Web Development"
      });
      const result = checkQuality(input);

      const titleIssues = result.issues.filter((i) => i.field === "title");
      expect(titleIssues.length).toBe(0);
    });

    it("should accept title at maximum length", () => {
      const input = createBlogInput({
        title: "a".repeat(rules.TITLE.MAX_LENGTH)
      });
      const result = checkQuality(input);

      const tooLongIssues = result.issues.filter((i) => i.type === "title_too_long");
      expect(tooLongIssues.length).toBe(0);
    });

    it("should accept title at minimum length", () => {
      const input = createBlogInput({
        title: "a".repeat(rules.TITLE.MIN_LENGTH)
      });
      const result = checkQuality(input);

      const shortIssues = result.issues.filter((i) => i.type === "title_too_short");
      expect(shortIssues.length).toBe(0);
    });

    it("should include character count in error message", () => {
      const input = createBlogInput({
        title: "a".repeat(rules.TITLE.MAX_LENGTH + 15)
      });
      const result = checkQuality(input);

      const tooLongIssue = result.issues.find((i) => i.type === "title_too_long");
      expect(tooLongIssue?.currentLength).toBe(rules.TITLE.MAX_LENGTH + 15);
      expect(tooLongIssue?.maxLength).toBe(rules.TITLE.MAX_LENGTH);
    });
  });

  describe("Quality Score Calculation", () => {
    it("should return 100 when no issues", () => {
      const input = createSocialPostInput();
      const result = checkQuality(input);

      expect(result.qualityScore).toBe(100);
    });

    it("should deduct 10 points for each warning", () => {
      const input = createSocialPostInput({
        caption: "Short"
      });
      const result = checkQuality(input);

      expect(result.qualityScore).toBe(90);
    });

    it("should deduct 20 points for each error", () => {
      const input = createSocialPostInput({
        platforms: []
      });
      const result = checkQuality(input);

      expect(result.qualityScore).toBe(80);
    });

    it("should deduct points for multiple issues", () => {
      const input = createSocialPostInput({
        caption: "Short",
        platforms: []
      });
      const result = checkQuality(input);

      expect(result.qualityScore).toBe(70); // 100 - 10 (warning) - 20 (error)
    });

    it("should not go below 0", () => {
      const input = createSocialPostInput({
        caption: "a",
        platforms: []
      });
      const result = checkQuality(input);

      expect(result.qualityScore).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Multiple Entity Types", () => {
    it("should handle blog quality checks independently", () => {
      const input = createBlogInput({
        title: "A"
      });
      const result = checkQuality(input);

      expect(result.issues.some((i) => i.field === "title")).toBe(true);
      expect(result.issues.some((i) => i.field === "caption")).toBe(false);
    });

    it("should handle social post quality checks independently", () => {
      const input = createSocialPostInput({
        caption: "Good caption",
        platforms: undefined
      });
      const result = checkQuality(input);

      expect(result.issues.some((i) => i.field === "caption")).toBe(false);
      expect(result.issues.some((i) => i.field === "platforms")).toBe(false);
    });
  });

  describe("Whitespace Handling", () => {
    it("should trim caption before checking length", () => {
      const input = createSocialPostInput({
        caption: "   Short   "
      });
      const result = checkQuality(input);

      expect(result.issues).toContainEqual(
        expect.objectContaining({
          type: "caption_too_short"
        })
      );
    });

    it("should trim title before checking length", () => {
      const input = createBlogInput({
        title: "   ABC   "
      });
      const result = checkQuality(input);

      expect(result.issues).toContainEqual(
        expect.objectContaining({
          type: "title_too_short"
        })
      );
    });
  });
});
