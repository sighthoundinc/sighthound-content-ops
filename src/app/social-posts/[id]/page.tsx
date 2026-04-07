"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatDistanceToNow } from "date-fns";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/button";
import { ConfirmationModal } from "@/components/confirmation-modal";
import { DataPageHeader } from "@/components/data-page";
import { LinkQuickActions } from "@/components/link-quick-actions";
import { ProtectedPage } from "@/components/protected-page";
import { SocialPostStatusBadge } from "@/components/status-badge";
import { AppIcon } from "@/lib/icons";
import {
  getApiErrorMessage,
  isApiFailure,
  parseApiResponseJson,
} from "@/lib/api-response";
import { validateBlogRelation } from "@/lib/shape-validation";
import {
  canUserActOnStatus,
  REQUIRED_FIELDS_FOR_STATUS,
} from "@/lib/social-post-workflow";
import {
  SOCIAL_PLATFORMS,
  SOCIAL_POST_ALLOWED_TRANSITIONS,
  SOCIAL_PLATFORM_LABELS,
  SOCIAL_POST_PRODUCTS,
  SOCIAL_POST_PRODUCT_LABELS,
  SOCIAL_POST_TYPES,
  SOCIAL_POST_STATUS_LABELS,
  SOCIAL_POST_TYPE_LABELS,
} from "@/lib/status";
import { socialPostStatusChangedNotification } from "@/lib/notification-helpers";
import {
  formatActivityChangeDescription,
  formatActivityEventTitle,
} from "@/lib/activity-history-format";
import { getUserRoles } from "@/lib/roles";
import {
  CHANGE_REQUEST_CATEGORY_OPTIONS,
  CHANGE_REQUEST_CHECKLIST_OPTIONS,
  createEmptyChangeRequestTemplate,
  formatChangeRequestReason,
  getChangeRequestTemplateError,
  type ChangeRequestTemplateState,
} from "@/lib/social-post-change-request";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import type {
  BlogSite,
  ProfileRecord,
  SocialPostActivityRecord,
  SocialPostCommentRecord,
  SocialPlatform,
  SocialPostLinkRecord,
  SocialPostProduct,
  SocialPostStatus,
  SocialPostType,
} from "@/lib/types";
import { formatDateInput } from "@/lib/utils";
import { formatDateInTimezone } from "@/lib/format-date";
import { useAuth } from "@/providers/auth-provider";
import { useAlerts } from "@/providers/alerts-provider";
import { useNotifications } from "@/providers/notifications-provider";

type BlogLookupResult = {
  id: string;
  title: string;
  slug: string | null;
  site: BlogSite;
  live_url?: string | null;
};

type SocialPostEditorRecord = {
  id: string;
  title: string;
  product: SocialPostProduct;
  type: SocialPostType;
  canva_url: string | null;
  canva_page: number | null;
  caption: string | null;
  platforms: SocialPlatform[];
  scheduled_date: string | null;
  status: SocialPostStatus;
  associated_blog_id: string | null;
  associated_blog: BlogLookupResult | null;
  updated_at: string;
  worker_user_id: string | null;
  reviewer_user_id: string | null;
};

type EditorFormState = {
  title: string;
  product: SocialPostProduct;
  type: SocialPostType;
  canva_url: string;
  canva_page: string;
  caption: string;
  platforms: SocialPlatform[];
  scheduled_date: string;
  status: SocialPostStatus;
  associated_blog_id: string | null;
};
type SocialCommentRecord = SocialPostCommentRecord & {
  author?: Pick<ProfileRecord, "id" | "full_name" | "email"> | null;
};
type SocialActivityRecord = SocialPostActivityRecord & {
  actor?: Pick<ProfileRecord, "id" | "full_name" | "email"> | null;
};

const LINKEDIN_CAPTION_LIMIT = 3000;
const AUTOSAVE_DEBOUNCE_MS = 30000;
const PLATFORM_CAPTION_GUIDANCE: Record<SocialPlatform, string> = {
  linkedin: "LinkedIn: lead with a strong hook, then add concise proof points.",
  facebook: "Facebook: keep it short, clear, and conversational with one CTA.",
  instagram: "Instagram: front-load impact and keep hashtag use intentional.",
};
const VALIDATION_MESSAGES = {
  captionExceeds: "Caption exceeds LinkedIn limit.",
  sessionExpired: "Session expired. Refresh and try again.",
  couldNotSave: "Couldn't save.",
  couldNotLoad: "Couldn't load post.",
  couldNotLoadLinks: "Couldn't load live links.",
  couldNotSearchBlogs: "Couldn't search blogs.",
  briefReadOnly: "Execution-stage brief fields are read-only. Use Edit Brief to reopen.",
  invalidTransition: "Invalid status transition",
  noPermissionTransition: "You do not have permission for that transition from the current stage.",
  rollbackReasonRequired: "Rollback reason is required.",
  couldNotChangeStatus: "Couldn't change post status.",
  couldNotSaveLinks: "Couldn't save live links.",
  couldNotReopenBrief: "Couldn't reopen brief.",
  nothingToCopy: "Nothing to copy",
  copiedToClipboard: "Copied to clipboard",
  copyFailed: "Copy failed. Try again",
  postReopened: "Post reopened to Creative Approved for brief edits.",
  linksSaved: "Live links saved.",
  postSaved: "Post saved.",
  platformRequired: "Select at least one platform.",
  canvaUrlInvalid: "Canva link must start with https:// or http://",
} as const;
const ASSIGNED_USER_HELPER_TEXT = "Only assigned user can perform this action";
const PREFLIGHT_FIELD_META = {
  product: { label: "Product", targetId: "social-post-product" },
  type: { label: "Type", targetId: "social-post-type" },
  canva_url: { label: "Canva Link", targetId: "social-post-canva-url" },
  platforms: { label: "Platform(s)", targetId: "social-post-platforms" },
  caption: { label: "Caption", targetId: "social-post-caption" },
  scheduled_date: {
    label: "Scheduled Publish Date",
    targetId: "social-post-scheduled-date",
  },
  live_links: { label: "At least one live link", targetId: "social-post-live-links" },
} as const;
type PreflightFieldKey = keyof typeof PREFLIGHT_FIELD_META;
type EditorFocusTarget = "setup" | "review-publish" | "live-links";
const EDITOR_FOCUS_TARGET_IDS: Record<EditorFocusTarget, string> = {
  setup: "social-editor-step-setup",
  "review-publish": "social-editor-step-review-publish",
  "live-links": "social-post-live-links",
};
const SOCIAL_POST_EDITOR_SHORTCUTS = {
  nextRequired: {
    key: "j",
    keys: ["⌥⇧J"],
    label: "Jump to next required field",
  },
  primaryAction: {
    key: "Enter",
    keys: ["⌥⇧↵"],
    label: "Run primary action",
  },
} as const;

function isEditorFocusTarget(value: string | null): value is EditorFocusTarget {
  if (!value) {
    return false;
  }
  return value in EDITOR_FOCUS_TARGET_IDS;
}

// Unicode bold sans-serif characters for LinkedIn-compatible bold text
const BOLD_SANS_UPPER = "𝗔𝗕𝗖𝗗𝗘𝗙𝗚𝗛𝗜𝗝𝗞𝗟𝗠𝗡𝗢𝗣𝗤𝗥𝗦𝗧𝗨𝗩𝗪𝗫𝗬𝗭";
const BOLD_SANS_LOWER = "𝗮𝗯𝗰𝗱𝗲𝗳𝗴𝗵𝗶𝗷𝗸𝗹𝗺𝗻𝗼𝗽𝗾𝗿𝘀𝘁𝘂𝘃𝘄𝘅𝘆𝘇";
const BOLD_SANS_DIGITS = "𝟬𝟭𝟮𝟯𝟰𝟱𝟲𝟳𝟴𝟵";

function isExecutionStage(status: SocialPostStatus) {
  return status === "ready_to_publish" || status === "awaiting_live_link";
}
function detectPlatformFromUrl(url: string): SocialPlatform | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    if (host.includes("linkedin.com")) {
      return "linkedin";
    }
    if (host.includes("facebook.com") || host.includes("fb.com")) {
      return "facebook";
    }
    if (host.includes("instagram.com")) {
      return "instagram";
    }
    return null;
  } catch {
    return null;
  }
}

function validateCanvaUrl(url: string): boolean {
  if (!url || !url.trim()) {
    return false;
  }
  const trimmed = url.trim();
  return trimmed.startsWith("https://") || trimmed.startsWith("http://");
}

function normalizePostLinkRows(rows: Array<Record<string, unknown>>) {
  return rows.map((row) => {
    return {
      id: String(row.id ?? ""),
      social_post_id: String(row.social_post_id ?? ""),
      platform: (row.platform as SocialPlatform) ?? "linkedin",
      url: String(row.url ?? ""),
      created_by: String(row.created_by ?? ""),
      created_at: String(row.created_at ?? ""),
      updated_at: String(row.updated_at ?? ""),
    } satisfies SocialPostLinkRecord;
  });
}

function normalizeRelationObject<T>(value: unknown): T | null {
  if (Array.isArray(value)) {
    return (value[0] ?? null) as T | null;
  }
  return (value ?? null) as T | null;
}
function normalizeSocialCommentRows(rows: Array<Record<string, unknown>>) {
  return rows.map((row) => {
    const author = normalizeRelationObject<
      Pick<ProfileRecord, "id" | "full_name" | "email">
    >(row.author);
    return {
      id: String(row.id ?? ""),
      social_post_id: String(row.social_post_id ?? ""),
      user_id: String(row.user_id ?? row.created_by ?? ""),
      created_by:
        typeof row.created_by === "string" ? String(row.created_by) : null,
      parent_comment_id:
        typeof row.parent_comment_id === "string" ? row.parent_comment_id : null,
      comment: String(row.comment ?? ""),
      created_at: String(row.created_at ?? ""),
      updated_at: String(row.updated_at ?? ""),
      author,
    } satisfies SocialCommentRecord;
  });
}
function normalizeSocialActivityRows(rows: Array<Record<string, unknown>>) {
  return rows.map((row) => {
    const actor = normalizeRelationObject<
      Pick<ProfileRecord, "id" | "full_name" | "email">
    >(row.actor);
    return {
      id: String(row.id ?? ""),
      social_post_id: String(row.social_post_id ?? ""),
      changed_by:
        typeof row.changed_by === "string" ? String(row.changed_by) : null,
      event_type: String(row.event_type ?? ""),
      field_name: typeof row.field_name === "string" ? row.field_name : null,
      old_value: typeof row.old_value === "string" ? row.old_value : null,
      new_value: typeof row.new_value === "string" ? row.new_value : null,
      metadata:
        row.metadata && typeof row.metadata === "object"
          ? (row.metadata as Record<string, unknown>)
          : {},
      changed_at: String(row.changed_at ?? ""),
      actor,
    } satisfies SocialActivityRecord;
  });
}
function createEmptyLiveLinkDrafts(): Record<SocialPlatform, string> {
  return {
    linkedin: "",
    facebook: "",
    instagram: "",
  };
}

function toLiveLinkDrafts(links: SocialPostLinkRecord[]): Record<SocialPlatform, string> {
  const drafts = createEmptyLiveLinkDrafts();
  for (const link of links) {
    drafts[link.platform] = link.url;
  }
  return drafts;
}

function toBoldFormat(input: string) {
  let output = "";
  for (const character of input) {
    if (character >= "A" && character <= "Z") {
      output += BOLD_SANS_UPPER[character.charCodeAt(0) - 65];
      continue;
    }
    if (character >= "a" && character <= "z") {
      output += BOLD_SANS_LOWER[character.charCodeAt(0) - 97];
      continue;
    }
    if (character >= "0" && character <= "9") {
      output += BOLD_SANS_DIGITS[character.charCodeAt(0) - 48];
      continue;
    }
    output += character;
  }
  return output;
}

function formatSavedTimestamp(value: string, timezone?: string | null) {
  return formatDateInTimezone(value, timezone ?? undefined, "MMM d, h:mm a");
}

