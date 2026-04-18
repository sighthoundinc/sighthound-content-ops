/**
 * End-to-End Scenario Tests
 *
 * Real-world workflow scenarios validating the complete deterministic engine.
 * 10+ scenarios covering all major use cases.
 */

import { detectBlockers } from "@/lib/blocker-detector";
import { checkQuality } from "@/lib/quality-checker";
import { generateResponse } from "@/app/api/ai/utils/response-generator";
import { extractContextSync } from "@/app/api/ai/utils/context-extractor";
import { getRequiredFieldsForStatus, getNextStagesForStatus } from "@/lib/workflow-rules";

describe("End-to-End Scenarios", () => {
  /**
   * Scenario 1: Blog in writing stage, missing title (writer)
   */
  it("should handle blog draft missing title", () => {
    const context = extractContextSync(
      {
        entityType: "blog",
        entityId: "blog-1",
        userId: "writer-1",
        userRole: "writer"
      },
      {
        status: "writing",
        fields: { title: false, writer_id: true },
        ownerId: "writer-1",
        reviewerId: undefined
      }
    );

    const blockers = detectBlockers({
      entityType: "blog",
      status: context.currentStatus,
      userRole: "writer",
      userIsOwner: context.userIsOwner,
      userIsReviewer: context.userIsReviewer,
      fields: context.fields,
      requiredFieldsForStatus: getRequiredFieldsForStatus("blog", context.currentStatus),
      nextAllowedStages: getNextStagesForStatus("blog", context.currentStatus)
    });

    const response = generateResponse({
      context,
      blockers: blockers.blockers,
      qualityIssues: [],
    });

    expect(response.canProceed).toBe(false);
    expect(response.blockers.some((b) => b.field === "title")).toBe(true);
    expect(response.nextSteps.some((s) => s.includes("title"))).toBe(true);
  });

  /**
   * Scenario 2: Social post in review, user not assigned as reviewer
   */
  it("should warn when user not assigned reviewer in social post review", () => {
    const context = extractContextSync(
      {
        entityType: "social_post",
        entityId: "social-2",
        userId: "writer-2",
        userRole: "writer"
      },
      {
        status: "in_review",
        fields: { product: true, type: true, canva_url: true },
        ownerId: "writer-2",
        reviewerId: "editor-1"
      }
    );

    const blockers = detectBlockers({
      entityType: "social_post",
      status: context.currentStatus,
      userRole: "writer",
      userIsOwner: context.userIsOwner,
      userIsReviewer: context.userIsReviewer,
      fields: context.fields,
      requiredFieldsForStatus: getRequiredFieldsForStatus("social_post", context.currentStatus),
      nextAllowedStages: getNextStagesForStatus("social_post", context.currentStatus)
    });

    expect(blockers.blockers.some((b) => b.severity === "warning")).toBe(true);
    expect(context.userIsReviewer).toBe(false);
  });

  /**
   * Scenario 3: Non-owner user trying to edit blog
   */
  it("should block non-owner from editing blog", () => {
    const context = extractContextSync(
      {
        entityType: "blog",
        entityId: "blog-3",
        userId: "user-random",
        userRole: "writer"
      },
      {
        status: "draft",
        fields: { title: true, writer_id: true },
        ownerId: "writer-3",
        reviewerId: undefined
      }
    );

    const blockers = detectBlockers({
      entityType: "blog",
      status: context.currentStatus,
      userRole: "writer",
      userIsOwner: context.userIsOwner,
      userIsReviewer: context.userIsReviewer,
      fields: context.fields,
      requiredFieldsForStatus: getRequiredFieldsForStatus("blog", context.currentStatus),
      nextAllowedStages: getNextStagesForStatus("blog", context.currentStatus)
    });

    expect(blockers.blockers.some((b) => b.type === "ownership")).toBe(true);
    expect(blockers.canProceedToNextStage).toBe(false);
  });

  /**
   * Scenario 4: Admin can override ownership
   */
  it("should allow admin to access any content", () => {
    const context = extractContextSync(
      {
        entityType: "blog",
        entityId: "blog-4",
        userId: "admin-1",
        userRole: "admin"
      },
      {
        status: "writing",
        fields: { title: true, writer_id: true },
        ownerId: "writer-4",
        reviewerId: undefined
      }
    );

    const blockers = detectBlockers({
      entityType: "blog",
      status: context.currentStatus,
      userRole: "admin",
      userIsOwner: context.userIsOwner,
      userIsReviewer: context.userIsReviewer,
      fields: context.fields,
      requiredFieldsForStatus: getRequiredFieldsForStatus("blog", context.currentStatus),
      nextAllowedStages: getNextStagesForStatus("blog", context.currentStatus)
    });

    const ownershipBlockers = blockers.blockers.filter((b) => b.type === "ownership");
    expect(ownershipBlockers.length).toBe(0);
    expect(blockers.canProceedToNextStage).toBe(true);
  });

  /**
   * Scenario 5: Social post caption too long
   */
  it("should flag caption exceeding character limit", () => {
    const quality = checkQuality({
      entityType: "social_post",
      caption: "a".repeat(300),
      platforms: ["twitter"]
    });

    expect(quality.issues.some((i) => i.type === "caption_too_long")).toBe(true);
    expect(quality.qualityScore).toBeLessThan(100);
  });

  /**
   * Scenario 6: Social post no platforms selected
   */
  it("should require at least one platform for social post", () => {
    const quality = checkQuality({
      entityType: "social_post",
      caption: "Great content here",
      platforms: []
    });

    expect(quality.issues.some((i) => i.type === "no_platforms_selected")).toBe(true);
  });

  /**
   * Scenario 7: Blog with excellent quality
   */
  it("should give 100 quality score for blog with good title", () => {
    const quality = checkQuality({
      entityType: "blog",
      title: "Understanding Modern Web Development Patterns"
    });

    expect(quality.issues.length).toBe(0);
    expect(quality.qualityScore).toBe(100);
  });

  /**
   * Scenario 8: Blog ready to transition (all fields present)
   * Unified blog workflow: writing -> ready -> publishing -> published.
   */
  it("should allow transition when all required fields present", () => {
    const context = extractContextSync(
      {
        entityType: "blog",
        entityId: "blog-8",
        userId: "writer-8",
        userRole: "writer"
      },
      {
        status: "writing",
        fields: { title: true, writer_id: true },
        ownerId: "writer-8",
        reviewerId: undefined
      }
    );

    const blockers = detectBlockers({
      entityType: "blog",
      status: context.currentStatus,
      userRole: "writer",
      userIsOwner: context.userIsOwner,
      userIsReviewer: context.userIsReviewer,
      fields: context.fields,
      requiredFieldsForStatus: getRequiredFieldsForStatus("blog", context.currentStatus),
      nextAllowedStages: getNextStagesForStatus("blog", context.currentStatus)
    });

    const criticalBlockers = blockers.blockers.filter((b) => b.severity === "critical");
    expect(criticalBlockers.length).toBe(0);
    expect(blockers.canProceedToNextStage).toBe(true);
  });

  /**
   * Scenario 9: Terminal stage (blog published)
   */
  it("should prevent transition from terminal stage", () => {
    const context = extractContextSync(
      {
        entityType: "blog",
        entityId: "blog-9",
        userId: "publisher-9",
        userRole: "publisher"
      },
      {
        status: "published",
        fields: { title: true, writer_id: true, draft_doc_link: true, publisher_id: true },
        ownerId: "publisher-9",
        reviewerId: undefined
      }
    );

    const nextStages = getNextStagesForStatus("blog", context.currentStatus);
    expect(nextStages.length).toBe(0);
    expect(context.nextAllowedStages.length).toBe(0);
  });

  /**
   * Scenario 10: Social post complete workflow
   */
  it("should support full social post workflow", () => {
    // Draft stage
    const draftContext = extractContextSync(
      {
        entityType: "social_post",
        entityId: "social-10",
        userId: "creator-10",
        userRole: "writer"
      },
      {
        status: "draft",
        fields: { product: true, type: true, canva_url: true },
        ownerId: "creator-10",
        reviewerId: undefined
      }
    );

    const draftBlockers = detectBlockers({
      entityType: "social_post",
      status: draftContext.currentStatus,
      userRole: "writer",
      userIsOwner: draftContext.userIsOwner,
      userIsReviewer: draftContext.userIsReviewer,
      fields: draftContext.fields,
      requiredFieldsForStatus: getRequiredFieldsForStatus("social_post", draftContext.currentStatus),
      nextAllowedStages: getNextStagesForStatus("social_post", draftContext.currentStatus)
    });

    expect(draftBlockers.canProceedToNextStage).toBe(true);
    expect(draftContext.nextAllowedStages).toContain("in_review");

    // Ready to publish stage
    const readyContext = extractContextSync(
      {
        entityType: "social_post",
        entityId: "social-10",
        userId: "creator-10",
        userRole: "writer"
      },
      {
        status: "ready_to_publish",
        fields: {
          product: true,
          type: true,
          canva_url: true,
          caption: true,
          platforms: true,
          scheduled_publish_date: true
        },
        ownerId: "creator-10",
        reviewerId: "editor-10"
      }
    );

    expect(readyContext.nextAllowedStages).toContain("awaiting_live_link");
  });

  /**
   * Scenario 11: Complex multi-blocker scenario
   */
  it("should handle multiple blockers simultaneously", () => {
    const context = extractContextSync(
      {
        entityType: "social_post",
        entityId: "social-11",
        userId: "user-other",
        userRole: "writer"
      },
      {
        status: "creative_approved",
        fields: {
          product: true,
          type: true,
          canva_url: true,
          caption: false,
          platforms: false,
          scheduled_publish_date: false
        },
        ownerId: "creator-11",
        reviewerId: "editor-11"
      }
    );

    const blockers = detectBlockers({
      entityType: "social_post",
      status: context.currentStatus,
      userRole: "writer",
      userIsOwner: context.userIsOwner,
      userIsReviewer: context.userIsReviewer,
      fields: context.fields,
      requiredFieldsForStatus: getRequiredFieldsForStatus("social_post", context.currentStatus),
      nextAllowedStages: getNextStagesForStatus("social_post", context.currentStatus)
    });

    expect(blockers.blockers.length).toBeGreaterThan(0);
    expect(blockers.canProceedToNextStage).toBe(false);

    const response = generateResponse({
      context,
      blockers: blockers.blockers,
      qualityIssues: [],
    });

    expect(response.nextSteps.length).toBeGreaterThan(0);
    expect(response.canProceed).toBe(false);
  });

  /**
   * Scenario 12: Blog in the publishing stage (equivalent of the old
   * "publisher_review" stage in the unified workflow).
   */
  it("should allow publisher to transition from publishing stage", () => {
    const context = extractContextSync(
      {
        entityType: "blog",
        entityId: "blog-12",
        userId: "publisher-12",
        userRole: "publisher"
      },
      {
        status: "publishing",
        fields: { title: true, writer_id: true, draft_doc_link: true, publisher_id: true },
        ownerId: "publisher-12",
        reviewerId: "editor-12"
      }
    );

    const blockers = detectBlockers({
      entityType: "blog",
      status: context.currentStatus,
      userRole: "publisher",
      userIsOwner: context.userIsOwner,
      userIsReviewer: context.userIsReviewer,
      fields: context.fields,
      requiredFieldsForStatus: getRequiredFieldsForStatus("blog", context.currentStatus),
      nextAllowedStages: getNextStagesForStatus("blog", context.currentStatus)
    });

    expect(blockers.canProceedToNextStage).toBe(true);
    expect(context.nextAllowedStages).toContain("published");
  });
});
