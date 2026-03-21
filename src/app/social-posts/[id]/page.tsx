"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/button";
import { DataPageHeader } from "@/components/data-page";
import { ExternalLink } from "@/components/external-link";
import { ProtectedPage } from "@/components/protected-page";
import { SocialPostStatusBadge } from "@/components/status-badge";
import { AppIcon } from "@/lib/icons";
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
import { getUserRoles } from "@/lib/roles";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import type {
  BlogSite,
  SocialPlatform,
  SocialPostLinkRecord,
  SocialPostProduct,
  SocialPostStatus,
  SocialPostType,
} from "@/lib/types";
import { formatDateInput } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import { useNotifications } from "@/providers/notifications-provider";
import { useSystemFeedback } from "@/providers/system-feedback-provider";

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
  linksSaved: "Live links saved",
  postSaved: "Post saved",
} as const;

// Unicode bold sans-serif characters for LinkedIn-compatible bold text
const BOLD_SANS_UPPER = "𝗔𝗕𝗖𝗗𝗘𝗙𝗚𝗛𝗜𝗝𝗞𝗟𝗠𝗡𝗢𝗣𝗤𝗥𝗦𝗧𝗨𝗩𝗪𝗫𝗬𝗭";
const BOLD_SANS_LOWER = "𝗮𝗯𝗰𝗱𝗲𝗳𝗴𝗵𝗶𝗷𝗸𝗹𝗺𝗻𝗼𝗽𝗾𝗿𝘀𝘁𝘂𝘃𝘄𝘅𝘆𝘇";
const BOLD_SANS_DIGITS = "𝟬𝟭𝟮𝟯𝟰𝟱𝟲𝟳𝟴𝟵";

