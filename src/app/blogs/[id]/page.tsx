"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";

import { AppShell } from "@/components/app-shell";
import { ConfirmationModal } from "@/components/confirmation-modal";
import { LinkQuickActions } from "@/components/link-quick-actions";
import { MarkdownComment } from "@/components/markdown-comment";
import { ProtectedPage } from "@/components/protected-page";
import { StatusBadge, WorkflowStageBadge } from "@/components/status-badge";
import { validateAuthor } from "@/lib/shape-validation";
import {
  BLOG_SELECT_WITH_DATES_WITH_RELATIONS,
  isMissingBlogCommentsTableError,
  normalizeBlogRow,
} from "@/lib/blog-schema";
import {
  canTransitionPublisherStatus,
  canTransitionWriterStatus,
} from "@/lib/permissions";
import { createUiPermissionContract } from "@/lib/permissions/uiPermissions";
import { PUBLISHER_STATUSES, SITES, WRITER_STATUSES, getWorkflowStage } from "@/lib/status";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import type {
  BlogHistoryRecord,
  BlogRecord,
  BlogSite,
  ProfileRecord,
  PublisherStageStatus,
  WriterStageStatus,
} from "@/lib/types";
import { formatDateInput, toTitleCase } from "@/lib/utils";
import { formatDateInTimezone } from "@/lib/format-date";
import { useAuth } from "@/providers/auth-provider";
import { useAlerts } from "@/providers/alerts-provider";
import { useNotifications } from "@/providers/notifications-provider";
import {
  blogWriterStatusChangedNotification,
  blogPublisherStatusChangedNotification,
  blogSubmittedForReviewNotification,
  blogPublishedNotification,
} from "@/lib/notification-helpers";
import {
  formatActivityChangeDescription,
  formatActivityEventTitle,
} from "@/lib/activity-history-format";
import {
  getApiErrorMessage,
  isApiFailure,
  parseApiResponseJson,
} from "@/lib/api-response";

type BlogFormState = {
  title: string;
  site: BlogSite;
  writer_id: string;
  publisher_id: string;
  writer_status: WriterStageStatus;
  publisher_status: PublisherStageStatus;
  google_doc_url: string;
  live_url: string;
  scheduled_publish_date: string;
  display_published_date: string;
  actual_published_at: string;
  is_archived: boolean;
};