function normalizePostRow(row: Record<string, unknown>): SocialPostEditorRecord {
  const associatedBlog = validateBlogRelation(row.associated_blog);
  return {
    id: String(row.id ?? ""),
    title: String(row.title ?? ""),
    product: (row.product as SocialPostProduct) ?? "general_company",
    type: (row.type as SocialPostType) ?? "image",
    canva_url: typeof row.canva_url === "string" ? row.canva_url : null,
    canva_page:
      typeof row.canva_page === "number"
        ? row.canva_page
        : typeof row.canva_page === "string"
          ? Number(row.canva_page) || null
          : null,
    caption: typeof row.caption === "string" ? row.caption : null,
    platforms: Array.isArray(row.platforms)
      ? row.platforms.filter((platform): platform is SocialPlatform => typeof platform === "string")
      : [],
    scheduled_date: typeof row.scheduled_date === "string" ? row.scheduled_date : null,
    status: (row.status as SocialPostStatus) ?? "draft",
    associated_blog_id: typeof row.associated_blog_id === "string" ? row.associated_blog_id : null,
    associated_blog: associatedBlog,
    updated_at: String(row.updated_at ?? ""),
    worker_user_id: typeof row.worker_user_id === "string" ? row.worker_user_id : null,
    reviewer_user_id: typeof row.reviewer_user_id === "string" ? row.reviewer_user_id : null,
  };
}

function createFormFromPost(post: SocialPostEditorRecord): EditorFormState {
  return {
    title: post.title,
    product: post.product,
    type: post.type,
    canva_url: post.canva_url ?? "",
    canva_page: post.canva_page ? String(post.canva_page) : "",
    caption: post.caption ?? "",
    platforms: post.platforms,
    scheduled_date: formatDateInput(post.scheduled_date),
    status: post.status,
    associated_blog_id: post.associated_blog_id,
  };
}

function createSocialEditorFormSnapshot(form: EditorFormState) {
  return JSON.stringify({
    title: form.title.trim(),
    product: form.product,
    type: form.type,
    canva_url: form.canva_url.trim(),
    canva_page: form.canva_page.trim(),
    caption: form.caption,
    platforms: [...form.platforms].sort(),
    scheduled_date: form.scheduled_date,
    status: form.status,
    associated_blog_id: form.associated_blog_id,
  });
}

