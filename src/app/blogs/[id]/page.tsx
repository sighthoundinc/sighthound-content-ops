"use client";

import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";

import { AppShell } from "@/components/app-shell";
import { ConfirmationModal } from "@/components/confirmation-modal";
import { ExternalLink } from "@/components/external-link";
import { ProtectedPage } from "@/components/protected-page";
import { StatusBadge, WorkflowStageBadge } from "@/components/status-badge";
import { validateAuthor } from "@/lib/shape-validation";
import {
  BLOG_SELECT_LEGACY_WITH_RELATIONS,
  BLOG_SELECT_WITH_DATES_WITH_RELATIONS,
  isMissingBlogCommentsTableError,
  isMissingBlogDateColumnsError,
  normalizeBlogRow,
} from "@/lib/blog-schema";
import { notifySlack } from "@/lib/notifications";
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
      created_by: String(row.user_id ?? row.created_by ?? ""),
      created_at: String(row.created_at ?? ""),
      author,
    } satisfies BlogCommentRecord;
  });
}


function isMissingBlogCommentUserIdColumnError(error: {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  hint?: string | null;
} | null) {
  if (!error) {
    return false;
  }
  const code = (error.code ?? "").toUpperCase();
  const text =
    `${error.message ?? ""} ${error.details ?? ""} ${error.hint ?? ""}`.toLowerCase();
  return code === "42703" && text.includes("user_id");
}