const BLOG_DETAIL_SHORTCUTS = {
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

type BlogPreflightFieldKey =
  | "writer_id"
  | "google_doc_url"
  | "writer_status_completed"
  | "publisher_id"
  | "live_url";

const BLOG_PREFLIGHT_FIELD_META: Record<
  BlogPreflightFieldKey,
  { label: string; targetId: string }
> = {
  writer_id: { label: "Assigned to (Writing)", targetId: "blog-writer-id" },
  google_doc_url: { label: "Google Doc URL", targetId: "blog-google-doc-url" },
  writer_status_completed: {
    label: "Writing status must be completed",
    targetId: "blog-writer-status",
  },
  publisher_id: { label: "Assigned to (Publishing)", targetId: "blog-publisher-id" },
  live_url: { label: "Live URL", targetId: "blog-live-url" },
};

function createBlogFormSnapshot(form: BlogFormState) {
  return JSON.stringify({
    title: form.title.trim(),
    site: form.site,
    writer_id: form.writer_id,
    publisher_id: form.publisher_id,
    writer_status: form.writer_status,
    publisher_status: form.publisher_status,
    google_doc_url: form.google_doc_url.trim(),
    live_url: form.live_url.trim(),
    scheduled_publish_date: form.scheduled_publish_date,
    display_published_date: form.display_published_date,
    actual_published_at: form.actual_published_at,
    is_archived: form.is_archived,
  });
}
type BlogCommentRecord = {
  id: string;
  blog_id: string;
  comment: string;
  created_by: string;
  created_at: string;
  author?: Pick<ProfileRecord, "id" | "full_name" | "email"> | null;
};

function normalizeCommentRows(rows: Array<Record<string, unknown>>) {
  return rows.map((row) => {
    const author = validateAuthor(row.author);

    return {
      id: String(row.id ?? ""),
      blog_id: String(row.blog_id ?? ""),
      comment: String(row.comment ?? ""),
      created_by: String(row.user_id ?? ""),
      created_at: String(row.created_at ?? ""),
      author,
    } satisfies BlogCommentRecord;
  });
}

function toDateTimeLocalInput(value: string | null | undefined) {
  if (!value) {
    return "";
  }
  // Parse ISO string directly without timezone conversion
  // ISO format: YYYY-MM-DDTHH:mm:ss.sssZ or YYYY-MM-DDTHH:mm:ss
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!match) {
    return "";
  }
  const [, year, month, day, hours, minutes] = match;
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function toIsoFromDateTimeLocalInput(value: string | null | undefined) {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toISOString();
}

export default function BlogDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { hasPermission, user, profile, session } = useAuth();
  const { showError, showSuccess } = useAlerts();
  const { pushNotification } = useNotifications();
  const blogId = params.id;

  const [blog, setBlog] = useState<BlogRecord | null>(null);
  const [form, setForm] = useState<BlogFormState | null>(null);
  const [users, setUsers] = useState<ProfileRecord[]>([]);
  const [history, setHistory] = useState<BlogHistoryRecord[]>([]);
  const [comments, setComments] = useState<BlogCommentRecord[]>([]);
  const [newComment, setNewComment] = useState("");
  const [commentsUnavailableMessage, setCommentsUnavailableMessage] = useState<string | null>(null);
  const [isCommentSaving, setIsCommentSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [pendingCompletionAction, setPendingCompletionAction] = useState<
    "writer" | "publisher" | null
  >(null);
  const [blogVersion, setBlogVersion] = useState<string | null>(null);
  const [savedFormSnapshot, setSavedFormSnapshot] = useState<string | null>(null);

  useEffect(() => {
    if (!error) {
      return;
    }
    showError(error);
  }, [error, showError]);

  useEffect(() => {
    if (!successMessage) {
      return;
    }
    showSuccess(successMessage);
  }, [showSuccess, successMessage]);

  useEffect(() => {
    if (!blogId) {
      return;
    }

    const loadData = async () => {
      const supabase = getSupabaseBrowserClient();
      setIsLoading(true);
      setError(null);
      setCommentsUnavailableMessage(null);
      const fetchBlog = async () =>
        supabase
          .from("blogs")
          .select(BLOG_SELECT_WITH_DATES_WITH_RELATIONS)
          .eq("id", blogId)
          .single();

      const [
        { data: blogData, error: blogError },
        { data: usersData },
        { data: historyData },
        { data: commentsData, error: commentsError },
      ] =
        await Promise.all([
          fetchBlog(),
          supabase
            .from("profiles")
            .select("*")
            .eq("is_active", true)
            .order("full_name", { ascending: true }),
          supabase
            .from("blog_assignment_history")
            .select("*")
            .eq("blog_id", blogId)
            .order("changed_at", { ascending: false })
            .limit(50),
          (async () => {
            const { data, error } = await supabase
              .schema("public")
              .from("blog_comments")
              .select("id,blog_id,comment,user_id,created_at,author:user_id(id,full_name,email)")
              .eq("blog_id", blogId)
              .order("created_at", { ascending: false });

            return { data, error };
          })(),
        ]);

      if (blogError) {
        console.error("Blog load failed:", blogError);
        setError("Couldn't load blog. Please try again.");
        setIsLoading(false);
        return;
      }

      const nextBlog = normalizeBlogRow(
        (blogData ?? {}) as Record<string, unknown>
      ) as unknown as BlogRecord;
      setBlog(nextBlog);
      // Store version (updated_at) to detect concurrent changes
      setBlogVersion(nextBlog.updated_at);
      const nextForm = {
        title: nextBlog.title,
        site: nextBlog.site,
        writer_id: nextBlog.writer_id ?? "",
        publisher_id: nextBlog.publisher_id ?? "",
        writer_status: nextBlog.writer_status,
        publisher_status: nextBlog.publisher_status,
        google_doc_url: nextBlog.google_doc_url ?? "",
        live_url: nextBlog.live_url ?? "",
        scheduled_publish_date: formatDateInput(nextBlog.scheduled_publish_date),
        display_published_date: formatDateInput(nextBlog.display_published_date),
        actual_published_at: toDateTimeLocalInput(
          nextBlog.actual_published_at ?? nextBlog.published_at
        ),
        is_archived: nextBlog.is_archived,
      };
      setForm(nextForm);
      setSavedFormSnapshot(createBlogFormSnapshot(nextForm));
      setUsers((usersData ?? []) as ProfileRecord[]);
      setHistory((historyData ?? []) as BlogHistoryRecord[]);
      if (commentsError) {
        if (isMissingBlogCommentsTableError(commentsError)) {
          setComments([]);
          setCommentsUnavailableMessage(
            "Comments are temporarily unavailable right now. Please try again shortly."
          );
        } else {
          console.error("Comments load failed:", commentsError);
          setError("Couldn't load comments. Please try again.");
        }
      } else {
        setComments(normalizeCommentRows((commentsData ?? []) as Array<Record<string, unknown>>));
      }
      setIsLoading(false);
    };

    void loadData();
  }, [blogId]);
  const permissionContract = useMemo(
    () => createUiPermissionContract(hasPermission),
    [hasPermission]
  );
  const canOverrideWorkflow = permissionContract.canOverrideWorkflow;
  const canMetadataEdit = permissionContract.canEditBlogMetadata;
  const canChangeWriterAssignment = permissionContract.canChangeWriterAssignment;
  const canChangePublisherAssignment = permissionContract.canChangePublisherAssignment;
  const canEditScheduledDate = permissionContract.canEditScheduledPublishDate;
  const canEditDisplayDate = permissionContract.canEditDisplayPublishDate;
  const canArchiveBlog = permissionContract.canArchiveBlog;
  const canCreateComments = permissionContract.canCreateComment;
  const canWriterEdit = permissionContract.canEditWriterWorkflow;
  const canPublisherEdit = permissionContract.canEditPublisherWorkflow;
  const canSaveDetails =
    canMetadataEdit ||
    canChangeWriterAssignment ||
    canChangePublisherAssignment ||
    canEditScheduledDate ||
    canEditDisplayDate ||
    canArchiveBlog ||
    canOverrideWorkflow;
  const canMarkWritingComplete = Boolean(
    blog && canTransitionWriterStatus(blog.writer_status, "completed", hasPermission)
  );
  const canMarkPublishingComplete = Boolean(
    blog &&
      canTransitionPublisherStatus(blog.publisher_status, "completed", hasPermission)
  );

  const selectedWriter = useMemo(
    () => users.find((nextUser) => nextUser.id === form?.writer_id) ?? null,
    [form?.writer_id, users]
  );
  const selectedPublisher = useMemo(
    () => users.find((nextUser) => nextUser.id === form?.publisher_id) ?? null,
    [form?.publisher_id, users]
  );
  const activityUserNameById = useMemo(() => {
    const entries: Array<[string, string]> = [];
    for (const nextUser of users) {
      if (nextUser.id && nextUser.full_name) {
        entries.push([nextUser.id, nextUser.full_name]);
      }
    }
    if (blog?.writer?.id && blog.writer.full_name) {
      entries.push([blog.writer.id, blog.writer.full_name]);
    }
    if (blog?.publisher?.id && blog.publisher.full_name) {
      entries.push([blog.publisher.id, blog.publisher.full_name]);
    }
    return Object.fromEntries(entries);
  }, [blog?.publisher, blog?.writer, users]);
  const isDetailDirty = useMemo(() => {
    if (!form || !savedFormSnapshot) {
      return false;
    }
    return createBlogFormSnapshot(form) !== savedFormSnapshot;
  }, [form, savedFormSnapshot]);
  const blogSectionLinks = useMemo(
    () =>
      [
        { href: "#blog-details", label: "Details" },
        { href: "#blog-workflow", label: "Workflow" },
        { href: "#blog-comments", label: "Comments" },
        { href: "#blog-links", label: "Links" },
        { href: "#blog-assignment-changes", label: "Assignment & Changes" },
      ] as const,
    []
  );
  const blogPreflightRequiredFields = useMemo<BlogPreflightFieldKey[]>(() => {
    if (!form) {
      return [];
    }
    if (form.writer_status !== "completed") {
      return ["writer_id", "google_doc_url"];
    }
    if (form.publisher_status !== "completed") {
      return ["publisher_id", "writer_status_completed", "live_url"];
    }
    return [];
  }, [form]);
  const missingBlogPreflightFields = useMemo<BlogPreflightFieldKey[]>(() => {
    if (!form || blogPreflightRequiredFields.length === 0) {
      return [];
    }
    return blogPreflightRequiredFields.filter((field) => {
      if (field === "writer_id") {
        return !form.writer_id;
      }
      if (field === "google_doc_url") {
        return form.google_doc_url.trim().length === 0;
      }
      if (field === "publisher_id") {
        return !form.publisher_id;
      }
      if (field === "writer_status_completed") {
        return form.writer_status !== "completed";
      }
      if (field === "live_url") {
        return form.live_url.trim().length === 0;
      }
      return false;
    });
  }, [blogPreflightRequiredFields, form]);
  const readyBlogPreflightCount =
    blogPreflightRequiredFields.length - missingBlogPreflightFields.length;
  const jumpToBlogField = useCallback((field: BlogPreflightFieldKey) => {
    const targetId = BLOG_PREFLIGHT_FIELD_META[field]?.targetId;
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

  const updateBlog = useCallback(
    async (
      updates: Record<string, unknown>,
      message: string,
      notify?: () => Promise<void>
    ) => {
      if (!blog) {
        return;
      }

      setIsSaving(true);
      setError(null);
      setSuccessMessage(null);

      // Prevent race condition: check if blog was modified by another client
      if (blogVersion && blog.updated_at !== blogVersion) {
        setError(
          "Blog was modified by another user. Please refresh to see the latest changes."
        );
        setIsSaving(false);
        return;
      }
      if (!session?.access_token) {
        setError("Session expired. Refresh and try again.");
        setIsSaving(false);
        return;
      }
      const response = await fetch(`/api/blogs/${blog.id}/transition`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${session.access_token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify(updates),
      }).catch(() => null);
      if (!response) {
        setError("Couldn't save changes. Please try again.");
        setIsSaving(false);
        return;
      }
      const payload = await parseApiResponseJson<{ blog?: Record<string, unknown> }>(
        response
      );
      if (isApiFailure(response, payload)) {
        setError(getApiErrorMessage(payload, "Couldn't save changes. Please try again."));
        setIsSaving(false);
        return;
      }
      const data =
        payload.blog && typeof payload.blog === "object" ? payload.blog : null;
      if (!data) {
        setError("Couldn't save changes. Please try again.");
        setIsSaving(false);
        return;
      }

      const supabase = getSupabaseBrowserClient();
      const nextBlog = normalizeBlogRow(
        (data ?? {}) as Record<string, unknown>
      ) as unknown as BlogRecord;
      setBlog(nextBlog);
      // Update version after successful save to prevent stale version on concurrent changes
      setBlogVersion(nextBlog.updated_at);
      const nextForm = {
        title: nextBlog.title,
        site: nextBlog.site,
        writer_id: nextBlog.writer_id ?? "",
        publisher_id: nextBlog.publisher_id ?? "",
        writer_status: nextBlog.writer_status,
        publisher_status: nextBlog.publisher_status,
        google_doc_url: nextBlog.google_doc_url ?? "",
        live_url: nextBlog.live_url ?? "",
        scheduled_publish_date: formatDateInput(nextBlog.scheduled_publish_date),
        display_published_date: formatDateInput(nextBlog.display_published_date),
        actual_published_at: toDateTimeLocalInput(
          nextBlog.actual_published_at ?? nextBlog.published_at
        ),
        is_archived: nextBlog.is_archived,
      };
      setForm(nextForm);
      setSavedFormSnapshot(createBlogFormSnapshot(nextForm));
      setSuccessMessage(message);

      if (notify) {
        await notify();
      }

      const { data: historyData } = await supabase
        .from("blog_assignment_history")
        .select("*")
        .eq("blog_id", blog.id)
        .order("changed_at", { ascending: false })
        .limit(50);
      setHistory((historyData ?? []) as BlogHistoryRecord[]);
      setIsSaving(false);
    },
    [blog, blogVersion, session?.access_token]
  );

  const saveDetailsChanges = useCallback(async () => {
    if (!form || !blog || !canSaveDetails || isSaving) {
      return;
    }
    const previousWriterId = blog.writer_id ?? "";
    const previousPublisherId = blog.publisher_id ?? "";
    const writerChanged =
      canChangeWriterAssignment && previousWriterId !== form.writer_id;
    const publisherChanged =
      canChangePublisherAssignment && previousPublisherId !== form.publisher_id;
    const updates: Record<string, unknown> = {};
    if (canMetadataEdit) {
      updates.title = form.title.trim();
      updates.site = form.site;
    }
    if (canEditScheduledDate) {
      updates.scheduled_publish_date = form.scheduled_publish_date || null;
      updates.target_publish_date = form.scheduled_publish_date || null;
    }
    if (canEditDisplayDate) {
      updates.display_published_date =
        form.display_published_date || form.scheduled_publish_date || null;
    }
    if (canChangeWriterAssignment) {
      updates.writer_id = form.writer_id || null;
    }
    if (canChangePublisherAssignment) {
      updates.publisher_id = form.publisher_id || null;
    }
    if (canOverrideWorkflow) {
      updates.actual_published_at = toIsoFromDateTimeLocalInput(form.actual_published_at);
    }
    if (canArchiveBlog) {
      updates.is_archived = form.is_archived;
    }
    if (Object.keys(updates).length === 0) {
      return;
    }

    const notifyCallbacks: Array<() => Promise<void>> = [];

    // Push in-app notifications for assignments (using unified events)
    if (writerChanged) {
      notifyCallbacks.push(async () => {
        const { emitEvent } = await import("@/lib/emit-event");
        const { getNotificationFromEvent } = await import("@/lib/emit-event");
        
        const unifiedEvent = {
          type: "blog_writer_assigned" as const,
          contentType: "blog" as const,
          contentId: blog.id,
          oldValue: previousWriterId || undefined,
          newValue: form.writer_id || undefined,
          fieldName: "writer_id",
          actor: user?.id ?? "",
          actorName: profile?.full_name ?? undefined,
          targetUserId: form.writer_id || undefined,
          targetUserName: selectedWriter?.full_name || "Team",
          contentTitle: form.title,
          metadata: {
            role: "writer",
            oldAssignee: users.find((u) => u.id === previousWriterId)?.full_name,
            newAssignee: selectedWriter?.full_name,
          },
          timestamp: Date.now(),
        };
        
        // Emit unified event (records activity history)
        await emitEvent(unifiedEvent);
        
        // Push in-app notification from unified event
        pushNotification(getNotificationFromEvent(unifiedEvent));
      });
    }

    if (publisherChanged) {
      notifyCallbacks.push(async () => {
        const { emitEvent } = await import("@/lib/emit-event");
        const { getNotificationFromEvent } = await import("@/lib/emit-event");
        
        const unifiedEvent = {
          type: "blog_publisher_assigned" as const,
          contentType: "blog" as const,
          contentId: blog.id,
          oldValue: previousPublisherId || undefined,
          newValue: form.publisher_id || undefined,
          fieldName: "publisher_id",
          actor: user?.id ?? "",
          actorName: profile?.full_name ?? undefined,
          targetUserId: form.publisher_id || undefined,
          targetUserName: selectedPublisher?.full_name || "Team",
          contentTitle: form.title,
          metadata: {
            role: "publisher",
            oldAssignee: users.find((u) => u.id === previousPublisherId)?.full_name,
            newAssignee: selectedPublisher?.full_name,
          },
          timestamp: Date.now(),
        };
        
        // Emit unified event (records activity history)
        await emitEvent(unifiedEvent);
        
        // Push in-app notification from unified event
        pushNotification(getNotificationFromEvent(unifiedEvent));
      });
    }

    await updateBlog(
      updates,
      "Blog details updated.",
      notifyCallbacks.length > 0
        ? async () => {
            await Promise.all(notifyCallbacks.map((cb) => cb()));
          }
        : undefined
    );
  }, [
    blog,
    canArchiveBlog,
    canChangePublisherAssignment,
    canChangeWriterAssignment,
    canEditDisplayDate,
    canEditScheduledDate,
    canMetadataEdit,
    canOverrideWorkflow,
    canSaveDetails,
    form,
    isSaving,
    profile?.full_name,
    pushNotification,
    selectedPublisher,
    selectedWriter,
    updateBlog,
    user?.id,
    users,
  ]);
  const handleDetailsSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await saveDetailsChanges();
  };

  const handleConfirmCompletion = async () => {
    if (pendingCompletionAction === "writer") {
      await handleMarkWritingComplete();
    }
    if (pendingCompletionAction === "publisher") {
      await handleMarkPublishingComplete();
    }
    setPendingCompletionAction(null);
  };

  const handleAddComment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!blog || !user?.id) {
      return;
    }
    if (!session?.access_token) {
      setError("Session expired. Refresh and try again.");
      return;
    }
    if (!canCreateComments) {
      setError("You do not have permission to add comments.");
      return;
    }

    const trimmedComment = newComment.trim();
    if (!trimmedComment) {
      setError("Comment cannot be empty.");
      return;
    }

    setIsCommentSaving(true);
    setError(null);
    setCommentsUnavailableMessage(null);
    const createResponse = await fetch(`/api/blogs/${blog.id}/comments`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${session.access_token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ comment: trimmedComment }),
    }).catch(() => null);

    if (!createResponse) {
      setError("Couldn't add comment. Please try again.");
      setIsCommentSaving(false);
      return;
    }
    const createPayload = await parseApiResponseJson<Record<string, unknown>>(createResponse);
    if (isApiFailure(createResponse, createPayload)) {
      const errorMessage = getApiErrorMessage(
        createPayload,
        "Couldn't add comment. Please try again."
      );
      if (errorMessage.toLowerCase().includes("comments table is missing")) {
        setCommentsUnavailableMessage(errorMessage);
      } else {
        setError(errorMessage);
      }
      setIsCommentSaving(false);
      return;
    }

    const supabase = getSupabaseBrowserClient();

    const { data: commentsData, error: commentsError } = await supabase
      .schema("public")
      .from("blog_comments")
      .select("id,blog_id,comment,user_id,created_at,author:user_id(id,full_name,email)")
      .eq("blog_id", blog.id)
      .order("created_at", { ascending: false });

    if (commentsError) {
      if (isMissingBlogCommentsTableError(commentsError)) {
        setCommentsUnavailableMessage(
          "Comments are temporarily unavailable right now. Please try again shortly."
        );
      } else {
        console.error("Comments refresh failed:", commentsError);
        setError("Couldn't refresh comments. Please try again.");
      }
    } else {
      setComments(normalizeCommentRows((commentsData ?? []) as Array<Record<string, unknown>>));
      setNewComment("");
      setSuccessMessage("Comment added.");
    }

    setIsCommentSaving(false);
  };

  const handleWriterSave = async () => {
    if (!form || !blog || !canWriterEdit) {
      return;
    }
    if (!canTransitionWriterStatus(blog.writer_status, form.writer_status, hasPermission)) {
      setError("You do not have permission for the selected writing stage.");
      return;
    }
    if (
      form.writer_status === "completed" &&
      !form.google_doc_url.trim()
    ) {
      setError("Google Doc URL is required before setting writer status to completed.");
      return;
    }

    const previousStatus = blog.writer_status;
    const notifyCallbacks: Array<() => Promise<void>> = [];

    if (previousStatus !== form.writer_status) {
      // Emit unified event for status change (single source of truth)
      notifyCallbacks.push(async () => {
        const { emitEvent } = await import("@/lib/emit-event");
        const { getNotificationFromEvent } = await import("@/lib/emit-event");
        
        const unifiedEvent = {
          type: "blog_writer_status_changed" as const,
          contentType: "blog" as const,
          contentId: blog.id,
          oldValue: previousStatus,
          newValue: form.writer_status,
          fieldName: "writer_status",
          actor: user?.id ?? "",
          actorName: profile?.full_name ?? undefined,
          contentTitle: blog.title,
          timestamp: Date.now(),
        };
        
        // Emit unified event (records activity history + validates notification)
        await emitEvent(unifiedEvent);
        
        // Push in-app notification from unified event
        pushNotification(getNotificationFromEvent(unifiedEvent));
      });

      // Also emit specific "submitted for review" when transitioning to pending_review
      if (form.writer_status === "pending_review") {
        notifyCallbacks.push(async () => {
          pushNotification(
            blogSubmittedForReviewNotification(
              blog.title,
              profile?.full_name ?? null,
              "writer",
              blog.id
            )
          );
        });
      }
    }

    await updateBlog(
      {
        writer_status: form.writer_status,
        google_doc_url: form.google_doc_url.trim() || null,
      },
      "Writer updates saved.",
      notifyCallbacks.length > 0
        ? async () => {
            await Promise.all(notifyCallbacks.map((cb) => cb()));
          }
        : undefined
    );
  };

  const handlePublisherSave = async () => {
    if (!form || !blog || !canPublisherEdit) {
      return;
    }
    if (
      !canTransitionPublisherStatus(
        blog.publisher_status,
        form.publisher_status,
        hasPermission
      )
    ) {
      setError("You do not have permission for the selected publishing stage.");
      return;
    }
    if (
      form.publisher_status === "completed" &&
      !form.live_url.trim()
    ) {
      setError("Live URL is required before setting publisher status to completed.");
      return;
    }

    const previousStatus = blog.publisher_status;
    const notifyCallbacks: Array<() => Promise<void>> = [];

    if (previousStatus !== form.publisher_status) {
      // Emit unified event for status change (single source of truth)
      notifyCallbacks.push(async () => {
        const { emitEvent } = await import("@/lib/emit-event");
        const { getNotificationFromEvent } = await import("@/lib/emit-event");
        
        const unifiedEvent = {
          type: "blog_publisher_status_changed" as const,
          contentType: "blog" as const,
          contentId: blog.id,
          oldValue: previousStatus,
          newValue: form.publisher_status,
          fieldName: "publisher_status",
          actor: user?.id ?? "",
          actorName: profile?.full_name ?? undefined,
          contentTitle: blog.title,
          timestamp: Date.now(),
        };
        
        // Emit unified event (records activity history + validates notification)
        await emitEvent(unifiedEvent);
        
        // Push in-app notification from unified event
        pushNotification(getNotificationFromEvent(unifiedEvent));
      });

      // Emit specific "submitted for review" when transitioning to pending_review
      if (form.publisher_status === "pending_review") {
        notifyCallbacks.push(async () => {
          pushNotification(
            blogSubmittedForReviewNotification(
              blog.title,
              profile?.full_name ?? null,
              "publisher",
              blog.id
            )
          );
        });
      }

      // Emit "published" when transitioning to completed
      if (form.publisher_status === "completed") {
        notifyCallbacks.push(async () => {
          pushNotification(
            blogPublishedNotification(
              blog.title,
              profile?.full_name ?? null,
              blog.id
            )
          );
        });
      }
    }

    await updateBlog(
      {
        publisher_status: form.publisher_status,
        live_url: form.live_url.trim() || null,
      },
      "Publisher updates saved.",
      notifyCallbacks.length > 0
        ? async () => {
            await Promise.all(notifyCallbacks.map((cb) => cb()));
          }
        : undefined
    );
  };

  const handleMarkWritingComplete = async () => {
    if (!form || !blog || !canWriterEdit || isSaving) {
      return;
    }
    if (!canTransitionWriterStatus(blog.writer_status, "completed", hasPermission)) {
      setError("You do not have permission to submit writing.");
      return;
    }
    if (!form.google_doc_url.trim()) {
      setError("Google Doc URL is required before marking writing as complete.");
      return;
    }


    await updateBlog(
      {
        writer_status: "completed",
        google_doc_url: form.google_doc_url.trim() || null,
      },
      "Writing marked complete.",
      async () => {
        pushNotification(
          blogWriterStatusChangedNotification(
            blog.title,
            blog.writer_status,
            "completed",
            profile?.full_name ?? null,
            blog.id
          )
        );
      }
    );
  };

  const handleMarkPublishingComplete = async () => {
    if (!form || !blog || !canPublisherEdit || isSaving) {
      return;
    }
    if (!canTransitionPublisherStatus(blog.publisher_status, "completed", hasPermission)) {
      setError("You do not have permission to complete publishing.");
      return;
    }
    if (!form.live_url.trim()) {
      setError("Live URL is required before marking publishing as complete.");
      return;
    }

    await updateBlog(
      {
        publisher_status: "completed",
        live_url: form.live_url.trim() || null,
      },
      "Publishing marked complete.",
      async () => {
        pushNotification(
          blogPublisherStatusChangedNotification(
            blog.title,
            blog.publisher_status,
            "completed",
            profile?.full_name ?? null,
            blog.id
          )
        );
      }
    );
  };
  const groupedHistory = useMemo(() => {
    const groups = new Map<string, BlogHistoryRecord[]>();
    for (const entry of history) {
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
  }, [history, profile?.timezone]);
  const blogNextAction = useMemo(() => {
    if (!form || !blog) {
      return {
        title: "Review record",
        helper: "Confirm details and workflow ownership.",
        ctaLabel: null as string | null,
        actionType: "none" as "none" | "save_details" | "mark_writing_complete" | "mark_publishing_complete",
        disabled: true,
      };
    }
    if (form.writer_status !== "completed") {
      return {
        title: "Complete writing handoff",
        helper:
          "Before writing can be completed, set Assigned to (Writing) and add Google Doc URL.",
        ctaLabel: "Mark Writing Complete",
        actionType: "mark_writing_complete" as const,
        disabled:
          !canMarkWritingComplete ||
          !canWriterEdit ||
          !form.writer_id ||
          form.google_doc_url.trim().length === 0 ||
          isSaving,
      };
    }
    if (form.publisher_status !== "completed") {
      return {
        title: "Complete publishing handoff",
        helper:
          "Before publishing can be completed, writing must stay complete and Live URL must be set.",
        ctaLabel: "Mark Publishing Complete",
        actionType: "mark_publishing_complete" as const,
        disabled:
          !canMarkPublishingComplete ||
          !canPublisherEdit ||
          !form.publisher_id ||
          form.live_url.trim().length === 0 ||
          isSaving,
      };
    }
    if (isDetailDirty && canSaveDetails) {
      return {
        title: "Save remaining metadata changes",
        helper: "There are unsaved metadata changes on this page.",
        ctaLabel: "Save Metadata",
        actionType: "save_details" as const,
        disabled: isSaving,
      };
    }
    return {
      title: "Workflow complete",
      helper: "Writing and publishing are completed for this blog.",
      ctaLabel: null,
      actionType: "none" as const,
      disabled: true,
    };
  }, [
    blog,
    canMarkPublishingComplete,
    canMarkWritingComplete,
    canPublisherEdit,
    canSaveDetails,
    canWriterEdit,
    form,
    isDetailDirty,
    isSaving,
  ]);
  const runBlogPrimaryAction = useCallback(() => {
    if (blogNextAction.actionType === "mark_writing_complete") {
      setPendingCompletionAction("writer");
      return;
    }
    if (blogNextAction.actionType === "mark_publishing_complete") {
      setPendingCompletionAction("publisher");
      return;
    }
    if (blogNextAction.actionType === "save_details") {
      void saveDetailsChanges();
    }
  }, [blogNextAction.actionType, saveDetailsChanges]);
  useEffect(() => {
    const handleBlogShortcut = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey) {
        return;
      }
      if (!event.altKey || !event.shiftKey) {
        return;
      }
      if (pendingCompletionAction) {
        return;
      }
      const normalizedKey = event.key.length === 1 ? event.key.toLowerCase() : event.key;
      if (normalizedKey === BLOG_DETAIL_SHORTCUTS.nextRequired.key) {
        event.preventDefault();
        if (missingBlogPreflightFields.length === 0) {
          showSuccess("All required transition fields are complete.");
          return;
        }
        jumpToBlogField(missingBlogPreflightFields[0]);
        showSuccess("Jumped to next required field.");
        return;
      }
      if (event.key === BLOG_DETAIL_SHORTCUTS.primaryAction.key) {
        event.preventDefault();
        if (!blogNextAction.ctaLabel || blogNextAction.disabled) {
          showError("Primary action is unavailable right now.");
          return;
        }
        runBlogPrimaryAction();
      }
    };
    window.addEventListener("keydown", handleBlogShortcut);
    return () => {
      window.removeEventListener("keydown", handleBlogShortcut);
    };
  }, [
    blogNextAction.ctaLabel,
    blogNextAction.disabled,
    jumpToBlogField,
    missingBlogPreflightFields,
    pendingCompletionAction,
    runBlogPrimaryAction,
    showError,
    showSuccess,
  ]);

  if (isLoading || !form) {
    return (
      <ProtectedPage>
        <AppShell>
          <div className="space-y-4">
            <div className="skeleton h-7 w-1/2" />
            <div className="skeleton h-4 w-1/3" />
            <div className="skeleton h-24 w-full" />
            <div className="skeleton h-24 w-full" />
          </div>
        </AppShell>
      </ProtectedPage>
    );
  }

  if (!blog) {
    return (
      <ProtectedPage>
        <AppShell>
          <p className="rounded-md border border-rose-200 bg-rose-50 px-4 py-5 text-sm text-rose-700">
            Blog not found.
          </p>
        </AppShell>
      </ProtectedPage>
    );
  }

  return (
    <ProtectedPage>
      <AppShell>
        <div className="space-y-6">
          <nav
            aria-label="Breadcrumb"
            className="flex flex-wrap items-center gap-1 text-xs text-slate-500"
          >
            <Link href="/dashboard" className="hover:text-slate-700">
              Dashboard
            </Link>
            <span>/</span>
            <Link href="/blogs" className="hover:text-slate-700">
              Blogs
            </Link>
            <span>/</span>
            <span className="text-slate-700">Details</span>
          </nav>
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">{blog.title}</h2>
              <p className="text-xs uppercase tracking-wide text-slate-500">
                {blog.site} • Created {formatDateInTimezone(blog.created_at, profile?.timezone)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <WorkflowStageBadge
                stage={getWorkflowStage({
                  writerStatus: blog.writer_status,
                  publisherStatus: blog.publisher_status,
                })}
              />
              <StatusBadge status={blog.overall_status} />
            </div>
          </header>
          <section className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4 xl:hidden">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
                  Next Action
                </h3>
                <p className="text-sm font-medium text-slate-900">{blogNextAction.title}</p>
                <p className="text-sm text-slate-600">{blogNextAction.helper}</p>
                <p
                  className={`text-xs ${
                    isDetailDirty ? "text-amber-700" : "text-emerald-700"
                  }`}
                >
                  {isDetailDirty
                    ? "Unsaved changes"
                    : `All changes saved • ${formatDateInTimezone(
                        blog.updated_at,
                        profile?.timezone,
                        "MMM d, h:mm a"
                      )}`}
                </p>
              </div>
              {blogNextAction.ctaLabel ? (
                <button
                  type="button"
                  disabled={blogNextAction.disabled}
                  aria-keyshortcuts="Alt+Shift+Enter"
                  className="rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={runBlogPrimaryAction}
                >
                  {blogNextAction.ctaLabel}
                </button>
              ) : null}
            </div>
            <div className="space-y-2 rounded-md border border-slate-200 bg-white p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Transition Preflight
              </p>
              {blogPreflightRequiredFields.length === 0 ? (
                <p className="text-xs text-emerald-700">No required blockers for the current stage.</p>
              ) : (
                <>
                  <p className="text-xs text-slate-600">
                    {readyBlogPreflightCount} / {blogPreflightRequiredFields.length} required items
                    ready for next completion action.
                  </p>
                  {missingBlogPreflightFields.length === 0 ? (
                    <p className="text-xs text-emerald-700">All required items are complete.</p>
                  ) : (
                    <ul className="space-y-1">
                      {missingBlogPreflightFields.map((field) => (
                        <li
                          key={field}
                          className="flex items-center justify-between gap-2 text-xs text-slate-700"
                        >
                          <span>{BLOG_PREFLIGHT_FIELD_META[field].label}</span>
                          <button
                            type="button"
                            className="rounded border border-slate-300 bg-white px-1.5 py-0.5 text-[11px] font-medium text-slate-700 hover:bg-slate-100"
                            onClick={() => {
                              jumpToBlogField(field);
                            }}
                          >
                            Go to field
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </div>
          </section>
          <nav
            aria-label="Detail sections"
            className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 lg:hidden"
          >
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Jump to
            </span>
            {blogSectionLinks.map((sectionLink) => (
              <a
                key={sectionLink.href}
                href={sectionLink.href}
                className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
              >
                {sectionLink.label}
              </a>
            ))}
          </nav>


          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px] 2xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-6">
              <section id="blog-details" className="rounded-lg border border-slate-200 p-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Blog Details
            </h3>

            <form className="mt-4 space-y-4" onSubmit={handleDetailsSave}>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">
                    Title
                  </span>
                  <input
                    disabled={!canMetadataEdit}
                    value={form.title}
                    onChange={(event) => {
                      setForm((prev) =>
                        prev ? { ...prev, title: event.target.value } : prev
                      );
                    }}
                    onBlur={() => {
                      const nextTitle = form.title.trim();
                      if (!canMetadataEdit || nextTitle === blog.title) {
                        return;
                      }
                      void updateBlog({ title: nextTitle }, "Saved");
                    }}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">
                    Site
                  </span>
                  <select
                    disabled={!canMetadataEdit}
                    value={form.site}
                    onChange={(event) => {
                      setForm((prev) =>
                        prev ? { ...prev, site: event.target.value as BlogSite } : prev
                      );
                    }}
                    onBlur={() => {
                      if (!canMetadataEdit || form.site === blog.site) {
                        return;
                      }
                      void updateBlog({ site: form.site }, "Saved");
                    }}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                  >
                    {SITES.map((siteValue) => (
                      <option key={siteValue} value={siteValue}>
                        {siteValue}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">
                    Writer
                  </span>
                  <select
                    id="blog-writer-id"
                    disabled={!canChangeWriterAssignment}
                    value={form.writer_id}
                    onChange={(event) => {
                      setForm((prev) =>
                        prev ? { ...prev, writer_id: event.target.value } : prev
                      );
                    }}
                    onBlur={() => {
                      if (
                        !canChangeWriterAssignment ||
                        (blog.writer_id ?? "") === form.writer_id
                      ) {
                        return;
                      }
                      void updateBlog({ writer_id: form.writer_id || null }, "Saved");
                    }}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                  >
                    <option value="">Unassigned</option>
                    {users.map((nextUser) => (
                      <option key={nextUser.id} value={nextUser.id}>
                        {nextUser.full_name} ({nextUser.role})
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">
                    Publisher
                  </span>
                  <select
                    id="blog-publisher-id"
                    disabled={!canChangePublisherAssignment}
                    value={form.publisher_id}
                    onChange={(event) => {
                      setForm((prev) =>
                        prev ? { ...prev, publisher_id: event.target.value } : prev
                      );
                    }}
                    onBlur={() => {
                      if (
                        !canChangePublisherAssignment ||
                        (blog.publisher_id ?? "") === form.publisher_id
                      ) {
                        return;
                      }
                      void updateBlog({ publisher_id: form.publisher_id || null }, "Saved");
                    }}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                  >
                    <option value="">Unassigned</option>
                    {users.map((nextUser) => (
                      <option key={nextUser.id} value={nextUser.id}>
                        {nextUser.full_name} ({nextUser.role})
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">
                    Scheduled Publish Date
                  </span>
                  <input
                    disabled={!canEditScheduledDate}
                    type="date"
                    value={form.scheduled_publish_date}
                    onChange={(event) => {
                      setForm((prev) =>
                        prev ? { ...prev, scheduled_publish_date: event.target.value } : prev
                      );
                    }}
                    onBlur={() => {
                      if (!canEditScheduledDate) {
                        return;
                      }
                      const nextDate = form.scheduled_publish_date || null;
                      if ((blog.scheduled_publish_date ?? "") === (nextDate ?? "")) {
                        return;
                      }
                      void updateBlog(
                        {
                          scheduled_publish_date: nextDate,
                          target_publish_date: nextDate,
                        },
                        "Saved"
                      );
                    }}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">
                    Display Publish Date
                  </span>
                  <input
                    disabled={!canEditDisplayDate}
                    type="date"
                    value={form.display_published_date}
                    onChange={(event) => {
                      setForm((prev) =>
                        prev ? { ...prev, display_published_date: event.target.value } : prev
                      );
                    }}
                    onBlur={() => {
                      if (!canEditDisplayDate) {
                        return;
                      }
                      const nextDisplayDate = form.display_published_date || null;
                      if ((blog.display_published_date ?? "") === (nextDisplayDate ?? "")) {
                        return;
                      }
                      void updateBlog(
                        {
                          display_published_date: nextDisplayDate,
                        },
                        "Saved"
                      );
                    }}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                  />
                </label>
              </div>

              <label className="block">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">
                    Actual Published Timestamp
                  </span>
                  {blog?.actual_published_at && form.actual_published_at && (
                    <span className="text-xs text-slate-500">
                      Auto-captured • Editable by admin
                    </span>
                  )}
                </div>
                <input
                  disabled={!canOverrideWorkflow}
                  type="datetime-local"
                  value={form.actual_published_at}
                  onChange={(event) => {
                    setForm((prev) =>
                      prev ? { ...prev, actual_published_at: event.target.value } : prev
                    );
                  }}
                  onBlur={() => {
                    if (!canOverrideWorkflow) {
                      return;
                    }
                    const nextIso = toIsoFromDateTimeLocalInput(form.actual_published_at);
                    const existingIso = blog.actual_published_at ?? blog.published_at;
                    if ((existingIso ?? "") === (nextIso ?? "")) {
                      return;
                    }
                    void updateBlog({ actual_published_at: nextIso }, "Saved");
                  }}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                />
                {!form.actual_published_at && blog?.publisher_status === "completed" && (
                  <p className="mt-1 text-xs text-slate-500">
                    Automatically captured when blog is published. Admins can edit anytime.
                  </p>
                )}
              </label>

              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input
                  disabled={!canArchiveBlog}
                  type="checkbox"
                  checked={form.is_archived}
                  onChange={(event) => {
                    const nextValue = event.target.checked;
                    setForm((prev) =>
                      prev ? { ...prev, is_archived: nextValue } : prev
                    );
                    if (!canArchiveBlog || nextValue === blog.is_archived) {
                      return;
                    }
                    void updateBlog({ is_archived: nextValue }, "Saved");
                  }}
                />
                Archived
              </label>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={!canSaveDetails || isSaving}
                  className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Save Metadata
                </button>
                <button
                  type="button"
                  className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  onClick={() => {
                    router.push("/dashboard");
                  }}
                >
                  Back to Dashboard
                </button>
              </div>
            </form>
              </section>

          <section id="blog-workflow" className="grid gap-4 xl:grid-cols-2">
            <div className="rounded-lg border border-slate-200 p-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Writer Workflow
              </h3>
              <p className="mt-1 text-sm text-slate-600">
                Assigned writer: {selectedWriter?.full_name ?? "Unassigned"}
              </p>

              <div className="mt-3 space-y-3">
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">
                    Writing Stage
                  </span>
                  <select
                    id="blog-writer-status"
                    disabled={!canWriterEdit}
                    value={form.writer_status}
                    onChange={(event) => {
                      setForm((prev) =>
                        prev
                          ? {
                              ...prev,
                              writer_status: event.target.value as WriterStageStatus,
                            }
                          : prev
                      );
                    }}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                  >
                    {WRITER_STATUSES.map((status) => (
                      <option
                        key={status}
                        value={status}
                        disabled={
                          blog
                            ? !canTransitionWriterStatus(
                                blog.writer_status,
                                status,
                                hasPermission
                              )
                            : false
                        }
                      >
                        {toTitleCase(status)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">
                    Google Doc URL
                  </span>
                  <input
                    id="blog-google-doc-url"
                    disabled={!canWriterEdit}
                    type="url"
                    value={form.google_doc_url}
                    onChange={(event) => {
                      setForm((prev) =>
                        prev ? { ...prev, google_doc_url: event.target.value } : prev
                      );
                    }}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                    placeholder="https://docs.google.com/..."
                  />
                </label>
                <LinkQuickActions href={form.google_doc_url} label="Google Doc URL" />

                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={!canWriterEdit || isSaving}
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={() => {
                      void handleWriterSave();
                    }}
                  >
                    Save Writer Updates
                  </button>
                  {form.writer_status !== "completed" ? (
                    <button
                      type="button"
                      disabled={!canWriterEdit || !canMarkWritingComplete || isSaving}
                      className="rounded-md bg-violet-600 px-3 py-2 text-sm font-semibold text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:cursor-not-allowed disabled:opacity-60"
                      onClick={() => {
                        setPendingCompletionAction("writer");
                      }}
                    >
                      Mark Writing Complete
                    </button>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 p-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Publisher Workflow
              </h3>
              <p className="mt-1 text-sm text-slate-600">
                Assigned publisher: {selectedPublisher?.full_name ?? "Unassigned"}
              </p>

              <div className="mt-3 space-y-3">
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">
                    Publishing Stage
                  </span>
                  <select
                    disabled={!canPublisherEdit}
                    value={form.publisher_status}
                    onChange={(event) => {
                      setForm((prev) =>
                        prev
                          ? {
                              ...prev,
                              publisher_status: event.target.value as PublisherStageStatus,
                            }
                          : prev
                      );
                    }}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                  >
                    {PUBLISHER_STATUSES.map((status) => (
                      <option
                        key={status}
                        value={status}
                        disabled={
                          blog
                            ? !canTransitionPublisherStatus(
                                blog.publisher_status,
                                status,
                                hasPermission
                              )
                            : false
                        }
                      >
                        {toTitleCase(status)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">
                    Live URL
                  </span>
                  <input
                    id="blog-live-url"
                    disabled={!canPublisherEdit}
                    type="url"
                    value={form.live_url}
                    onChange={(event) => {
                      setForm((prev) =>
                        prev ? { ...prev, live_url: event.target.value } : prev
                      );
                    }}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                    placeholder="https://..."
                  />
                </label>
                <LinkQuickActions href={form.live_url} label="Live URL" />

                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={!canPublisherEdit || isSaving}
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={() => {
                      void handlePublisherSave();
                    }}
                  >
                    Save Publisher Updates
                  </button>
                  {form.publisher_status !== "completed" ? (
                    <button
                      type="button"
                      disabled={!canPublisherEdit || !canMarkPublishingComplete || isSaving}
                      className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:cursor-not-allowed disabled:opacity-60"
                      onClick={() => {
                        setPendingCompletionAction("publisher");
                      }}
                    >
                      Mark Publishing Complete
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </section>


          <section id="blog-comments" className="rounded-lg border border-slate-200 p-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Comments
            </h3>
            {commentsUnavailableMessage ? (
              <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                {commentsUnavailableMessage}
              </p>
            ) : null}
            <form className="mt-3 space-y-2" onSubmit={handleAddComment}>
              <textarea
                disabled={Boolean(commentsUnavailableMessage) || !canCreateComments}
                value={newComment}
                onChange={(event) => {
                  setNewComment(event.target.value);
                }}
                className="min-h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                placeholder="Add remarks or feedback…"
                maxLength={2000}
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={
                    isCommentSaving ||
                    Boolean(commentsUnavailableMessage) ||
                    !canCreateComments
                  }
                  className="rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isCommentSaving ? "Adding..." : "Add Comment"}
                </button>
              </div>
            </form>
            {!canCreateComments ? (
              <p className="mt-2 text-xs text-slate-500">
                You do not have permission to add comments.
              </p>
            ) : null}

            {comments.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">
                No comments yet. Add context for reviewers or owners to keep handoffs clear.
              </p>
            ) : (
              <ul className="mt-3 space-y-3">
                {comments.map((comment) => (
                  <li key={comment.id} className="overflow-hidden rounded-lg border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-slate-900 text-[11px] font-semibold text-white">
                        {(comment.author?.full_name ?? "U").slice(0, 1).toUpperCase()}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-slate-600">
                          {comment.author?.full_name ?? "Unknown"}  <span className="font-normal text-slate-400">•</span>{" "}
                          <time className="font-normal text-slate-400">
                            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                          </time>
                        </p>
                        <div className="mt-2 text-sm text-slate-700">
                          <MarkdownComment content={comment.comment} />
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section id="blog-links" className="rounded-lg border border-slate-200 p-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Links
            </h3>
            <div className="mt-2 space-y-3 text-sm">
              <div>
                <p className="text-xs font-medium text-slate-500">Draft</p>
                <LinkQuickActions href={blog.google_doc_url} label="Draft URL" />
                {!blog.google_doc_url ? (
                  <p className="mt-1 text-xs text-slate-500">
                    Add a Google Doc URL in Writing Workflow to unlock this link.
                  </p>
                ) : null}
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Live URL</p>
                <LinkQuickActions href={blog.live_url} label="Live URL" />
                {!blog.live_url ? (
                  <p className="mt-1 text-xs text-slate-500">
                    Add a Live URL in Publishing Workflow when the post is published.
                  </p>
                ) : null}
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Blog Page</p>
                <LinkQuickActions href={`/blogs/${blog.id}`} label="Blog page URL" />
              </div>
            </div>
          </section>
          <section id="blog-assignment-changes" className="rounded-lg border border-slate-200 p-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Assignment & Changes
            </h3>
            {groupedHistory.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">
                No assignment or status changes yet. Workflow updates will appear here.
              </p>
            ) : (
              <div className="mt-3 space-y-3">
                {groupedHistory.map((group) => (
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
                              <p className="text-xs text-slate-500">{detail}</p>
                            ) : null;
                          })()}
                          <p className="text-xs text-slate-400">
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
            </div>
            <aside className="hidden lg:block">
              <div className="space-y-3 lg:sticky lg:top-20">
                <section className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
                        Next Action
                      </h3>
                      <p className="text-sm font-medium text-slate-900">{blogNextAction.title}</p>
                      <p className="text-sm text-slate-600">{blogNextAction.helper}</p>
                      <p
                        className={`text-xs ${
                          isDetailDirty ? "text-amber-700" : "text-emerald-700"
                        }`}
                      >
                        {isDetailDirty
                          ? "Unsaved changes"
                          : `All changes saved • ${formatDateInTimezone(
                              blog.updated_at,
                              profile?.timezone,
                              "MMM d, h:mm a"
                            )}`}
                      </p>
                    </div>
                    {blogNextAction.ctaLabel ? (
                      <button
                        type="button"
                        disabled={blogNextAction.disabled}
                        aria-keyshortcuts="Alt+Shift+Enter"
                        className="rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                        onClick={runBlogPrimaryAction}
                      >
                        {blogNextAction.ctaLabel}
                      </button>
                    ) : null}
                  </div>
                  <div className="space-y-2 rounded-md border border-slate-200 bg-white p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Transition Preflight
                    </p>
                    {blogPreflightRequiredFields.length === 0 ? (
                      <p className="text-xs text-emerald-700">
                        No required blockers for the current stage.
                      </p>
                    ) : (
                      <>
                        <p className="text-xs text-slate-600">
                          {readyBlogPreflightCount} / {blogPreflightRequiredFields.length} required
                          items ready for next completion action.
                        </p>
                        {missingBlogPreflightFields.length === 0 ? (
                          <p className="text-xs text-emerald-700">All required items are complete.</p>
                        ) : (
                          <ul className="space-y-1">
                            {missingBlogPreflightFields.map((field) => (
                              <li
                                key={field}
                                className="flex items-center justify-between gap-2 text-xs text-slate-700"
                              >
                                <span>{BLOG_PREFLIGHT_FIELD_META[field].label}</span>
                                <button
                                  type="button"
                                  className="rounded border border-slate-300 bg-white px-1.5 py-0.5 text-[11px] font-medium text-slate-700 hover:bg-slate-100"
                                  onClick={() => {
                                    jumpToBlogField(field);
                                  }}
                                >
                                  Go to field
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </>
                    )}
                  </div>
                </section>
                <nav
                  aria-label="Detail sections"
                  className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2"
                >
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Jump to
                  </span>
                  {blogSectionLinks.map((sectionLink) => (
                    <a
                      key={sectionLink.href}
                      href={sectionLink.href}
                      className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                    >
                      {sectionLink.label}
                    </a>
                  ))}
                </nav>
              </div>
            </aside>
          </div>
        </div>
        <ConfirmationModal
          isOpen={pendingCompletionAction !== null}
          title={
            pendingCompletionAction === "writer"
              ? "Mark writing complete?"
              : "Mark publishing complete?"
          }
          description={
            pendingCompletionAction === "writer"
              ? "This will move the blog to the next stage in the workflow."
              : "This will mark the publishing workflow as completed."
          }
          confirmLabel={
            pendingCompletionAction === "writer"
              ? "Confirm writing complete"
              : "Confirm publishing complete"
          }
          tone="danger"
          isConfirming={isSaving}
          onCancel={() => {
            setPendingCompletionAction(null);
          }}
          onConfirm={() => {
            void handleConfirmCompletion();
          }}
        />
      </AppShell>
    </ProtectedPage>
  );
}