export default function SocialPostEditorPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile, session, user } = useAuth();
  const { pushNotification } = useNotifications();
  const { showSaving, showSuccess, showError, updateAlert: updateStatus } = useAlerts();
  const postId = params?.id ?? "";
  const requestedFocusTarget = useMemo(() => {
    const focusParam = searchParams.get("focus");
    return isEditorFocusTarget(focusParam) ? focusParam : null;
  }, [searchParams]);
  const captionRef = useRef<HTMLTextAreaElement | null>(null);
  const userRoles = useMemo(() => getUserRoles(profile), [profile]);
  const isAdmin = userRoles.includes("admin");

  const [post, setPost] = useState<SocialPostEditorRecord | null>(null);
  const [form, setForm] = useState<EditorFormState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blogSearchQuery, setBlogSearchQuery] = useState("");
  const [blogSearchResults, setBlogSearchResults] = useState<BlogLookupResult[]>([]);
  const [isBlogSearchOpen, setIsBlogSearchOpen] = useState(false);
  const [isBlogSearchLoading, setIsBlogSearchLoading] = useState(false);
  const [liveLinks, setLiveLinks] = useState<SocialPostLinkRecord[]>([]);
  const [liveLinkDrafts, setLiveLinkDrafts] = useState<Record<SocialPlatform, string>>(
    createEmptyLiveLinkDrafts()
  );
  const [quickLiveLinkInput, setQuickLiveLinkInput] = useState("");
  const [isOptionalSetupOpen, setIsOptionalSetupOpen] = useState(false);
  const [isLiveLinksSaving, setIsLiveLinksSaving] = useState(false);
  const [comments, setComments] = useState<SocialCommentRecord[]>([]);
  const [activity, setActivity] = useState<SocialActivityRecord[]>([]);
  const [commentDraft, setCommentDraft] = useState("");
  const [isCommentSaving, setIsCommentSaving] = useState(false);
  const [pendingChangeRequestTransition, setPendingChangeRequestTransition] =
    useState<{
      toStatus: SocialPostStatus;
      template: ChangeRequestTemplateState;
    } | null>(null);
  const [pendingPrimaryTransitionConfirmation, setPendingPrimaryTransitionConfirmation] =
    useState<{
      fromStatus: SocialPostStatus;
      toStatus: SocialPostStatus;
    } | null>(null);
  const [isReopenBriefModalOpen, setIsReopenBriefModalOpen] = useState(false);
  const [reopenBriefReason, setReopenBriefReason] = useState("");
  const [hasAppliedRequestedFocus, setHasAppliedRequestedFocus] = useState(false);
  const [savedFormSnapshot, setSavedFormSnapshot] = useState<string | null>(null);
  const canEditBrief = useMemo(() => {
    if (!post) {
      return false;
    }
    if (isAdmin) {
      return true;
    }
    return post.status === "draft" || post.status === "changes_requested";
  }, [isAdmin, post]);
  const [availableUsers, setAvailableUsers] = useState<
    Array<{ id: string; full_name: string; email: string }>
  >([]);
  const [editingAssignment, setEditingAssignment] = useState(false);
  const [editWorkerUserId, setEditWorkerUserId] = useState<string | null>(null);
  const [editReviewerUserId, setEditReviewerUserId] = useState<string | null>(null);
  const [isAssignmentSaving, setIsAssignmentSaving] = useState(false);
  const getUserDisplayNameById = useCallback(
    (userId: string | null | undefined) => {
      if (!userId) {
        return "Team";
      }
      const match = availableUsers.find((entry) => entry.id === userId);
      return match?.full_name?.trim() || "Team";
    },
    [availableUsers]
  );
  const getTargetUserNameForStatus = useCallback(
    (
      status: SocialPostStatus,
      sourcePost: Pick<SocialPostEditorRecord, "worker_user_id" | "reviewer_user_id">
    ) => {
      if (status === "in_review" || status === "creative_approved") {
        return getUserDisplayNameById(sourcePost.reviewer_user_id);
      }
      if (status === "published") {
        return "Team";
      }
      return getUserDisplayNameById(sourcePost.worker_user_id);
    },
    [getUserDisplayNameById]
  );
  const canActOnCurrentStatus = useMemo(() => {
    if (!post) {
      return false;
    }
    return canUserActOnStatus({
      status: post.status,
      workerUserId: post.worker_user_id,
      reviewerUserId: post.reviewer_user_id,
      userId: user?.id ?? null,
      isAdmin,
    });
  }, [isAdmin, post, user?.id]);

  const loadPost = useCallback(async () => {
    if (!postId) {
      return;
    }
    setIsLoading(true);
    setError(null);
    const supabase = getSupabaseBrowserClient();
    const [
      { data, error: loadError },
      { data: linksData, error: linksError },
      { data: commentsData, error: commentsError },
      { data: activityData, error: activityError },
    ] =
      await Promise.all([
        supabase
          .from("social_posts")
          .select(
            "id,title,product,type,canva_url,canva_page,caption,platforms,scheduled_date,status,associated_blog_id,updated_at,worker_user_id,reviewer_user_id,associated_blog:associated_blog_id(id,title,slug,site,live_url)"
          )
          .eq("id", postId)
          .single(),
        supabase
          .from("social_post_links")
          .select("id,social_post_id,platform,url,created_by,created_at,updated_at")
          .eq("social_post_id", postId)
          .order("created_at", { ascending: true }),
        supabase
          .from("social_post_comments")
          .select(
            "id,social_post_id,user_id,created_by,parent_comment_id,comment,created_at,updated_at,author:user_id(id,full_name,email)"
          )
          .eq("social_post_id", postId)
          .order("created_at", { ascending: false }),
        supabase
          .from("social_post_activity_history")
          .select(
            "id,social_post_id,changed_by,event_type,field_name,old_value,new_value,metadata,changed_at,actor:changed_by(id,full_name,email)"
          )
          .eq("social_post_id", postId)
          .order("changed_at", { ascending: false })
          .limit(50),
      ]);
    if (loadError) {
      console.error("Social post load failed:", loadError);
      setError(`${VALIDATION_MESSAGES.couldNotLoad} Please try again.`);
      setIsLoading(false);
      return;
    }
    const normalized = normalizePostRow((data ?? {}) as Record<string, unknown>);
    setPost(normalized);
    const nextForm = createFormFromPost(normalized);
    setForm(nextForm);
    setSavedFormSnapshot(createSocialEditorFormSnapshot(nextForm));
    setBlogSearchQuery(normalized.associated_blog?.title ?? "");
    if (linksError) {
      showError(`${VALIDATION_MESSAGES.couldNotLoadLinks} ${linksError.message}`);
      setLiveLinks([]);
      setLiveLinkDrafts(createEmptyLiveLinkDrafts());
    } else {
      const normalizedLinks = normalizePostLinkRows(
        (linksData ?? []) as Array<Record<string, unknown>>
      );
      setLiveLinks(normalizedLinks);
      setLiveLinkDrafts(toLiveLinkDrafts(normalizedLinks));
    }
    if (commentsError) {
      showError(`Couldn't load comments. ${commentsError.message}`);
      setComments([]);
    } else {
      setComments(normalizeSocialCommentRows((commentsData ?? []) as Array<Record<string, unknown>>));
    }
    if (activityError) {
      showError(`Couldn't load activity. ${activityError.message}`);
      setActivity([]);
    } else {
      setActivity(normalizeSocialActivityRows((activityData ?? []) as Array<Record<string, unknown>>));
    }
    setIsLoading(false);
  }, [postId, showError]);

  useEffect(() => {
    void loadPost();
  }, [loadPost]);

  useEffect(() => {
    const loadUsers = async () => {
      const supabase = getSupabaseBrowserClient();
      const { data, error: usersError } = await supabase
        .from("profiles")
        .select("id,full_name,email")
        .order("full_name", { ascending: true });
      if (!usersError && data) {
        setAvailableUsers(
          data.map((row) => ({
            id: String(row.id ?? ""),
            full_name: String(row.full_name ?? ""),
            email: String(row.email ?? ""),
          }))
        );
      }
    };
    void loadUsers();
  }, []);

  useEffect(() => {
    const query = blogSearchQuery.trim();
    if (!canEditBrief || !isBlogSearchOpen || query.length === 0) {
      setBlogSearchResults([]);
      return;
    }
    const timeout = window.setTimeout(() => {
      void (async () => {
        const supabase = getSupabaseBrowserClient();
        setIsBlogSearchLoading(true);
        const { data, error: searchError } = await supabase.rpc("search_blog_lookup", {
          p_query: query,
          p_limit: 8,
        });
        if (searchError) {
          showError(`${VALIDATION_MESSAGES.couldNotSearchBlogs} ${searchError.message}`);
          setBlogSearchResults([]);
          setIsBlogSearchLoading(false);
          return;
        }
        setBlogSearchResults((data ?? []) as BlogLookupResult[]);
        setIsBlogSearchLoading(false);
      })();
    }, 220);
    return () => {
      window.clearTimeout(timeout);
    };
  }, [blogSearchQuery, canEditBrief, isBlogSearchOpen, showError]);

  const persistBrief = useCallback(
    async (
      nextForm: EditorFormState,
      reason: "autosave" | "manual" = "autosave"
    ) => {
      if (!post) {
        return false;
      }
      if (!canEditBrief) {
        if (reason === "manual") {
          showError(VALIDATION_MESSAGES.briefReadOnly);
        }
        return false;
      }

      const canvaPage =
        nextForm.canva_page.trim().length > 0 &&
        !Number.isNaN(Number(nextForm.canva_page))
          ? Math.max(1, Number(nextForm.canva_page))
          : null;
      const normalizedTitle = nextForm.title.trim();
      const normalizedCanvaUrl = nextForm.canva_url.trim() || null;
      const normalizedCaption =
        nextForm.caption.trim().length > 0 ? nextForm.caption : null;
      const normalizedPlatforms = Array.from(new Set(nextForm.platforms));
      const normalizedScheduledDate = nextForm.scheduled_date || null;

      const hasChanges =
        normalizedTitle !== post.title ||
        nextForm.product !== post.product ||
        nextForm.type !== post.type ||
        normalizedCanvaUrl !== post.canva_url ||
        canvaPage !== post.canva_page ||
        normalizedCaption !== post.caption ||
        normalizedPlatforms.join(",") !== post.platforms.join(",") ||
        normalizedScheduledDate !== post.scheduled_date ||
        nextForm.associated_blog_id !== post.associated_blog_id;

      if (!hasChanges) {
        return true;
      }

      const statusId = showSaving(
        reason === "autosave" ? "Saving…" : "Updating post…"
      );
      setIsSaving(true);
      const supabase = getSupabaseBrowserClient();
      const { data, error: saveError } = await supabase
        .from("social_posts")
        .update({
          title: normalizedTitle,
          product: nextForm.product,
          type: nextForm.type,
          canva_url: normalizedCanvaUrl,
          canva_page: canvaPage,
          caption: normalizedCaption,
          platforms: normalizedPlatforms,
          scheduled_date: normalizedScheduledDate,
          associated_blog_id: nextForm.associated_blog_id,
        })
        .eq("id", post.id)
        .select(
          "id,title,product,type,canva_url,canva_page,caption,platforms,scheduled_date,status,associated_blog_id,updated_at,associated_blog:associated_blog_id(id,title,slug,site,live_url)"
        )
        .single();
      if (saveError) {
        updateStatus(statusId, {
          type: "error",
          message: `${VALIDATION_MESSAGES.couldNotSave} ${saveError.message}`,
        });
        setIsSaving(false);
        return false;
      }
      const normalized = normalizePostRow((data ?? {}) as Record<string, unknown>);
      setPost(normalized);
      const refreshedForm = createFormFromPost(normalized);
      setForm(refreshedForm);
      setSavedFormSnapshot(createSocialEditorFormSnapshot(refreshedForm));
      updateStatus(statusId, { type: "success", message: VALIDATION_MESSAGES.postSaved });
      setIsSaving(false);
      return true;
    },
    [canEditBrief, post, showError, showSaving, updateStatus]
  );

  const canCurrentUserTransition = useCallback(
    (fromStatus: SocialPostStatus, toStatus: SocialPostStatus) => {
      if (fromStatus === toStatus) {
        return true;
      }
      if (!post) {
        return false;
      }
      const canAct = canUserActOnStatus({
        status: fromStatus,
        workerUserId: post.worker_user_id,
        reviewerUserId: post.reviewer_user_id,
        userId: user?.id ?? null,
        isAdmin,
      });
      if (!canAct) {
        return false;
      }
      const allowedTransitions = SOCIAL_POST_ALLOWED_TRANSITIONS[fromStatus] ?? [];
      return allowedTransitions.includes(toStatus);
    },
    [isAdmin, post, user?.id]
  );

  const transitionPostStatus = useCallback(
    async (
      toStatus: SocialPostStatus,
      options?: { changeRequestTemplate?: ChangeRequestTemplateState | null }
    ) => {
      if (!post) {
        return false;
      }
      const currentStatus = post.status;
      if (!canCurrentUserTransition(currentStatus, toStatus)) {
        const canAct = canUserActOnStatus({
          status: currentStatus,
          workerUserId: post.worker_user_id,
          reviewerUserId: post.reviewer_user_id,
          userId: user?.id ?? null,
          isAdmin,
        });
        if (!canAct) {
          showError(ASSIGNED_USER_HELPER_TEXT);
        } else {
          showError(
            `${VALIDATION_MESSAGES.invalidTransition} from ${SOCIAL_POST_STATUS_LABELS[currentStatus]} to ${SOCIAL_POST_STATUS_LABELS[toStatus]}`
          );
        }
        return false;
      }
      if (!session?.access_token) {
        showError(VALIDATION_MESSAGES.sessionExpired);
        return false;
      }
      let reason: string | null = null;
      if (toStatus === "changes_requested") {
        const template = options?.changeRequestTemplate ?? null;
        if (!template) {
          setPendingChangeRequestTransition({
            toStatus,
            template: createEmptyChangeRequestTemplate(),
          });
          return false;
        }
        const templateError = getChangeRequestTemplateError(template);
        if (templateError) {
          showError(templateError);
          return false;
        }
        reason = formatChangeRequestReason(template);
      }
      const requiresRollbackReason =
        toStatus === "changes_requested" &&
        (currentStatus === "ready_to_publish" ||
          currentStatus === "awaiting_live_link");
      if (requiresRollbackReason && !reason) {
        showError(VALIDATION_MESSAGES.rollbackReasonRequired);
        return false;
      }

      setIsSaving(true);
      const payload: Record<string, unknown> = { nextStatus: toStatus };
      if (reason) {
        payload.reason = reason;
      }
      // Include brief field updates with transition only in editable stages.
      if (form && (isAdmin || !isExecutionStage(currentStatus))) {
        const normalizedTitle = form.title.trim();
        const normalizedCanvaUrl =
          typeof form.canva_url === "string" && form.canva_url.trim().length > 0
            ? form.canva_url.trim()
            : "";
        const canvaPage =
          typeof form.canva_page === "string"
            ? form.canva_page.length > 0
              ? Number(form.canva_page)
              : null
            : null;
        const normalizedCaption = form.caption.trim();
        const normalizedPlatforms = form.platforms.filter((p) => typeof p === "string" && p.length > 0) as SocialPlatform[];
        const normalizedScheduledDate = form.scheduled_date.trim();

        payload.title = normalizedTitle;
        payload.product = form.product;
        payload.type = form.type;
        if (normalizedCanvaUrl) {
          payload.canva_url = normalizedCanvaUrl;
        }
        payload.canva_page = canvaPage;
        payload.caption = normalizedCaption;
        payload.platforms = normalizedPlatforms;
        if (normalizedScheduledDate) {
          payload.scheduled_date = normalizedScheduledDate;
        }
        payload.associated_blog_id = form.associated_blog_id;
      }
      const response = await fetch(`/api/social-posts/${post.id}/transition`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      }).catch(() => null);
      if (!response) {
        showError(VALIDATION_MESSAGES.couldNotChangeStatus);
        setIsSaving(false);
        return false;
      }
      const responsePayload = await parseApiResponseJson<Record<string, unknown>>(response);
      if (isApiFailure(response, responsePayload)) {
        const errorMessage = getApiErrorMessage(
          responsePayload,
          VALIDATION_MESSAGES.couldNotChangeStatus
        );
        showError(errorMessage);
        setIsSaving(false);
        return false;
      }

      setPost((previous) =>
        previous
          ? {
              ...previous,
              status: toStatus,
              updated_at: new Date().toISOString(),
            }
          : previous
      );
      setForm((previous) =>
        previous
          ? {
              ...previous,
              status: toStatus,
            }
          : previous
      );
      pushNotification(
        socialPostStatusChangedNotification(
          post.title.trim() || "Social Post",
          currentStatus,
          toStatus,
          profile?.full_name ?? null,
          post.id,
          getTargetUserNameForStatus(toStatus, post)
        )
      );
    showSuccess(`Status moved to ${SOCIAL_POST_STATUS_LABELS[toStatus]}.`);
      setIsSaving(false);
      void loadPost();
      return true;
    },
    [
      form,
      isAdmin,
      post,
      profile?.full_name,
      pushNotification,
      session?.access_token,
      showError,
      showSuccess,
      canCurrentUserTransition,
      user?.id,
      loadPost,
      getTargetUserNameForStatus,
    ]
  );

  const saveAssignments = useCallback(async () => {
    if (!post || !editWorkerUserId || !editReviewerUserId) {
      showError("Assigned to and Reviewer are required.");
      return;
    }
    setIsAssignmentSaving(true);
    const supabase = getSupabaseBrowserClient();
    const { data, error: saveError } = await supabase
      .from("social_posts")
      .update({
        worker_user_id: editWorkerUserId,
        reviewer_user_id: editReviewerUserId,
      })
      .eq("id", post.id)
      .select(
        "id,title,product,type,canva_url,canva_page,caption,platforms,scheduled_date,status,associated_blog_id,updated_at,worker_user_id,reviewer_user_id,associated_blog:associated_blog_id(id,title,slug,site,live_url)"
      )
      .single();
    if (saveError) {
      showError(`Couldn't save assignments. ${saveError.message}`);
      setIsAssignmentSaving(false);
      return;
    }
    const previousWorkerUserId = post.worker_user_id;
    const previousReviewerUserId = post.reviewer_user_id;
    const normalized = normalizePostRow((data ?? {}) as Record<string, unknown>);
    if (
      previousWorkerUserId !== normalized.worker_user_id ||
      previousReviewerUserId !== normalized.reviewer_user_id
    ) {
      const { emitEvent } = await import("@/lib/emit-event");
      const actorId = user?.id ?? "";
      await Promise.all([
        previousWorkerUserId !== normalized.worker_user_id
          ? emitEvent({
              type: "social_post_assigned",
              contentType: "social_post",
              contentId: normalized.id,
              oldValue: previousWorkerUserId ?? undefined,
              newValue: normalized.worker_user_id ?? undefined,
              fieldName: "worker_user_id",
              actor: actorId,
              actorName: profile?.full_name ?? undefined,
              targetUserId: normalized.worker_user_id ?? undefined,
              targetUserName: getUserDisplayNameById(normalized.worker_user_id),
              contentTitle: normalized.title,
              metadata: { role: "assigned_to" },
              timestamp: Date.now(),
            })
          : Promise.resolve({ success: true }),
        previousReviewerUserId !== normalized.reviewer_user_id
          ? emitEvent({
              type: "social_post_assigned",
              contentType: "social_post",
              contentId: normalized.id,
              oldValue: previousReviewerUserId ?? undefined,
              newValue: normalized.reviewer_user_id ?? undefined,
              fieldName: "reviewer_user_id",
              actor: actorId,
              actorName: profile?.full_name ?? undefined,
              targetUserId: normalized.reviewer_user_id ?? undefined,
              targetUserName: getUserDisplayNameById(normalized.reviewer_user_id),
              contentTitle: normalized.title,
              metadata: { role: "reviewer" },
              timestamp: Date.now(),
            })
          : Promise.resolve({ success: true }),
      ]);
    }
    setPost(normalized);
    setEditingAssignment(false);
    await loadPost();
    showSuccess("Assignments saved.");
    setIsAssignmentSaving(false);
  }, [post, editWorkerUserId, editReviewerUserId, showError, showSuccess, loadPost, user?.id, profile?.full_name, getUserDisplayNameById]);

  useEffect(() => {
    if (!form || !post || !canEditBrief || isSaving) {
      return;
    }
    const timeout = window.setTimeout(() => {
      void persistBrief(form, "autosave");
    }, AUTOSAVE_DEBOUNCE_MS);
    return () => {
      window.clearTimeout(timeout);
    };
  }, [canEditBrief, form, post, persistBrief, isSaving]);

  const captionLength = form?.caption.length ?? 0;
  const isOverLimit = captionLength > LINKEDIN_CAPTION_LIMIT;
  const hasCaption = Boolean(form?.caption.trim());
  const hasPlatform = Boolean(form && form.platforms.length > 0);
  const hasPublishDate = Boolean(form?.scheduled_date);
  const hasValidCanvaUrl = form ? validateCanvaUrl(form.canva_url) : false;
  const hasCanvaLink = Boolean(form?.canva_url.trim()) && hasValidCanvaUrl;
  const hasLinkedBlog = Boolean(form?.associated_blog_id);
  const hasLiveLink = liveLinks.some((link) => link.url.trim().length > 0);
  const hasDraftRequirements = hasCanvaLink;
  const hasReviewRequirements = hasCanvaLink && hasCaption && hasPlatform && hasPublishDate;
  const requiresReviewDetails = Boolean(
    form &&
      (form.status === "in_review" ||
        form.status === "creative_approved" ||
        form.status === "ready_to_publish" ||
        form.status === "awaiting_live_link" ||
        form.status === "published")
  );
  const showOptionalSetupByDefault = Boolean(
    form &&
      (form.title.trim().length > 0 || form.canva_page.trim().length > 0)
  );
  const liveLinkDraftCount = useMemo(
    () =>
      SOCIAL_PLATFORMS.filter(
        (platform) => (liveLinkDrafts[platform] ?? "").trim().length > 0
      ).length,
    [liveLinkDrafts]
  );

  useEffect(() => {
    if (showOptionalSetupByDefault) {
      setIsOptionalSetupOpen(true);
    }
  }, [showOptionalSetupByDefault]);

  const checklistItems = useMemo(
    () => {
      const status = form?.status;
      if (status === "draft" || status === "changes_requested") {
        return [
          { label: "Product selected", done: true, required: true },
          { label: "Type selected", done: true, required: true },
          { label: "Add Canva link", done: hasCanvaLink, required: true },
          { label: "Post title (optional)", done: true, required: false },
          { label: "Link blog (optional)", done: hasLinkedBlog, required: false },
        ];
      }
      if (status === "in_review" || status === "creative_approved") {
        return [
          { label: "Product selected", done: true, required: true },
          { label: "Type selected", done: true, required: true },
          { label: "Add Canva link", done: hasCanvaLink, required: true },
          { label: "Select platform(s)", done: hasPlatform, required: true },
          { label: "Write caption", done: hasCaption, required: true },
          { label: "Set publish date", done: hasPublishDate, required: true },
          { label: "Post title (optional)", done: true, required: false },
          { label: "Link blog (optional)", done: hasLinkedBlog, required: false },
        ];
      }
      if (status === "awaiting_live_link") {
        return [
          { label: "Add at least one live link", done: hasLiveLink, required: true },
        ];
      }
      return [
        { label: "Post title (optional)", done: true, required: false },
        { label: "Link blog (optional)", done: hasLinkedBlog, required: false },
      ];
    },
    [form?.status, hasCanvaLink, hasCaption, hasLinkedBlog, hasLiveLink, hasPlatform, hasPublishDate]
  );
  const finalAction = useMemo(() => {
    if (form?.status === "draft") {
      if (!hasDraftRequirements) {
        return {
          label: "Save Draft",
          nextStatus: "draft" as SocialPostStatus,
          helper: "Add Canva link, Product, and Type before submitting to review.",
        };
      }
      return {
        label: "Submit for Review",
        nextStatus: "in_review" as SocialPostStatus,
        helper: "Draft is complete. Move this post to Review.",
      };
    }
    if (form?.status === "changes_requested") {
      if (!hasDraftRequirements) {
        return {
          label: "Save Changes",
          nextStatus: "changes_requested" as SocialPostStatus,
          helper: "Apply requested changes before re-submitting for review.",
        };
      }
      return {
        label: "Re-submit for Review",
        nextStatus: "in_review" as SocialPostStatus,
        helper: "Changes are ready. Send this post back to review.",
      };
    }
    if (form?.status === "in_review" && isAdmin && !hasReviewRequirements) {
      return {
        label: "Complete Required Fields",
        nextStatus: "in_review" as SocialPostStatus,
        helper:
          "Before creative approval, add Platforms, Caption, and Scheduled Publish Date.",
      };
    }
    if (form?.status === "creative_approved") {
      if (!hasReviewRequirements) {
        return {
          label: "Save Changes",
          nextStatus: "creative_approved" as SocialPostStatus,
          helper:
            "Add Platforms, Caption, and Scheduled Publish Date before moving to Ready to Publish.",
        };
      }
      return {
        label: "Move to Ready to Publish",
        nextStatus: "ready_to_publish" as SocialPostStatus,
        helper: "Creative is approved. Handoff to execution.",
      };
    }
    if (form?.status === "ready_to_publish") {
      return {
        label: "Mark Awaiting Live Link",
        nextStatus: "awaiting_live_link" as SocialPostStatus,
        helper: "Execution complete. Await final live link submission.",
      };
    }
    if (form?.status === "awaiting_live_link") {
      if (hasLiveLink) {
        return {
          label: "Submit Link",
          nextStatus: "published" as SocialPostStatus,
          helper: "At least one live link exists. Submit link to mark this post published.",
        };
      }
      return {
        label: "Await Live Link",
        nextStatus: "awaiting_live_link" as SocialPostStatus,
        helper: "Add at least one live link before marking published.",
      };
    }
    if (form?.status === "in_review") {
      if (isAdmin) {
        return {
          label: "Approve Creative",
          nextStatus: "creative_approved" as SocialPostStatus,
          helper:
            "Approve this creative handoff or use the status control to request changes.",
        };
      }
      return {
        label: "Await Admin Review",
        nextStatus: "in_review" as SocialPostStatus,
        helper: "An admin must approve or request changes in this stage.",
      };
    }
    if (form?.status === "published") {
      if (!hasReviewRequirements) {
        return {
          label: "Save Changes",
          nextStatus: "published" as SocialPostStatus,
          helper: "Published post has missing required setup fields.",
        };
      }
      return {
        label: "Save Changes",
        nextStatus: "published" as SocialPostStatus,
        helper: "Update details for this published post.",
      };
    }
    return {
      label: "Save Changes",
      nextStatus: "published" as SocialPostStatus,
      helper: "Update details for this published post.",
    };
  }, [form?.status, hasDraftRequirements, hasLiveLink, hasReviewRequirements, isAdmin]);

  const canSubmitFinalAction = useMemo(() => {
    if (!form) {
      return false;
    }
    if (finalAction.nextStatus === form.status) {
      return !isExecutionStage(form.status);
    }
    if (form.status === "draft" || form.status === "changes_requested") {
      return hasDraftRequirements;
    }
    if (form.status === "in_review" || form.status === "creative_approved") {
      return hasReviewRequirements;
    }
    if (form.status === "awaiting_live_link") {
      return hasLiveLink;
    }
    return true;
  }, [finalAction.nextStatus, form, hasDraftRequirements, hasLiveLink, hasReviewRequirements]);
  const isBriefDirty = useMemo(() => {
    if (!form || !savedFormSnapshot) {
      return false;
    }
    return createSocialEditorFormSnapshot(form) !== savedFormSnapshot;
  }, [form, savedFormSnapshot]);
  const socialSectionLinks = useMemo(
    () =>
      [
        { href: "#social-editor-step-setup", label: "Setup" },
        { href: "#social-editor-step-assignment", label: "Assignment" },
        { href: "#social-editor-step-associated-blog", label: "Associated Blog" },
        { href: "#social-editor-step-write-caption", label: "Write Caption" },
        { href: "#social-editor-step-review-publish", label: "Review & Publish" },
        { href: "#social-editor-step-comments", label: "Comments" },
        { href: "#social-editor-step-current-snapshot", label: "Current Snapshot" },
        { href: "#social-editor-step-checklist", label: "Checklist" },
        {
          href: "#social-editor-step-assignment-changes",
          label: "Assignment & Changes",
        },
      ] as const,
    []
  );
  const transitionRequiredFields = useMemo<PreflightFieldKey[]>(() => {
    if (!form || finalAction.nextStatus === form.status) {
      return [];
    }
    const required = [
      ...(REQUIRED_FIELDS_FOR_STATUS[finalAction.nextStatus] ?? []),
    ] as PreflightFieldKey[];
    if (finalAction.nextStatus === "published") {
      required.push("live_links");
    }
    return Array.from(new Set(required));
  }, [finalAction.nextStatus, form]);
  const missingTransitionFields = useMemo<PreflightFieldKey[]>(() => {
    if (!form || transitionRequiredFields.length === 0) {
      return [];
    }
    return transitionRequiredFields.filter((field) => {
      if (field === "live_links") {
        return !hasLiveLink;
      }
      if (field === "platforms") {
        return form.platforms.length === 0;
      }
      if (field === "canva_url") {
        return !validateCanvaUrl(form.canva_url);
      }
      if (field === "caption") {
        return form.caption.trim().length === 0;
      }
      if (field === "scheduled_date") {
        return form.scheduled_date.trim().length === 0;
      }
      if (field === "product" || field === "type") {
        return !form[field];
      }
      return false;
    });
  }, [form, hasLiveLink, transitionRequiredFields]);
  const readyTransitionFieldCount =
    transitionRequiredFields.length - missingTransitionFields.length;
  const activityUserNameById = useMemo(() => {
    const entries: Array<[string, string]> = [];
    for (const nextUser of availableUsers) {
      if (nextUser.id && nextUser.full_name) {
        entries.push([nextUser.id, nextUser.full_name]);
      }
    }
    for (const entry of activity) {
      if (entry.actor?.id && entry.actor.full_name) {
        entries.push([entry.actor.id, entry.actor.full_name]);
      }
    }
    return Object.fromEntries(entries);
  }, [activity, availableUsers]);
  const latestActivity = useMemo(() => activity.slice(0, 20), [activity]);
  const groupedLatestActivity = useMemo(() => {
    const groups = new Map<string, SocialActivityRecord[]>();
    for (const entry of latestActivity) {
      const dayLabel = formatDateInTimezone(
        entry.changed_at,
        profile?.timezone,
        "MMM d, yyyy"
      );
      const bucket = groups.get(dayLabel) ?? [];
      bucket.push(entry);
      groups.set(dayLabel, bucket);
    }
    return Array.from(groups.entries()).map(([dayLabel, entries]) => ({
      dayLabel,
      entries,
    }));
  }, [latestActivity, profile?.timezone]);
  const latestRollbackReason = useMemo(() => {
    for (const entry of latestActivity) {
      if (entry.event_type !== "social_post_rolled_back") {
        continue;
      }
      const reasonValue = entry.metadata?.reason;
      if (typeof reasonValue === "string" && reasonValue.trim().length > 0) {
        return reasonValue.trim();
      }
    }
    return null;
  }, [latestActivity]);
  const assignedToName = getUserDisplayNameById(post?.worker_user_id);
  const reviewerName = getUserDisplayNameById(post?.reviewer_user_id);
  const currentOwnerName = useMemo(() => {
    if (!post) {
      return "Team";
    }
    if (post.status === "in_review" || post.status === "creative_approved") {
      return getUserDisplayNameById(post.reviewer_user_id);
    }
    if (post.status === "published") {
      return "Team";
    }
    return getUserDisplayNameById(post.worker_user_id);
  }, [getUserDisplayNameById, post]);
  const nextOwnerName = useMemo(() => {
    if (!post) {
      return "Team";
    }
    return getTargetUserNameForStatus(finalAction.nextStatus, post);
  }, [finalAction.nextStatus, getTargetUserNameForStatus, post]);
  const getTransitionLockSummary = useCallback((toStatus: SocialPostStatus) => {
    if (toStatus === "ready_to_publish" || toStatus === "awaiting_live_link") {
      return "Brief fields lock for non-admin users during execution stages.";
    }
    if (toStatus === "published") {
      return "Published is terminal for workflow progression unless reopened by admin path.";
    }
    if (toStatus === "changes_requested") {
      return "Brief editing reopens for creator revisions.";
    }
    return "Brief editing remains available for the next stage.";
  }, []);

  const applyCaptionEdit = (nextCaption: string, selectionStart: number, selectionEnd: number) => {
    setForm((previous) => (previous ? { ...previous, caption: nextCaption } : previous));
    window.setTimeout(() => {
      if (!captionRef.current) {
        return;
      }
      captionRef.current.focus();
      captionRef.current.setSelectionRange(selectionStart, selectionEnd);
    }, 0);
  };

  const handleBoldFormat = () => {
    if (!captionRef.current || !form) {
      return;
    }
    const start = captionRef.current.selectionStart;
    const end = captionRef.current.selectionEnd;
    if (start === end) {
      showError("Select text first.");
      return;
    }
    const selected = form.caption.slice(start, end);
    const transformed = toBoldFormat(selected);
    const next = `${form.caption.slice(0, start)}${transformed}${form.caption.slice(end)}`;
    applyCaptionEdit(next, start, start + transformed.length);
    showSuccess("Bold format applied.");
  };

  const handleInsertBullet = () => {
    if (!captionRef.current || !form) {
      return;
    }
    const start = captionRef.current.selectionStart;
    const end = captionRef.current.selectionEnd;
    const prefix = start > 0 && form.caption[start - 1] !== "\n" ? "\n" : "";
    const insertion = `${prefix}• `;
    const next = `${form.caption.slice(0, start)}${insertion}${form.caption.slice(end)}`;
    const cursor = start + insertion.length;
    applyCaptionEdit(next, cursor, cursor);
  };

  const handleCaptionKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!form) {
      return;
    }
    if (event.key !== "Enter") {
      return;
    }
    const target = event.currentTarget;
    const cursor = target.selectionStart;
    const lineStart = form.caption.lastIndexOf("\n", cursor - 1) + 1;
    const lineEnd = form.caption.indexOf("\n", cursor);
    const currentLine = form.caption.slice(lineStart, lineEnd === -1 ? undefined : lineEnd);
    if (!currentLine.startsWith("• ")) {
      return;
    }
    event.preventDefault();
    const contentAfterBullet = currentLine.slice(2).trim();
    if (contentAfterBullet.length === 0) {
      const replacement = "\n";
      const next = `${form.caption.slice(0, lineStart)}${replacement}${form.caption.slice(cursor)}`;
      applyCaptionEdit(next, lineStart + 1, lineStart + 1);
      return;
    }
    const insertion = "\n• ";
    const next = `${form.caption.slice(0, cursor)}${insertion}${form.caption.slice(cursor)}`;
    const nextCursor = cursor + insertion.length;
    applyCaptionEdit(next, nextCursor, nextCursor);
  };

  const copyText = async (text: string) => {
    if (!text.trim()) {
      showError(VALIDATION_MESSAGES.nothingToCopy);
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      showSuccess(VALIDATION_MESSAGES.copiedToClipboard);
    } catch {
      showError(VALIDATION_MESSAGES.copyFailed);
    }
  };
  const jumpToPreflightField = useCallback((field: PreflightFieldKey) => {
    const targetId = PREFLIGHT_FIELD_META[field]?.targetId;
    if (!targetId) {
      return;
    }
    const target = document.getElementById(targetId);
    if (!target) {
      return;
    }
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    if (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement
    ) {
      target.focus();
      return;
    }
    const nestedFocusable = target.querySelector("input,textarea,select,button");
    if (nestedFocusable instanceof HTMLElement) {
      nestedFocusable.focus();
    }
  }, []);
  useEffect(() => {
    setHasAppliedRequestedFocus(false);
  }, [postId, requestedFocusTarget]);
  useEffect(() => {
    if (!requestedFocusTarget || !post || !form || hasAppliedRequestedFocus) {
      return;
    }
    const targetId = EDITOR_FOCUS_TARGET_IDS[requestedFocusTarget];
    const target = document.getElementById(targetId);
    if (!target) {
      return;
    }
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    const nestedFocusable = target.querySelector("input,textarea,select,button");
    if (nestedFocusable instanceof HTMLElement) {
      nestedFocusable.focus();
    }
    setHasAppliedRequestedFocus(true);
  }, [form, hasAppliedRequestedFocus, post, requestedFocusTarget]);
  const handleQuickAddLiveLink = () => {
    const rawInput = quickLiveLinkInput.trim();
    if (!rawInput) {
      showError("Add a link first.");
      return;
    }
    const normalizedUrl = /^https?:\/\//i.test(rawInput) ? rawInput : `https://${rawInput}`;
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(normalizedUrl);
    } catch {
      showError("Enter a valid live link.");
      return;
    }
    const detectedPlatform = detectPlatformFromUrl(parsedUrl.toString());
    if (!detectedPlatform) {
      showError("Couldn't detect platform. Use a LinkedIn, Facebook, or Instagram URL.");
      return;
    }
    setLiveLinkDrafts((previous) => ({
      ...previous,
      [detectedPlatform]: parsedUrl.toString(),
    }));
    setQuickLiveLinkInput("");
    showSuccess(`${SOCIAL_PLATFORM_LABELS[detectedPlatform]} link added.`);
  };
  const handleAddComment = async () => {
    if (!post || !user?.id) {
      showError(VALIDATION_MESSAGES.sessionExpired);
      return;
    }
    if (!session?.access_token) {
      showError(VALIDATION_MESSAGES.sessionExpired);
      return;
    }
    const trimmedComment = commentDraft.trim();
    if (!trimmedComment) {
      showError("Comment cannot be empty.");
      return;
    }
    setIsCommentSaving(true);
    const createResponse = await fetch(`/api/social-posts/${post.id}/comments`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${session.access_token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        comment: trimmedComment,
        parent_comment_id: null,
      }),
    }).catch(() => null);
    if (!createResponse) {
      showError("Couldn't add comment. Please try again.");
      setIsCommentSaving(false);
      return;
    }
    const createPayload = await parseApiResponseJson<Record<string, unknown>>(createResponse);
    if (isApiFailure(createResponse, createPayload)) {
      showError(getApiErrorMessage(createPayload, "Couldn't add comment. Please try again."));
      setIsCommentSaving(false);
      return;
    }
    setCommentDraft("");
    await loadPost();
    showSuccess("Comment added.");
    setIsCommentSaving(false);
  };

  const handleSaveLiveLinks = async () => {
    if (!post || !user?.id) {
      showError(VALIDATION_MESSAGES.sessionExpired);
      return;
    }
    setIsLiveLinksSaving(true);
    const supabase = getSupabaseBrowserClient();
    const existingByPlatform = new Map<SocialPlatform, SocialPostLinkRecord>(
      liveLinks.map((link) => [link.platform, link])
    );

    try {
      for (const platform of SOCIAL_PLATFORMS) {
        const nextUrl = (liveLinkDrafts[platform] ?? "").trim();
        const existingLink = existingByPlatform.get(platform) ?? null;

        if (!nextUrl && existingLink) {
          const { error: deleteError } = await supabase
            .from("social_post_links")
            .delete()
            .eq("id", existingLink.id);
          if (deleteError) {
            throw new Error(deleteError.message);
          }
          continue;
        }

        if (!nextUrl) {
          continue;
        }

        const { error: upsertError } = await supabase
          .from("social_post_links")
          .upsert(
            {
              social_post_id: post.id,
              platform,
              url: nextUrl,
              created_by: user.id,
            },
            { onConflict: "social_post_id,platform" }
          );
        if (upsertError) {
          throw new Error(upsertError.message);
        }
      }

      const { data: linksData, error: linksError } = await supabase
        .from("social_post_links")
        .select("id,social_post_id,platform,url,created_by,created_at,updated_at")
        .eq("social_post_id", post.id)
        .order("created_at", { ascending: true });
      if (linksError) {
        throw new Error(linksError.message);
      }
      const normalizedLinks = normalizePostLinkRows(
        (linksData ?? []) as Array<Record<string, unknown>>
      );
      setLiveLinks(normalizedLinks);
      setLiveLinkDrafts(toLiveLinkDrafts(normalizedLinks));
      await loadPost();
      showSuccess(VALIDATION_MESSAGES.linksSaved);
    } catch (saveError) {
      showError(
        saveError instanceof Error
          ? `${VALIDATION_MESSAGES.couldNotSaveLinks} ${saveError.message}`
          : VALIDATION_MESSAGES.couldNotSaveLinks
      );
    } finally {
      setIsLiveLinksSaving(false);
    }
  };
  const submitReopenBrief = async (reason: string | null) => {
    if (!post) {
      return;
    }
    if (!session?.access_token) {
      showError(VALIDATION_MESSAGES.sessionExpired);
      return;
    }
    setIsSaving(true);
    const response = await fetch(`/api/social-posts/${post.id}/reopen-brief`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${session.access_token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        reason,
      }),
    }).catch(() => null);
    if (!response) {
      showError(VALIDATION_MESSAGES.couldNotReopenBrief);
      setIsSaving(false);
      return;
    }
    const payload = await parseApiResponseJson<Record<string, unknown>>(response);
    if (isApiFailure(response, payload)) {
      showError(getApiErrorMessage(payload, VALIDATION_MESSAGES.couldNotReopenBrief));
      setIsSaving(false);
      return;
    }
    const previousStatus = post.status;
    setPost((previous) =>
      previous
        ? {
            ...previous,
            status: "creative_approved",
            updated_at: new Date().toISOString(),
          }
        : previous
    );
    setForm((previous) =>
      previous
        ? {
            ...previous,
            status: "creative_approved",
          }
        : previous
    );
    pushNotification(
      socialPostStatusChangedNotification(
        post.title.trim() || "Social Post",
        previousStatus,
        "creative_approved",
        profile?.full_name ?? null,
        post.id,
        getTargetUserNameForStatus("creative_approved", post)
      )
    );
    await loadPost();
    showSuccess(VALIDATION_MESSAGES.postReopened);
    setIsSaving(false);
  };
  const handleReopenBrief = () => {
    setReopenBriefReason("");
    setIsReopenBriefModalOpen(true);
  };

  const handleFinalAction = useCallback(async () => {
    if (!form || !post) {
      return;
    }
    if (finalAction.nextStatus === form.status) {
      if (isExecutionStage(form.status)) {
        return;
      }
      await persistBrief(form, "manual");
      return;
    }
    setPendingPrimaryTransitionConfirmation({
      fromStatus: form.status,
      toStatus: finalAction.nextStatus,
    });
  }, [finalAction.nextStatus, form, persistBrief, post]);
  const confirmPendingPrimaryTransition = async () => {
    if (!pendingPrimaryTransitionConfirmation) {
      return;
    }
    const nextStatus = pendingPrimaryTransitionConfirmation.toStatus;
    setPendingPrimaryTransitionConfirmation(null);
    await transitionPostStatus(nextStatus);
  };

  const [isDeletingPost, setIsDeletingPost] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const isPrimaryActionDisabled =
    !form ||
    isSaving ||
    isOverLimit ||
    !canActOnCurrentStatus ||
    !canCurrentUserTransition(form.status, finalAction.nextStatus) ||
    !canSubmitFinalAction;

  const handleDeletePost = async () => {
    if (!post || !session?.access_token) {
      return;
    }
    setIsDeletingPost(true);

    const response = await fetch(`/api/social-posts/${post.id}`, {
      method: "DELETE",
      headers: {
        authorization: `Bearer ${session.access_token}`,
        "content-type": "application/json",
      },
    });
    const payload = await parseApiResponseJson<Record<string, unknown>>(response);
    if (isApiFailure(response, payload)) {
      showError(getApiErrorMessage(payload, "Failed to delete post."));
      setIsDeletingPost(false);
      return;
    }

    showSuccess("Post deleted.");
    router.push("/social-posts");
  };
  useEffect(() => {
    const handleEditorShortcut = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey) {
        return;
      }
      if (!event.altKey || !event.shiftKey) {
        return;
      }
      if (
        pendingChangeRequestTransition ||
        pendingPrimaryTransitionConfirmation ||
        isReopenBriefModalOpen ||
        isDeleteModalOpen
      ) {
        return;
      }
      const normalizedKey = event.key.length === 1 ? event.key.toLowerCase() : event.key;
      if (normalizedKey === SOCIAL_POST_EDITOR_SHORTCUTS.nextRequired.key) {
        event.preventDefault();
        if (missingTransitionFields.length === 0) {
          showSuccess("All required transition fields are complete.");
          return;
        }
        jumpToPreflightField(missingTransitionFields[0]);
        showSuccess("Jumped to next required field.");
        return;
      }
      if (event.key === SOCIAL_POST_EDITOR_SHORTCUTS.primaryAction.key) {
        event.preventDefault();
        if (isPrimaryActionDisabled) {
          showError("Primary action is unavailable right now.");
          return;
        }
        void handleFinalAction();
      }
    };
    window.addEventListener("keydown", handleEditorShortcut);
    return () => {
      window.removeEventListener("keydown", handleEditorShortcut);
    };
  }, [
    handleFinalAction,
    isDeleteModalOpen,
    isPrimaryActionDisabled,
    isReopenBriefModalOpen,
    jumpToPreflightField,
    missingTransitionFields,
    pendingChangeRequestTransition,
    pendingPrimaryTransitionConfirmation,
    showError,
    showSuccess,
  ]);

  if (isLoading) {
    return (
      <ProtectedPage>
        <AppShell>
          <div className="space-y-4">
            <div className="skeleton h-7 w-48" />
            <div className="skeleton h-72 w-full" />
          </div>
        </AppShell>
      </ProtectedPage>
    );
  }

  if (!form || !post) {
    return (
      <ProtectedPage>
        <AppShell>
          <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error ?? "Post not found."}
          </div>
        </AppShell>
      </ProtectedPage>
    );
  }

  return (
    <ProtectedPage>
      <AppShell>
        <div className="space-y-5">
          <nav
            aria-label="Breadcrumb"
            className="flex flex-wrap items-center gap-1 text-xs text-slate-500"
          >
            <Link href="/dashboard" className="hover:text-slate-700">
              Dashboard
            </Link>
            <span>/</span>
            <Link href="/social-posts" className="hover:text-slate-700">
              Social Posts
            </Link>
            <span>/</span>
            <span className="text-slate-700">Details</span>
          </nav>
          <DataPageHeader
            title={form.title || "Social Post"}
            description="Build and refine your social post from concept to publication."
            primaryAction={
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={isDeletingPost}
                  onClick={() => {
                    setIsDeleteModalOpen(true);
                  }}
                >
                  {isDeletingPost ? "Deleting…" : "Delete"}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    router.push("/social-posts");
                  }}
                >
                  Back to Social Posts
                </Button>
              </div>
            }
          />
          <section className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
                  Next Action
                </h3>
                <p className="text-sm font-medium text-slate-900">
                  {finalAction.label} → {SOCIAL_POST_STATUS_LABELS[finalAction.nextStatus]}
                </p>
                <p className="text-sm text-slate-600">{finalAction.helper}</p>
                <p className="text-xs text-slate-600">
                  Current owner: {currentOwnerName} • Next owner: {nextOwnerName}
                </p>
                <p
                  className={`text-xs ${
                    isBriefDirty ? "text-amber-700" : "text-emerald-700"
                  }`}
                >
                  {isBriefDirty
                    ? "Unsaved changes"
                    : `All changes saved • ${formatSavedTimestamp(post.updated_at, profile?.timezone)}`}
                </p>
              </div>
              <Button
                variant="primary"
                size="sm"
                disabled={isPrimaryActionDisabled}
                aria-keyshortcuts="Alt+Shift+Enter"
                onClick={() => {
                  void handleFinalAction();
                }}
              >
                {isSaving ? "Saving…" : finalAction.label}
              </Button>
            </div>
            <div className="space-y-2 rounded-md border border-slate-200 bg-white p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Transition Preflight
              </p>
              {transitionRequiredFields.length === 0 ? (
                <p className="text-xs text-emerald-700">No required blockers for current action.</p>
              ) : (
                <p className="text-xs text-slate-600">
                  {readyTransitionFieldCount} / {transitionRequiredFields.length} required items
                  ready.
                </p>
              )}
              <p className="text-[11px] text-slate-500">
                Shortcut: {SOCIAL_POST_EDITOR_SHORTCUTS.nextRequired.keys[0]} • Primary action:{" "}
                {SOCIAL_POST_EDITOR_SHORTCUTS.primaryAction.keys[0]}
              </p>
            </div>
          </section>
          <nav
            aria-label="Detail sections"
            className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2"
          >
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Jump to
            </span>
            {socialSectionLinks.map((sectionLink) => (
              <a
                key={sectionLink.href}
                href={sectionLink.href}
                className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
              >
                {sectionLink.label}
              </a>
            ))}
          </nav>
          <ConfirmationModal
            isOpen={isDeleteModalOpen}
            title="Delete post?"
            description="Are you sure you want to delete this post? This action cannot be undone."
            confirmLabel="Delete post"
            tone="danger"
            isConfirming={isDeletingPost}
            onCancel={() => {
              if (!isDeletingPost) {
                setIsDeleteModalOpen(false);
              }
            }}
            onConfirm={() => {
              void handleDeletePost();
            }}
          />
          <ConfirmationModal
            isOpen={pendingPrimaryTransitionConfirmation !== null}
            title="Confirm transition?"
            description="Review this handoff summary before moving to the next stage."
            confirmLabel={
              pendingPrimaryTransitionConfirmation
                ? `Move to ${SOCIAL_POST_STATUS_LABELS[pendingPrimaryTransitionConfirmation.toStatus]}`
                : "Confirm"
            }
            isConfirming={isSaving}
            onCancel={() => {
              if (!isSaving) {
                setPendingPrimaryTransitionConfirmation(null);
              }
            }}
            onConfirm={() => {
              void confirmPendingPrimaryTransition();
            }}
          >
            {pendingPrimaryTransitionConfirmation ? (
              <div className="space-y-2 text-sm text-slate-700">
                <p>
                  <span className="font-medium">Status change:</span>{" "}
                  {SOCIAL_POST_STATUS_LABELS[pendingPrimaryTransitionConfirmation.fromStatus]} →{" "}
                  {SOCIAL_POST_STATUS_LABELS[pendingPrimaryTransitionConfirmation.toStatus]}
                </p>
                <p>
                  <span className="font-medium">Next owner:</span>{" "}
                  {getTargetUserNameForStatus(
                    pendingPrimaryTransitionConfirmation.toStatus,
                    post
                  )}
                </p>
                <p>
                  <span className="font-medium">Locking behavior:</span>{" "}
                  {getTransitionLockSummary(pendingPrimaryTransitionConfirmation.toStatus)}
                </p>
              </div>
            ) : null}
          </ConfirmationModal>
          <ConfirmationModal
            isOpen={pendingChangeRequestTransition !== null}
            title="Send back to Changes Requested?"
            description="Select a category and checklist so revisions are clear and actionable."
            confirmLabel="Send back"
            isConfirming={isSaving}
            confirmDisabled={
              Boolean(
                pendingChangeRequestTransition &&
                  getChangeRequestTemplateError(
                    pendingChangeRequestTransition.template
                  )
              )
            }
            onCancel={() => {
              if (!isSaving) {
                setPendingChangeRequestTransition(null);
              }
            }}
            onConfirm={() => {
              if (!pendingChangeRequestTransition) {
                return;
              }
              const templateError = getChangeRequestTemplateError(
                pendingChangeRequestTransition.template
              );
              if (templateError) {
                showError(templateError);
                return;
              }
              const nextStatus = pendingChangeRequestTransition.toStatus;
              const transitionTemplate = pendingChangeRequestTransition.template;
              setPendingChangeRequestTransition(null);
              void transitionPostStatus(nextStatus, {
                changeRequestTemplate: transitionTemplate,
              });
            }}
          >
            <div className="space-y-3">
              <label className="space-y-1 text-sm text-slate-700">
                <span className="font-medium">Category</span>
                <select
                  value={pendingChangeRequestTransition?.template.category ?? ""}
                  onChange={(event) => {
                    setPendingChangeRequestTransition((previous) =>
                      previous
                        ? {
                            ...previous,
                            template: {
                              ...previous.template,
                              category: event.target.value as ChangeRequestTemplateState["category"],
                            },
                          }
                        : previous
                    );
                  }}
                  className="focus-field w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="">Select category</option>
                  {CHANGE_REQUEST_CATEGORY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium text-slate-700">
                  Action checklist
                </legend>
                {CHANGE_REQUEST_CHECKLIST_OPTIONS.map((option) => {
                  const isChecked = Boolean(
                    pendingChangeRequestTransition?.template.checklist.includes(
                      option.id
                    )
                  );
                  return (
                    <label
                      key={option.id}
                      className="flex items-start gap-2 text-sm text-slate-700"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(event) => {
                          setPendingChangeRequestTransition((previous) => {
                            if (!previous) {
                              return previous;
                            }
                            const nextChecklist = event.target.checked
                              ? [...previous.template.checklist, option.id]
                              : previous.template.checklist.filter(
                                  (entry) => entry !== option.id
                                );
                            return {
                              ...previous,
                              template: {
                                ...previous.template,
                                checklist: Array.from(new Set(nextChecklist)),
                              },
                            };
                          });
                        }}
                        className="mt-0.5"
                      />
                      <span>{option.label}</span>
                    </label>
                  );
                })}
              </fieldset>
              <label className="space-y-1 text-sm text-slate-700">
                <span className="font-medium">Context (optional)</span>
                <textarea
                  value={pendingChangeRequestTransition?.template.note ?? ""}
                  onChange={(event) => {
                    setPendingChangeRequestTransition((previous) =>
                      previous
                        ? {
                            ...previous,
                            template: {
                              ...previous.template,
                              note: event.target.value,
                            },
                          }
                        : previous
                    );
                  }}
                  rows={3}
                  className="focus-field w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Add implementation context for the next pass..."
                />
              </label>
            </div>
          </ConfirmationModal>
          <ConfirmationModal
            isOpen={isReopenBriefModalOpen}
            title="Reopen brief to Creative Approved?"
            description="Optionally provide a reason for reopening this post."
            confirmLabel="Reopen brief"
            isConfirming={isSaving}
            onCancel={() => {
              if (!isSaving) {
                setIsReopenBriefModalOpen(false);
                setReopenBriefReason("");
              }
            }}
            onConfirm={() => {
              const reason = reopenBriefReason.trim();
              setIsReopenBriefModalOpen(false);
              setReopenBriefReason("");
              void submitReopenBrief(reason.length > 0 ? reason : null);
            }}
          >
            <label className="space-y-1 text-sm text-slate-700">
              <span className="font-medium">Reason (optional)</span>
              <textarea
                value={reopenBriefReason}
                onChange={(event) => {
                  setReopenBriefReason(event.target.value);
                }}
                rows={3}
                className="focus-field w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                placeholder="Add context for why this brief is being reopened..."
              />
            </label>
          </ConfirmationModal>
          {!canEditBrief ? (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              <span>
                Brief fields are read-only at this stage for non-admin users.
              </span>
              {isAdmin ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="xs"
                  disabled={isSaving}
                  onClick={() => {
                    void handleReopenBrief();
                  }}
                >
                  Edit Brief
                </Button>
              ) : null}
            </div>
          ) : null}
          <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-4">
              <section
                id="social-editor-step-setup"
                className="space-y-4 rounded-lg border border-slate-200 bg-white p-4"
              >
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Setup</h3>
                  <p className="text-sm text-slate-600">
                    Define the post essentials before writing or review.
                  </p>
                </div>
                <fieldset
                  disabled={!canEditBrief}
                  className="disabled:opacity-70"
                >
                  <div className="space-y-3 border-b border-slate-200 pb-3">
                    <h4 className="text-sm font-semibold text-slate-900">Required Now</h4>
                    <div className="grid gap-3 md:grid-cols-2">
                      <label className="space-y-1 text-sm text-slate-700">
                        <span className="font-medium">Product</span>
                        <select
                          id="social-post-product"
                          value={form.product}
                          onChange={(event) => {
                            setForm((previous) =>
                              previous
                                ? { ...previous, product: event.target.value as SocialPostProduct }
                                : previous
                            );
                          }}
                          className="focus-field w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                        >
                          {SOCIAL_POST_PRODUCTS.map((product) => (
                            <option key={product} value={product}>
                              {SOCIAL_POST_PRODUCT_LABELS[product]}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="space-y-1 text-sm text-slate-700">
                        <span className="font-medium">Type</span>
                        <select
                          id="social-post-type"
                          value={form.type}
                          onChange={(event) => {
                            setForm((previous) =>
                              previous ? { ...previous, type: event.target.value as SocialPostType } : previous
                            );
                          }}
                          className="focus-field w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                        >
                          {SOCIAL_POST_TYPES.map((type) => (
                            <option key={type} value={type}>
                              {SOCIAL_POST_TYPE_LABELS[type]}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="space-y-1 text-sm text-slate-700 md:col-span-2">
                        <span className="font-medium">Canva Link</span>
                        <input
                          id="social-post-canva-url"
                          type="url"
                          value={form.canva_url}
                          onChange={(event) => {
                            setForm((previous) =>
                              previous ? { ...previous, canva_url: event.target.value } : previous
                            );
                          }}
                          className="focus-field w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                          placeholder="https://www.canva.com/..."
                        />
                        {form.canva_url.trim() && !hasValidCanvaUrl && (
                          <p className="text-xs text-rose-700">{VALIDATION_MESSAGES.canvaUrlInvalid}</p>
                        )}
                      </label>
                    </div>
                  </div>
                  <div
                    className={`space-y-3 pt-3 ${
                      requiresReviewDetails
                        ? "rounded-md border border-blue-200 bg-blue-50/70 p-3"
                        : ""
                    }`}
                  >
                    <h4 className="text-sm font-semibold text-slate-900">
                      Required Before Approval
                    </h4>
                    <div className="grid gap-3 md:grid-cols-2">
                      <label className="space-y-1 text-sm text-slate-700">
                        <span className="font-medium">Scheduled Publish Date</span>
                        <input
                          id="social-post-scheduled-date"
                          type="date"
                          value={form.scheduled_date}
                          onChange={(event) => {
                            setForm((previous) =>
                              previous ? { ...previous, scheduled_date: event.target.value } : previous
                            );
                          }}
                          className="focus-field w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                        />
                      </label>
                      <div id="social-post-platforms" className="space-y-1 text-sm text-slate-700 md:col-span-2">
                        <span className="font-medium">Platform(s)</span>
                        <div className="flex flex-wrap gap-2">
                          {SOCIAL_PLATFORMS.map((platform) => {
                            const isSelected = form.platforms.includes(platform);
                            return (
                              <Button
                                key={platform}
                                size="xs"
                                variant={isSelected ? "primary" : "secondary"}
                                onClick={() => {
                                  setForm((previous) => {
                                    if (!previous) {
                                      return previous;
                                    }
                                    const nextPlatforms = previous.platforms.includes(platform)
                                      ? previous.platforms.filter((entry) => entry !== platform)
                                      : [...previous.platforms, platform];
                                    return { ...previous, platforms: nextPlatforms };
                                  });
                                }}
                              >
                                {SOCIAL_PLATFORM_LABELS[platform]}
                              </Button>
                            );
                          })}
                        </div>
                        {requiresReviewDetails && !hasPlatform && (
                          <p className="text-xs text-rose-700">{VALIDATION_MESSAGES.platformRequired}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  <details
                    open={isOptionalSetupOpen}
                    onToggle={(event) => {
                      setIsOptionalSetupOpen(event.currentTarget.open);
                    }}
                    className="rounded-md border border-slate-200 bg-slate-50/70 px-3 py-2"
                  >
                    <summary className="cursor-pointer text-sm font-semibold text-slate-900">
                      Optional Details
                    </summary>
                    <div className="grid gap-3 pt-3 md:grid-cols-2">
                      <label className="space-y-1 text-sm text-slate-700">
                        <span className="font-medium">Canva Page</span>
                        <input
                          value={form.canva_page}
                          onChange={(event) => {
                            setForm((previous) =>
                              previous ? { ...previous, canva_page: event.target.value } : previous
                            );
                          }}
                          className="focus-field w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                          placeholder="e.g. 23"
                        />
                      </label>
                      <label className="space-y-1 text-sm text-slate-700">
                        <span className="font-medium">Post Title</span>
                        <input
                          value={form.title}
                          onChange={(event) => {
                            setForm((previous) =>
                              previous ? { ...previous, title: event.target.value } : previous
                            );
                          }}
                          className="focus-field w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                        />
                      </label>
                    </div>
                  </details>
                </fieldset>
              </section>

              <section
                id="social-editor-step-assignment"
                className="space-y-4 rounded-lg border border-slate-200 bg-white p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">Assignment</h3>
                    <p className="text-sm text-slate-600">Manage who is working on and reviewing this post.</p>
                  </div>
                  {isAdmin && !editingAssignment ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setEditWorkerUserId(post?.worker_user_id ?? null);
                        setEditReviewerUserId(post?.reviewer_user_id ?? null);
                        setEditingAssignment(true);
                      }}
                    >
                      Edit
                    </Button>
                  ) : null}
                </div>
                {editingAssignment && isAdmin ? (
                  <div className="space-y-3 rounded-md border border-blue-200 bg-blue-50 p-3">
                    <div className="grid gap-3 md:grid-cols-2">
                      <label className="block">
                        <span className="mb-1 block text-sm font-medium text-slate-700">Assigned to</span>
                        <select
                          value={editWorkerUserId ?? ""}
                          onChange={(event) => {
                            setEditWorkerUserId(event.target.value || null);
                          }}
                          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                        >
                          <option value="">— Select person —</option>
                          {availableUsers.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.full_name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-sm font-medium text-slate-700">Reviewer</span>
                        <select
                          value={editReviewerUserId ?? ""}
                          onChange={(event) => {
                            setEditReviewerUserId(event.target.value || null);
                          }}
                          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                        >
                          <option value="">— Select reviewer —</option>
                          {availableUsers.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.full_name}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        variant="primary"
                        size="sm"
                        disabled={isAssignmentSaving}
                        onClick={() => void saveAssignments()}
                      >
                        {isAssignmentSaving ? "Saving..." : "Save"}
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={isAssignmentSaving}
                        onClick={() => setEditingAssignment(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 rounded-md border border-slate-200 bg-slate-50 p-3">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-600">Assigned to</p>
                      <p className="mt-1 text-sm text-slate-900">
                        {availableUsers.find((u) => u.id === post?.worker_user_id)?.full_name || "Not assigned"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-600">Reviewer</p>
                      <p className="mt-1 text-sm text-slate-900">
                        {availableUsers.find((u) => u.id === post?.reviewer_user_id)?.full_name || "Not assigned"}
                      </p>
                    </div>
                  </div>
                )}
              </section>

              <section
                id="social-editor-step-associated-blog"
                className="space-y-4 rounded-lg border border-slate-200 bg-white p-4"
              >
                <div>
                  <h3 className="text-base font-semibold text-slate-900">
                    Associated Blog <span className="text-slate-500">(optional)</span>
                  </h3>
                  <p className="text-sm text-slate-600">
                    Link a related blog so caption and publishing context stay connected.
                  </p>
                </div>
                <fieldset disabled={!canEditBrief} className="space-y-4 disabled:opacity-70">
                <label className="space-y-1 text-sm text-slate-700">
                  <span className="font-medium">Associated Blog Search</span>
                  <input
                    value={blogSearchQuery}
                    onFocus={() => setIsBlogSearchOpen(true)}
                    onChange={(event) => {
                      setBlogSearchQuery(event.target.value);
                      setIsBlogSearchOpen(true);
                    }}
                    className="focus-field w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Search blog title..."
                  />
                </label>
                {isBlogSearchOpen ? (
                  <div className="max-h-44 overflow-y-auto rounded-md border border-slate-200 bg-white">
                    {isBlogSearchLoading ? (
                      <p className="px-3 py-2 text-sm text-slate-500">Searching…</p>
                    ) : blogSearchResults.length === 0 ? (
                      <p className="px-3 py-2 text-sm text-slate-500">No matching blogs.</p>
                    ) : (
                      blogSearchResults.map((blog) => (
                        <button
                          key={blog.id}
                          type="button"
                          className="block w-full border-b border-slate-100 px-3 py-2 text-left last:border-b-0 hover:bg-slate-50"
                          onClick={() => {
                            setForm((previous) =>
                              previous ? { ...previous, associated_blog_id: blog.id } : previous
                            );
                            setPost((previous) =>
                              previous ? { ...previous, associated_blog_id: blog.id, associated_blog: blog } : previous
                            );
                            setBlogSearchQuery(blog.title);
                            setBlogSearchResults([]);
                            setIsBlogSearchOpen(false);
                          }}
                        >
                          <p className="text-sm font-medium text-slate-900">{blog.title}</p>
                          <p className="text-xs text-slate-500">
                            {blog.slug || "no-slug"} • {blog.site}
                          </p>
                        </button>
                      ))
                    )}
                  </div>
                ) : null}
                {form.associated_blog_id ? (
                  <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                    <p className="text-sm font-medium text-slate-900">
                      {post.associated_blog?.title ?? "Blog linked"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {post.associated_blog?.site ?? "Linked blog"}
                    </p>
                    <div className="mt-2 space-y-2">
                      <LinkQuickActions
                        href={post.associated_blog?.live_url ?? null}
                        label="Associated blog URL"
                        size="xs"
                      />
                      <div className="flex flex-wrap items-center gap-2">
                      <Button
                        variant="secondary"
                        size="xs"
                        onClick={() => {
                          setForm((previous) =>
                            previous ? { ...previous, associated_blog_id: null } : previous
                          );
                          setPost((previous) =>
                            previous
                              ? { ...previous, associated_blog_id: null, associated_blog: null }
                              : previous
                          );
                          setBlogSearchQuery("");
                          setBlogSearchResults([]);
                          setIsBlogSearchOpen(false);
                        }}
                      >
                        Clear Link
                      </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">No linked blog yet.</p>
                )}
                </fieldset>
              </section>

              <section
                id="social-editor-step-write-caption"
                className="space-y-4 rounded-lg border border-slate-200 bg-white p-4"
              >
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Write Caption</h3>
                  <p className="text-sm text-slate-600">
                    Use the editor like a focused notepad, then copy from one menu.
                  </p>
                </div>
                <fieldset disabled={!canEditBrief} className="space-y-2 disabled:opacity-70">
                <div className="space-y-2 rounded-lg border border-slate-200 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium text-slate-700">Caption Editor (UTF-8)</p>
                    <div className="flex items-center gap-1">
                      <span className="tooltip-container">
                        <Button
                          variant="icon"
                          size="icon"
                          aria-label="Bold format"
                          onClick={handleBoldFormat}
                        >
                          <strong>B</strong>
                        </Button>
                        <span className="tooltip-bubble">Bold Sans (LinkedIn)</span>
                      </span>
                      <span className="tooltip-container">
                        <Button
                          variant="icon"
                          size="icon"
                          aria-label="Insert bullet"
                          onClick={handleInsertBullet}
                        >
                          •
                        </Button>
                        <span className="tooltip-bubble">Insert bullet</span>
                      </span>
                    </div>
                  </div>
                  <textarea
                    id="social-post-caption"
                    ref={captionRef}
                    value={form.caption}
                    onChange={(event) => {
                      setForm((previous) =>
                        previous ? { ...previous, caption: event.target.value } : previous
                      );
                    }}
                    onKeyDown={handleCaptionKeyDown}
                    className="focus-field min-h-[24rem] w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-sm leading-relaxed"
                    placeholder="Write your social caption..."
                  />
                  </div>
                </fieldset>
                <div className="space-y-2 rounded-lg border border-slate-200 p-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p
                        className={`text-xs font-medium ${
                          isOverLimit ? "text-rose-700" : "text-slate-500"
                        }`}
                      >
                        {captionLength} / {LINKEDIN_CAPTION_LIMIT}
                      </p>
                      {form.platforms.length === 0 ? (
                        <p className="text-xs text-slate-500">
                          Select at least one platform for platform-specific guidance.
                        </p>
                      ) : (
                        <ul className="space-y-1">
                          {form.platforms.map((platform) => (
                            <li key={platform} className="text-xs text-slate-500">
                              {PLATFORM_CAPTION_GUIDANCE[platform]}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <details className="relative">
                      <summary className="list-none cursor-pointer rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                        Copy
                      </summary>
                      <div className="absolute right-0 z-10 mt-2 w-56 rounded-md border border-slate-200 bg-white p-1 shadow-lg">
                        <button
                          type="button"
                          className="block w-full rounded px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
                          onClick={() => {
                            void copyText(form.caption);
                          }}
                        >
                          Caption
                        </button>
                        <button
                          type="button"
                          className="block w-full rounded px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
                          onClick={() => {
                            const url = post.associated_blog?.live_url ?? "";
                            void copyText(`${form.caption}\n\n${url}`.trim());
                          }}
                        >
                          Caption + URL
                        </button>
                        <button
                          type="button"
                          className="block w-full rounded px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
                          onClick={() => {
                            void copyText(post.associated_blog?.live_url ?? "");
                          }}
                        >
                          URL only
                        </button>
                      </div>
                    </details>
                  </div>
                </div>
              </section>

              <section
                id="social-editor-step-review-publish"
                className="space-y-4 rounded-lg border border-slate-200 bg-white p-4"
              >
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Review & Publish</h3>
                  <p className="text-sm text-slate-600">
                    Manage transitions and handle publishing actions.
                  </p>
                </div>
                <div className="space-y-2 rounded-md border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Primary Transition Action
                  </p>
                  <p className="text-xs text-slate-600">
                    Use the primary action in the right panel for standard progression.
                  </p>
                  <details className="rounded-md border border-slate-200 bg-white p-2">
                    <summary className="cursor-pointer text-xs font-medium text-slate-700">
                      Advanced transition controls
                    </summary>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <select
                        value={form.status}
                        disabled={isSaving || !canActOnCurrentStatus}
                        onChange={(event) => {
                          const nextStatus = event.target.value as SocialPostStatus;
                          if (!canCurrentUserTransition(form.status, nextStatus)) {
                            if (!canActOnCurrentStatus) {
                              showError(ASSIGNED_USER_HELPER_TEXT);
                            } else {
                              showError(VALIDATION_MESSAGES.noPermissionTransition);
                            }
                            return;
                          }
                          void transitionPostStatus(nextStatus);
                        }}
                        className="focus-field rounded-md border border-slate-300 px-2 py-1 text-xs"
                      >
                        {Object.entries(SOCIAL_POST_STATUS_LABELS).map(([value, label]) => (
                          <option
                            key={value}
                            value={value}
                            disabled={
                              !canCurrentUserTransition(
                                form.status,
                                value as SocialPostStatus
                              )
                            }
                          >
                            {label}
                          </option>
                        ))}
                      </select>
                      <SocialPostStatusBadge status={form.status} />
                    </div>
                  </details>
                  {!canActOnCurrentStatus ? (
                    <p className="text-xs text-amber-700">{ASSIGNED_USER_HELPER_TEXT}</p>
                  ) : null}
                </div>
                <div className="space-y-3 rounded-md border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Live Links
                  </p>
                  <div id="social-post-live-links" className="space-y-2 rounded-md border border-slate-200 bg-white p-2">
                    <p className="text-xs text-slate-600">
                      Paste once and auto-assign to LinkedIn, Facebook, or Instagram.
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="url"
                        value={quickLiveLinkInput}
                        onChange={(event) => {
                          setQuickLiveLinkInput(event.target.value);
                        }}
                        className="focus-field min-w-0 flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-xs"
                        placeholder="Paste live URL..."
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        size="xs"
                        onClick={handleQuickAddLiveLink}
                      >
                        Add Link
                      </Button>
                    </div>
                    <p className="text-xs text-slate-500">
                      Draft links ready: {liveLinkDraftCount} / {SOCIAL_PLATFORMS.length}
                    </p>
                  </div>
                  <div className="grid gap-2 md:grid-cols-3">
                    {SOCIAL_PLATFORMS.map((platform) => (
                      <label key={platform} className="space-y-1 text-xs text-slate-600">
                        <span className="font-medium text-slate-700">
                          {SOCIAL_PLATFORM_LABELS[platform]}
                        </span>
                        <input
                          type="url"
                          value={liveLinkDrafts[platform] ?? ""}
                          onChange={(event) => {
                            setLiveLinkDrafts((previous) => ({
                              ...previous,
                              [platform]: event.target.value,
                            }));
                          }}
                          className="focus-field w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs"
                          placeholder={`https://${platform}.com/...`}
                        />
                      </label>
                    ))}
                  </div>
                  {liveLinks.length === 0 ? (
                    <p className="text-xs text-slate-500">
                      No live links saved yet.
                    </p>
                  ) : (
                    <ul className="space-y-1">
                      {liveLinks.map((link) => (
                        <li key={link.id} className="space-y-1 text-xs text-slate-600">
                          <p className="font-medium text-slate-700">
                            {SOCIAL_PLATFORM_LABELS[link.platform]}
                          </p>
                          <LinkQuickActions
                            href={link.url}
                            label={`${SOCIAL_PLATFORM_LABELS[link.platform]} live URL`}
                            size="xs"
                          />
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="secondary"
                      size="xs"
                      disabled={isLiveLinksSaving}
                      onClick={() => {
                        void handleSaveLiveLinks();
                      }}
                    >
                      {isLiveLinksSaving ? "Saving Links…" : "Save Links"}
                    </Button>
                  </div>
                </div>
              </section>
              <section
                id="social-editor-step-comments"
                className="space-y-4 rounded-lg border border-slate-200 bg-white p-4"
              >
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Comments</h3>
                  <p className="text-sm text-slate-600">
                    Collaboration notes are visible to everyone on this record.
                  </p>
                </div>
                <div className="space-y-2">
                  <textarea
                    value={commentDraft}
                    onChange={(event) => {
                      setCommentDraft(event.target.value);
                    }}
                    className="min-h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Add discussion or feedback..."
                  />
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={isCommentSaving}
                      onClick={() => {
                        void handleAddComment();
                      }}
                    >
                      {isCommentSaving ? "Adding..." : "Add Comment"}
                    </Button>
                  </div>
                </div>
                {comments.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    No comments yet. Add context here to avoid handoff confusion.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {comments.slice(0, 20).map((comment) => (
                      <li
                        key={comment.id}
                        className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2"
                      >
                        <p className="text-xs font-semibold text-slate-600">
                          {comment.author?.full_name ?? "Unknown"} —{" "}
                          {formatDistanceToNow(new Date(comment.created_at), {
                            addSuffix: true,
                          })}
                        </p>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800">
                          {comment.comment}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>

            <aside className="space-y-3">
              <section
                id="social-editor-step-current-snapshot"
                className="sticky top-20 space-y-2 rounded-lg border border-slate-200 bg-white p-3"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Current Snapshot
                </p>
                <div className="space-y-2 border-b border-slate-200 pb-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Status</span>
                    <SocialPostStatusBadge status={form.status} />
                  </div>
                  <p className="text-xs text-slate-600">
                    Product: {SOCIAL_POST_PRODUCT_LABELS[form.product]}
                  </p>
                  <p className="text-xs text-slate-600">Type: {SOCIAL_POST_TYPE_LABELS[form.type]}</p>
                  <p className="text-xs text-slate-600">Assigned to: {assignedToName}</p>
                  <p className="text-xs text-slate-600">Reviewer: {reviewerName}</p>
                  <p className="text-xs text-slate-600">Current owner: {currentOwnerName}</p>
                  <p className="text-xs text-slate-600">Next owner: {nextOwnerName}</p>
                  <p className="text-xs text-slate-600">
                    Last saved: {formatSavedTimestamp(post.updated_at, profile?.timezone)}
                  </p>
                </div>
                {latestRollbackReason ? (
                  <div className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-800">
                      Latest Rollback Reason
                    </p>
                    <p className="text-xs text-amber-800">{latestRollbackReason}</p>
                  </div>
                ) : null}
              </section>
              <section
                id="social-editor-step-checklist"
                className="sticky top-56 space-y-3 rounded-lg border border-slate-200 bg-white p-3"
              >
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Checklist
                  </p>
                </div>
                <ul className="space-y-1">
                  {checklistItems.map((item) => (
                    <li key={item.label} className="flex items-start gap-2 text-sm text-slate-700">
                      <span
                        className={`inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-xs ${
                          item.done ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"
                        }`}
                      >
                        {item.done ? (
                          <AppIcon name="success" boxClassName="h-3.5 w-3.5" size={11} />
                        ) : (
                          <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
                        )}
                      </span>
                      <div>
                        <p>{item.label}</p>
                        <p className="text-xs text-slate-500">
                          {item.required ? "(required)" : "(optional)"}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
                {transitionRequiredFields.length > 0 ? (
                  <div className="space-y-2 rounded-md border border-slate-200 bg-slate-50 p-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Transition Preflight
                    </p>
                    <p className="text-xs text-slate-600">
                      {readyTransitionFieldCount} / {transitionRequiredFields.length} required items ready for{" "}
                      {SOCIAL_POST_STATUS_LABELS[finalAction.nextStatus]}.
                    </p>
                    {missingTransitionFields.length === 0 ? (
                      <p className="text-xs text-emerald-700">All required items are complete.</p>
                    ) : (
                      <ul className="space-y-1">
                        {missingTransitionFields.map((field) => (
                          <li
                            key={field}
                            className="flex items-center justify-between gap-2 text-xs text-slate-700"
                          >
                            <span>{PREFLIGHT_FIELD_META[field].label}</span>
                            <button
                              type="button"
                              className="rounded border border-slate-300 bg-white px-1.5 py-0.5 text-[11px] font-medium text-slate-700 hover:bg-slate-100"
                              onClick={() => {
                                jumpToPreflightField(field);
                              }}
                            >
                              Go to field
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : null}
                <div className="space-y-2 border-t border-slate-200 pt-3">
                  <p className="text-xs text-slate-600">{finalAction.helper}</p>
                  <p className="text-xs font-medium text-slate-700">
                    Next stage: {SOCIAL_POST_STATUS_LABELS[finalAction.nextStatus]}
                  </p>
                  {isOverLimit ? (
                    <p className="text-xs text-rose-700">
                      {VALIDATION_MESSAGES.captionExceeds}
                    </p>
                  ) : null}
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={isPrimaryActionDisabled}
                    aria-keyshortcuts="Alt+Shift+Enter"
                    onClick={() => {
                      void handleFinalAction();
                    }}
                  >
                    {isSaving ? "Saving…" : finalAction.label}
                  </Button>
                  <p className="text-[11px] text-slate-500">
                    <button
                      type="button"
                      className="font-medium text-slate-700 underline-offset-2 hover:underline"
                      onClick={() => {
                        window.dispatchEvent(new CustomEvent("open-shortcuts-modal"));
                      }}
                    >
                      Shortcut
                    </button>{" "}
                    {SOCIAL_POST_EDITOR_SHORTCUTS.nextRequired.label}:{" "}
                    {SOCIAL_POST_EDITOR_SHORTCUTS.nextRequired.keys[0]} •{" "}
                    {SOCIAL_POST_EDITOR_SHORTCUTS.primaryAction.label}:{" "}
                    {SOCIAL_POST_EDITOR_SHORTCUTS.primaryAction.keys[0]}
                  </p>
                  {!canActOnCurrentStatus ? (
                    <p className="text-xs text-amber-700">{ASSIGNED_USER_HELPER_TEXT}</p>
                  ) : null}
                </div>
              </section>
              <section
                id="social-editor-step-assignment-changes"
                className="space-y-4 rounded-lg border border-slate-200 bg-white p-4"
              >
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Assignment & Changes</h3>
                  <p className="text-sm text-slate-600">
                    Status and assignment changes are visible in latest-first order.
                  </p>
                </div>
                {groupedLatestActivity.length === 0 ? (
                  <p className="text-sm text-slate-500">No assignment or status changes yet.</p>
                ) : (
                  <div className="space-y-3">
                    {groupedLatestActivity.map((group) => (
                      <section key={group.dayLabel} className="space-y-2">
                        <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          {group.dayLabel}
                        </h4>
                        <ul className="space-y-2">
                          {group.entries.map((entry) => (
                            <li
                              key={entry.id}
                              className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2"
                            >
                              <p className="text-sm font-medium text-slate-800">
                                {formatActivityEventTitle(entry)}
                              </p>
                              {(() => {
                                const detail = formatActivityChangeDescription(entry, {
                                  userNameById: activityUserNameById,
                                });
                                return detail ? (
                                  <p className="text-xs text-slate-600">{detail}</p>
                                ) : null;
                              })()}
                              <p className="text-xs text-slate-400">
                                {entry.actor?.full_name ?? "System"} •{" "}
                                {formatDateInTimezone(entry.changed_at, profile?.timezone)}
                              </p>
                            </li>
                          ))}
                        </ul>
                      </section>
                    ))}
                  </div>
                )}
              </section>
            </aside>
          </div>
        </div>
      </AppShell>
    </ProtectedPage>
  );
}