function toDateTimeLocalInput(value: string | null | undefined) {
  if (!value) {
    return "";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  const hours = String(parsed.getHours()).padStart(2, "0");
  const minutes = String(parsed.getMinutes()).padStart(2, "0");
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
  const { hasPermission, user, profile } = useAuth();
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
    showSuccess(successMessage.replace(/\.$/, ""));
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
      const fetchBlog = async () => {
        let { data, error } = await supabase
          .from("blogs")
          .select(BLOG_SELECT_WITH_DATES_WITH_RELATIONS)
          .eq("id", blogId)
          .single();
        if (isMissingBlogDateColumnsError(error)) {
          const fallback = await supabase
            .from("blogs")
            .select(BLOG_SELECT_LEGACY_WITH_RELATIONS)
            .eq("id", blogId)
            .single();
          data = fallback.data as typeof data;
          error = fallback.error;
        }

        return { data, error };
      };

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
            let { data, error } = await supabase
              .schema("public")
              .from("blog_comments")
              .select("id,blog_id,comment,user_id,created_at,author:user_id(id,full_name,email)")
              .eq("blog_id", blogId)
              .order("created_at", { ascending: false });

            if (isMissingBlogCommentUserIdColumnError(error)) {
              const fallback = await supabase
                .schema("public")
                .from("blog_comments")
                .select("id,blog_id,comment,created_by,created_at,author:created_by(id,full_name,email)")
                .eq("blog_id", blogId)
                .order("created_at", { ascending: false });
              data = fallback.data as typeof data;
              error = fallback.error;
            }

            return { data, error };
          })(),
        ]);

      if (blogError) {
        setError(blogError.message);
        setIsLoading(false);
        return;
      }

      const nextBlog = normalizeBlogRow(
        (blogData ?? {}) as Record<string, unknown>
      ) as unknown as BlogRecord;
      setBlog(nextBlog);
      // Store version (updated_at) to detect concurrent changes
      setBlogVersion(nextBlog.updated_at);
      setForm({
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
      });
      setUsers((usersData ?? []) as ProfileRecord[]);
      setHistory((historyData ?? []) as BlogHistoryRecord[]);
      if (commentsError) {
        if (isMissingBlogCommentsTableError(commentsError)) {
          setComments([]);
          setCommentsUnavailableMessage(
            "Comments table is missing from schema cache. Run the latest Supabase migrations and refresh schema cache."
          );
        } else {
          setError(commentsError.message);
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

  const updateBlog = async (
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

    const supabase = getSupabaseBrowserClient();
    let { data, error: updateError } = await supabase
      .from("blogs")
      .update(updates)
      .eq("id", blog.id)
      .select(BLOG_SELECT_WITH_DATES_WITH_RELATIONS)
      .single();

    if (isMissingBlogDateColumnsError(updateError)) {
      const legacyUpdates = {
        ...updates,
      };
      delete (legacyUpdates as { scheduled_publish_date?: string | null }).scheduled_publish_date;
      delete (legacyUpdates as { display_published_date?: string | null }).display_published_date;
      delete (legacyUpdates as { actual_published_at?: string | null }).actual_published_at;
      delete (legacyUpdates as { published_at?: string | null }).published_at;

      const fallbackUpdate = await supabase
        .from("blogs")
        .update(legacyUpdates)
        .eq("id", blog.id)
        .select(BLOG_SELECT_LEGACY_WITH_RELATIONS)
        .single();
      data = fallbackUpdate.data as typeof data;
      updateError = fallbackUpdate.error;
    }

    if (updateError) {
      setError(updateError.message);
      setIsSaving(false);
      return;
    }

    const nextBlog = normalizeBlogRow(
      (data ?? {}) as Record<string, unknown>
    ) as unknown as BlogRecord;
    setBlog(nextBlog);
    // Update version after successful save to prevent stale version on concurrent changes
    setBlogVersion(nextBlog.updated_at);
    setForm({
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
    });
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
  };

  const handleDetailsSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
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

    // Slack notification for writer assignment
    if (writerChanged && form.writer_id && selectedWriter) {
      notifyCallbacks.push(async () => {
        await notifySlack({
          eventType: "writer_assigned",
          blogId: blog.id,
          title: form.title,
          site: form.site,
          actorName: profile?.full_name ?? "Admin",
          targetEmail: selectedWriter.email,
        });
      });
    }

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

    const supabase = getSupabaseBrowserClient();
    let { error: insertError } = await supabase
      .schema("public")
      .from("blog_comments")
      .insert({
        blog_id: blog.id,
        comment: trimmedComment,
        user_id: user.id,
      });
    if (isMissingBlogCommentUserIdColumnError(insertError)) {
      const fallbackInsert = await supabase
        .schema("public")
        .from("blog_comments")
        .insert({
          blog_id: blog.id,
          comment: trimmedComment,
          created_by: user.id,
        });
      insertError = fallbackInsert.error;
    }


    if (insertError) {
      if (isMissingBlogCommentsTableError(insertError)) {
        setCommentsUnavailableMessage(
          "Comments table is missing from schema cache. Run the latest Supabase migrations and refresh schema cache."
        );
      } else {
        setError(insertError.message);
      }
      setIsCommentSaving(false);
      return;
    }

    let { data: commentsData, error: commentsError } = await supabase
      .schema("public")
      .from("blog_comments")
      .select("id,blog_id,comment,user_id,created_at,author:user_id(id,full_name,email)")
      .eq("blog_id", blog.id)
      .order("created_at", { ascending: false });

    if (isMissingBlogCommentUserIdColumnError(commentsError)) {
      const fallback = await supabase
        .schema("public")
        .from("blog_comments")
        .select("id,blog_id,comment,created_by,created_at,author:created_by(id,full_name,email)")
        .eq("blog_id", blog.id)
        .order("created_at", { ascending: false });
      commentsData = fallback.data as typeof commentsData;
      commentsError = fallback.error;
    }

    if (commentsError) {
      if (isMissingBlogCommentsTableError(commentsError)) {
        setCommentsUnavailableMessage(
          "Comments table is missing from schema cache. Run the latest Supabase migrations and refresh schema cache."
        );
      } else {
        setError(commentsError.message);
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

    const targetPublisherEmail =
      users.find((nextUser) => nextUser.id === form.publisher_id)?.email ?? null;

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
        // Only send "ready_to_publish" to publisher (writer_completed is redundant)
        await notifySlack({
          eventType: "ready_to_publish",
          blogId: blog.id,
          title: blog.title,
          site: blog.site,
          actorName: profile?.full_name ?? "Writer",
          targetEmail: targetPublisherEmail,
        });
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
        await notifySlack({
          eventType: "published",
          blogId: blog.id,
          title: blog.title,
          site: blog.site,
          actorName: profile?.full_name ?? "Publisher",
          targetEmail: null,
        });
      }
    );
  };

  if (isLoading || !form) {
    return (
      <ProtectedPage>
        <AppShell>
          <div className="space-y-4 rounded-md border border-slate-200 bg-slate-50 px-4 py-5">
            <div className="h-7 w-1/2 animate-pulse rounded bg-slate-200" />
            <div className="h-4 w-1/3 animate-pulse rounded bg-slate-200" />
            <div className="h-24 w-full animate-pulse rounded bg-slate-200" />
            <div className="h-24 w-full animate-pulse rounded bg-slate-200" />
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


          <section className="rounded-lg border border-slate-200 p-4">
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
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
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
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
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
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
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
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
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
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
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
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
                  />
                </label>
              </div>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">
                  Actual Published Timestamp
                </span>
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
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
                />
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
                  className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
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

          <section className="grid gap-4 xl:grid-cols-2">
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
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
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
                    disabled={!canWriterEdit}
                    type="url"
                    value={form.google_doc_url}
                    onChange={(event) => {
                      setForm((prev) =>
                        prev ? { ...prev, google_doc_url: event.target.value } : prev
                      );
                    }}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
                    placeholder="https://docs.google.com/..."
                  />
                </label>

                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={!canWriterEdit || isSaving}
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
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
                      className="rounded-md bg-violet-600 px-3 py-2 text-sm font-semibold text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
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
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
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
                    disabled={!canPublisherEdit}
                    type="url"
                    value={form.live_url}
                    onChange={(event) => {
                      setForm((prev) =>
                        prev ? { ...prev, live_url: event.target.value } : prev
                      );
                    }}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
                    placeholder="https://..."
                  />
                </label>

                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={!canPublisherEdit || isSaving}
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
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
                      className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
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


          <section className="rounded-lg border border-slate-200 p-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Assignment & Changes
            </h3>
            {history.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">No history yet.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {history.map((entry) => (
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
            )}
          </section>

          <section className="rounded-lg border border-slate-200 p-4">
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
                className="min-h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-100"
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
                  className="rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
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
              <p className="mt-3 text-sm text-slate-500">No comments yet.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {comments.map((comment) => (
                  <li key={comment.id} className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-[10px] font-semibold text-slate-700">
                        {(comment.author?.full_name ?? "U").slice(0, 1).toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-600">
                          {comment.author?.full_name ?? "Unknown"} —{" "}
                          {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                        </p>
                        <p className="mt-1 text-sm text-slate-800">{comment.comment}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {blog.google_doc_url ? (
            <section className="rounded-lg border border-slate-200 p-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Links
              </h3>
              <div className="mt-2 space-y-2 text-sm">
                <p>
                  Draft:{" "}
                  <ExternalLink
                    href={blog.google_doc_url}
                    className="text-blue-600 underline"
                  >
                    {blog.google_doc_url}
                  </ExternalLink>
                </p>
                {blog.live_url ? (
                  <p>
                    Live URL:{" "}
                    <ExternalLink
                      href={blog.live_url}
                      className="text-blue-600 underline"
                    >
                      {blog.live_url}
                    </ExternalLink>
                  </p>
                ) : null}
              </div>
            </section>
          ) : null}
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