function isExecutionStage(status: SocialPostStatus) {
  return status === "ready_to_publish" || status === "awaiting_live_link";
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

function formatSavedTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function normalizePostRow(row: Record<string, unknown>): SocialPostEditorRecord {
  const associatedBlogRaw = row.associated_blog;
  const associatedBlog = Array.isArray(associatedBlogRaw)
    ? ((associatedBlogRaw[0] ?? null) as BlogLookupResult | null)
    : ((associatedBlogRaw ?? null) as BlogLookupResult | null);
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

export default function SocialPostEditorPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { profile, session, user } = useAuth();
  const { pushNotification } = useNotifications();
  const { showSaving, showSuccess, showError, updateStatus } = useSystemFeedback();
  const postId = params?.id ?? "";
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
  const [isLiveLinksSaving, setIsLiveLinksSaving] = useState(false);
  const isExecutionLocked = post ? isExecutionStage(post.status) : false;

  const loadPost = useCallback(async () => {
    if (!postId) {
      return;
    }
    setIsLoading(true);
    setError(null);
    const supabase = getSupabaseBrowserClient();
    const [{ data, error: loadError }, { data: linksData, error: linksError }] =
      await Promise.all([
        supabase
          .from("social_posts")
          .select(
            "id,title,product,type,canva_url,canva_page,caption,platforms,scheduled_date,status,associated_blog_id,updated_at,associated_blog:associated_blog_id(id,title,slug,site,live_url)"
          )
          .eq("id", postId)
          .single(),
        supabase
          .from("social_post_links")
          .select("id,social_post_id,platform,url,created_by,created_at,updated_at")
          .eq("social_post_id", postId)
          .order("created_at", { ascending: true }),
      ]);
    if (loadError) {
      setError(`${VALIDATION_MESSAGES.couldNotLoad} ${loadError.message}`);
      setIsLoading(false);
      return;
    }
    const normalized = normalizePostRow((data ?? {}) as Record<string, unknown>);
    setPost(normalized);
    setForm(createFormFromPost(normalized));
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
    setIsLoading(false);
  }, [postId, showError]);

  useEffect(() => {
    void loadPost();
  }, [loadPost]);

  useEffect(() => {
    const query = blogSearchQuery.trim();
    if (isExecutionLocked || !isBlogSearchOpen || query.length === 0) {
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
  }, [blogSearchQuery, isBlogSearchOpen, isExecutionLocked, showError]);

  const persistBrief = useCallback(
    async (
      nextForm: EditorFormState,
      reason: "autosave" | "manual" = "autosave"
    ) => {
      if (!post) {
        return false;
      }
      if (isExecutionStage(post.status)) {
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
      updateStatus(statusId, { type: "success", message: VALIDATION_MESSAGES.postSaved });
      setIsSaving(false);
      return true;
    },
    [post, showError, showSaving, updateStatus]
  );

  const canCurrentUserTransition = useCallback(
    (fromStatus: SocialPostStatus, toStatus: SocialPostStatus) => {
      if (fromStatus === toStatus) {
        return true;
      }
      const allowedTransitions = SOCIAL_POST_ALLOWED_TRANSITIONS[fromStatus] ?? [];
      if (!allowedTransitions.includes(toStatus)) {
        return false;
      }
      const isExecutionRollback =
        toStatus === "changes_requested" &&
        (fromStatus === "ready_to_publish" || fromStatus === "awaiting_live_link");
      if (isExecutionRollback && !isAdmin) {
        return false;
      }
      if (
        !isAdmin &&
        (fromStatus === "in_review" || toStatus === "creative_approved")
      ) {
        return false;
      }
      return true;
    },
    [isAdmin]
  );

  const transitionPostStatus = useCallback(
    async (toStatus: SocialPostStatus) => {
      if (!post) {
        return false;
      }
      const currentStatus = post.status;
      if (!canCurrentUserTransition(currentStatus, toStatus)) {
        showError(
          `${VALIDATION_MESSAGES.invalidTransition} from ${SOCIAL_POST_STATUS_LABELS[currentStatus]} to ${SOCIAL_POST_STATUS_LABELS[toStatus]}`
        );
        return false;
      }
      if (!session?.access_token) {
        showError(VALIDATION_MESSAGES.sessionExpired);
        return false;
      }
      const requiresRollbackReason =
        toStatus === "changes_requested" &&
        (currentStatus === "ready_to_publish" ||
          currentStatus === "awaiting_live_link");
      let reason: string | null = null;
      if (requiresRollbackReason) {
        const rawReason = window.prompt(
          "Provide a reason for sending this post back to Changes Requested:"
        );
        if (!rawReason || rawReason.trim().length === 0) {
          showError(VALIDATION_MESSAGES.rollbackReasonRequired);
          return false;
        }
        reason = rawReason.trim();
      }

      setIsSaving(true);
      const response = await fetch(`/api/social-posts/${post.id}/transition`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${session.access_token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ toStatus, reason }),
      }).catch(() => null);
      if (!response) {
        showError(VALIDATION_MESSAGES.couldNotChangeStatus);
        setIsSaving(false);
        return false;
      }
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        showError(payload.error ?? VALIDATION_MESSAGES.couldNotChangeStatus);
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
          post.id
        )
      );
      showSuccess(`Moved to ${SOCIAL_POST_STATUS_LABELS[toStatus]}`);
      setIsSaving(false);
      return true;
    },
    [post, profile?.full_name, pushNotification, session?.access_token, showError, showSuccess, canCurrentUserTransition]
  );

  useEffect(() => {
    if (!form || !post || isExecutionStage(post.status)) {
      return;
    }
    const timeout = window.setTimeout(() => {
      void persistBrief(form, "autosave");
    }, AUTOSAVE_DEBOUNCE_MS);
    return () => {
      window.clearTimeout(timeout);
    };
  }, [form, post, persistBrief]);

  const captionLength = form?.caption.length ?? 0;
  const isOverLimit = captionLength > LINKEDIN_CAPTION_LIMIT;
  const hasTitle = Boolean(form?.title.trim());
  const hasCaption = Boolean(form?.caption.trim());
  const hasPlatform = Boolean(form && form.platforms.length > 0);
  const hasPublishDate = Boolean(form?.scheduled_date);
  const hasCanvaLink = Boolean(form?.canva_url.trim());
  const hasLinkedBlog = Boolean(form?.associated_blog_id);
  const hasLiveLink = liveLinks.some((link) => link.url.trim().length > 0);
  const isDraftComplete =
    hasTitle && hasCaption && hasPlatform && hasPublishDate && hasCanvaLink;

  const checklistItems = useMemo(
    () => [
      { label: "Add post title", done: hasTitle, required: true },
      { label: "Select platform(s)", done: hasPlatform, required: true },
      { label: "Set publish date", done: hasPublishDate, required: true },
      { label: "Add Canva link", done: hasCanvaLink, required: true },
      { label: "Write caption", done: hasCaption, required: true },
      { label: "Link blog (optional)", done: hasLinkedBlog, required: false },
    ],
    [hasCanvaLink, hasCaption, hasLinkedBlog, hasPlatform, hasPublishDate, hasTitle]
  );
  const finalAction = useMemo(() => {
    if (form?.status === "draft") {
      if (!isDraftComplete) {
        return {
          label: "Save Draft",
          nextStatus: "draft" as SocialPostStatus,
          helper: "Complete required checklist items to move this to Review.",
        };
      }
      return {
        label: "Submit for Review",
        nextStatus: "in_review" as SocialPostStatus,
        helper: "Draft is complete. Move this post to Review.",
      };
    }
    if (form?.status === "changes_requested") {
      if (!isDraftComplete) {
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
    if (form?.status === "creative_approved") {
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
      if (!isDraftComplete) {
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
  }, [form?.status, hasLiveLink, isAdmin, isDraftComplete]);

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
    showSuccess("Bold format applied");
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
  const handleReopenBrief = async () => {
    if (!post) {
      return;
    }
    if (!session?.access_token) {
      showError(VALIDATION_MESSAGES.sessionExpired);
      return;
    }
    const reasonInput = window.prompt(
      "Optional reason for reopening this post to Creative Approved:"
    );
    setIsSaving(true);
    const response = await fetch(`/api/social-posts/${post.id}/reopen-brief`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${session.access_token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        reason:
          typeof reasonInput === "string" && reasonInput.trim().length > 0
            ? reasonInput.trim()
            : null,
      }),
    }).catch(() => null);
    if (!response) {
      showError(VALIDATION_MESSAGES.couldNotReopenBrief);
      setIsSaving(false);
      return;
    }
    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      showError(payload.error ?? VALIDATION_MESSAGES.couldNotReopenBrief);
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
        post.id
      )
    );
    showSuccess(VALIDATION_MESSAGES.postReopened);
    setIsSaving(false);
  };

  const handleFinalAction = async () => {
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
    await transitionPostStatus(finalAction.nextStatus);
  };

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
          <DataPageHeader
            title={form.title || "Social Post"}
            description="Build and refine your social post from concept to publication."
            primaryAction={
              <div className="flex items-center gap-2">
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
          {isExecutionLocked ? (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              <span>
                Execution stage is read-only. Reopen to Creative Approved before
                editing brief fields.
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
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-4">
              <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Setup</h3>
                  <p className="text-sm text-slate-600">
                    Define the post essentials before writing or review.
                  </p>
                </div>
                <fieldset
                  disabled={isExecutionLocked}
                  className="disabled:opacity-70"
                >
                  <div className="space-y-3 border-b border-slate-200 pb-3">
                    <h4 className="text-sm font-semibold text-slate-900">Basic Information</h4>
                    <div className="grid gap-3 md:grid-cols-2">
                      <label className="space-y-1 text-sm text-slate-700">
                        <span className="font-medium">Product</span>
                        <select
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
                      </label>
                    </div>
                  </div>
                  <div className="space-y-3 pt-3">
                    <h4 className="text-sm font-semibold text-slate-900">Optional</h4>
                    <div className="grid gap-3 md:grid-cols-2">
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
                      <label className="space-y-1 text-sm text-slate-700">
                        <span className="font-medium">Scheduled Publish Date</span>
                        <input
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
                      <label className="space-y-1 text-sm text-slate-700 md:col-span-2">
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
                      </label>
                    </div>
                  </div>
                </fieldset>
              </section>

              <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">
                    Link Context <span className="text-slate-500">(optional)</span>
                  </h3>
                  <p className="text-sm text-slate-600">
                    Link a related blog so caption and publishing context stay connected.
                  </p>
                </div>
                <fieldset disabled={isExecutionLocked} className="space-y-4 disabled:opacity-70">
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
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Button
                        variant="secondary"
                        size="xs"
                        onClick={() => {
                          void copyText(post.associated_blog?.live_url ?? "");
                        }}
                      >
                        Copy URL
                      </Button>
                      {post.associated_blog?.live_url ? (
                        <ExternalLink
                          href={post.associated_blog.live_url}
                          className="text-xs font-medium text-blue-600 underline"
                        >
                          Open Blog
                        </ExternalLink>
                      ) : null}
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
                ) : (
                  <p className="text-sm text-slate-500">No linked blog yet.</p>
                )}
                </fieldset>
              </section>

              <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Write Caption</h3>
                  <p className="text-sm text-slate-600">
                    Use the editor like a focused notepad, then copy from one menu.
                  </p>
                </div>
                <fieldset disabled={isExecutionLocked} className="space-y-2 disabled:opacity-70">
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
                </fieldset>
              </section>

              <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Review & Publish</h3>
                  <p className="text-sm text-slate-600">
                    Manage transitions and handle publishing actions.
                  </p>
                </div>
                <div className="space-y-2 rounded-md border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Status Transition Controls
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={form.status}
                      disabled={isSaving}
                      onChange={(event) => {
                        const nextStatus = event.target.value as SocialPostStatus;
                        if (!canCurrentUserTransition(form.status, nextStatus)) {
                          showError(VALIDATION_MESSAGES.noPermissionTransition);
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
                </div>
                <div className="space-y-3 rounded-md border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Live Links
                  </p>
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
                        <li key={link.id} className="truncate text-xs text-slate-600">
                          {SOCIAL_PLATFORM_LABELS[link.platform]}:{" "}
                          <ExternalLink
                            href={link.url}
                            className="text-blue-600 underline"
                          >
                            {link.url}
                          </ExternalLink>
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
            </div>

            <aside className="space-y-3">
              <section className="sticky top-20 space-y-2 rounded-lg border border-slate-200 bg-white p-3">
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
                  <p className="text-xs text-slate-600">
                    Last saved: {formatSavedTimestamp(post.updated_at)}
                  </p>
                </div>
              </section>
              <section className="sticky top-56 space-y-3 rounded-lg border border-slate-200 bg-white p-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Checklist + Validation
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
                    disabled={
                      isSaving ||
                      isOverLimit ||
                      !canCurrentUserTransition(form.status, finalAction.nextStatus) ||
                      (finalAction.nextStatus === form.status &&
                        isExecutionStage(form.status))
                    }
                    onClick={() => {
                      void handleFinalAction();
                    }}
                  >
                    {isSaving ? "Saving…" : finalAction.label}
                  </Button>
                </div>
              </section>
            </aside>
          </div>
        </div>
      </AppShell>
    </ProtectedPage>
  );
}
