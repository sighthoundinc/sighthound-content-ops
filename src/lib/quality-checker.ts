/**
 * Quality Checker
 *
 * Pure deterministic function to detect quality issues in content.
 * No external API calls, no side effects.
 *
 * Checks:
 * - Caption length (social posts)
 * - Platform selection (social posts)
 * - Title length (blogs)
 */

export interface QualityCheckInput {
  entityType: "blog" | "social_post";
  caption?: string;
  platforms?: string[];
  title?: string;
}

export interface QualityIssue {
  type: "caption_too_short" | "caption_too_long" | "no_platforms_selected" | "title_too_short" | "title_too_long";
  field: string;
  message: string;
  severity: "warning" | "error";
  currentLength?: number;
  maxLength?: number;
  minLength?: number;
}

export interface QualityCheckResult {
  issues: QualityIssue[];
  qualityScore: number; // 0-100
}

/**
 * Quality rule constants
 */
const QUALITY_RULES = {
  CAPTION: {
    MIN_LENGTH: 10,
    MAX_LENGTH: 280, // Twitter-like limit
    RECOMMENDED_LENGTH: 50
  },
  TITLE: {
    MIN_LENGTH: 5,
    MAX_LENGTH: 120,
    RECOMMENDED_LENGTH: 60
  },
  PLATFORMS: {
    REQUIRED_COUNT: 1
  }
};

/**
 * Checks content quality for social posts and blogs.
 * Returns quality issues and a quality score (0-100).
 */
export function checkQuality(input: QualityCheckInput): QualityCheckResult {
  const issues: QualityIssue[] = [];

  if (input.entityType === "social_post") {
    checkSocialPostQuality(input, issues);
  } else if (input.entityType === "blog") {
    checkBlogQuality(input, issues);
  }

  // Calculate quality score: deduct points for each issue
  let qualityScore = 100;
  issues.forEach((issue) => {
    if (issue.severity === "error") {
      qualityScore -= 20;
    } else if (issue.severity === "warning") {
      qualityScore -= 10;
    }
  });

  return {
    issues,
    qualityScore: Math.max(0, qualityScore)
  };
}

/**
 * Checks quality for social posts.
 */
function checkSocialPostQuality(input: QualityCheckInput, issues: QualityIssue[]): void {
  // Check caption length
  if (input.caption !== undefined) {
    const captionLength = input.caption.trim().length;

    if (captionLength < QUALITY_RULES.CAPTION.MIN_LENGTH && captionLength > 0) {
      issues.push({
        type: "caption_too_short",
        field: "caption",
        message: `Caption should be at least ${QUALITY_RULES.CAPTION.MIN_LENGTH} characters`,
        severity: "warning",
        currentLength: captionLength,
        minLength: QUALITY_RULES.CAPTION.MIN_LENGTH
      });
    }

    if (captionLength > QUALITY_RULES.CAPTION.MAX_LENGTH) {
      issues.push({
        type: "caption_too_long",
        field: "caption",
        message: `Caption cannot exceed ${QUALITY_RULES.CAPTION.MAX_LENGTH} characters (current: ${captionLength})`,
        severity: "error",
        currentLength: captionLength,
        maxLength: QUALITY_RULES.CAPTION.MAX_LENGTH
      });
    }
  }

  // Check platforms selected
  if (input.platforms !== undefined) {
    const platformCount = (input.platforms || []).filter((p) => p && p.trim()).length;

    if (platformCount < QUALITY_RULES.PLATFORMS.REQUIRED_COUNT) {
      issues.push({
        type: "no_platforms_selected",
        field: "platforms",
        message: "At least one platform must be selected",
        severity: "error"
      });
    }
  }
}

/**
 * Checks quality for blogs.
 */
function checkBlogQuality(input: QualityCheckInput, issues: QualityIssue[]): void {
  // Check title length
  if (input.title !== undefined) {
    const titleLength = input.title.trim().length;

    if (titleLength < QUALITY_RULES.TITLE.MIN_LENGTH && titleLength > 0) {
      issues.push({
        type: "title_too_short",
        field: "title",
        message: `Title should be at least ${QUALITY_RULES.TITLE.MIN_LENGTH} characters`,
        severity: "warning",
        currentLength: titleLength,
        minLength: QUALITY_RULES.TITLE.MIN_LENGTH
      });
    }

    if (titleLength > QUALITY_RULES.TITLE.MAX_LENGTH) {
      issues.push({
        type: "title_too_long",
        field: "title",
        message: `Title cannot exceed ${QUALITY_RULES.TITLE.MAX_LENGTH} characters (current: ${titleLength})`,
        severity: "error",
        currentLength: titleLength,
        maxLength: QUALITY_RULES.TITLE.MAX_LENGTH
      });
    }
  }
}

/**
 * Export quality rules for testing and reference
 */
export const getQualityRules = () => QUALITY_RULES;
