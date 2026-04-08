import {
  UNIFIED_EVENT_TO_NOTIFICATION_TYPE,
  type UnifiedEventType,
} from "@/lib/unified-events";

export type RecordActivityContentType = "blog" | "social_post";

type ResolveChangedByInput = {
  requestedChangedBy: string | null | undefined;
  authenticatedUserId: string;
  isAdmin: boolean;
};

type ResolveTargetInput = {
  contentType: RecordActivityContentType;
  blogId: string | null | undefined;
  socialPostId: string | null | undefined;
};

type ResolveChangedBySuccess = { changedBy: string };
type ResolveTargetSuccess = { contentId: string };
type ResolveError = { error: string; status: number };

const ALLOWED_EVENT_TYPE_SET = new Set<UnifiedEventType>(
  Object.keys(UNIFIED_EVENT_TO_NOTIFICATION_TYPE) as UnifiedEventType[]
);

function normalizeIdentifier(value: string | null | undefined) {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function isAllowedRecordActivityEventType(
  eventType: string
): eventType is UnifiedEventType {
  return ALLOWED_EVENT_TYPE_SET.has(eventType as UnifiedEventType);
}

export function resolveRecordActivityChangedBy(
  input: ResolveChangedByInput
): ResolveChangedBySuccess | ResolveError {
  const requestedChangedBy = normalizeIdentifier(input.requestedChangedBy);

  if (!requestedChangedBy || requestedChangedBy === input.authenticatedUserId) {
    return { changedBy: input.authenticatedUserId };
  }

  if (requestedChangedBy === "system" && input.isAdmin) {
    return { changedBy: "system" };
  }

  return {
    error:
      "changed_by must match the authenticated user. Admins may use 'system' for automated events.",
    status: 403,
  };
}

export function resolveRecordActivityTarget(
  input: ResolveTargetInput
): ResolveTargetSuccess | ResolveError {
  const normalizedBlogId = normalizeIdentifier(input.blogId);
  const normalizedSocialPostId = normalizeIdentifier(input.socialPostId);
  const hasBlogId = Boolean(normalizedBlogId);
  const hasSocialPostId = Boolean(normalizedSocialPostId);

  if (hasBlogId === hasSocialPostId) {
    return {
      error: "Provide exactly one content identifier: blog_id or social_post_id.",
      status: 400,
    };
  }

  if (input.contentType === "blog") {
    if (!normalizedBlogId) {
      return {
        error: "contentType 'blog' requires blog_id.",
        status: 400,
      };
    }
    return { contentId: normalizedBlogId };
  }

  if (!normalizedSocialPostId) {
    return {
      error: "contentType 'social_post' requires social_post_id.",
      status: 400,
    };
  }
  return { contentId: normalizedSocialPostId };
}
