import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  BLOG_SELECT_WITH_DATES_WITH_RELATIONS,
  normalizeBlogRow,
} from "@/lib/blog-schema";
import { withApiContract } from "@/lib/api-contract";
import {
  canTransitionPublisherStatus,
  canTransitionWriterStatus,
} from "@/lib/permissions";
import { authenticateRequest, hasPermission } from "@/lib/server-permissions";
import { emitWorkflowSlackEvent } from "@/lib/server-slack-emitter";
import type { BlogRecord, PublisherStageStatus, WriterStageStatus } from "@/lib/types";

const WRITER_STAGE_STATUSES = [
  "not_started",
  "in_progress",
  "pending_review",
  "needs_revision",
  "completed",
] as const;
const PUBLISHER_STAGE_STATUSES = [
  "not_started",
  "in_progress",
  "pending_review",
  "publisher_approved",
  "completed",
] as const;

const transitionPayloadSchema = z
  .object({
    title: z.string().trim().min(1).optional(),
    site: z.enum(["sighthound.com", "redactor.com"]).optional(),
    writer_id: z.string().uuid().nullable().optional(),
    publisher_id: z.string().uuid().nullable().optional(),
    writer_status: z.enum(WRITER_STAGE_STATUSES).optional(),
    publisher_status: z.enum(PUBLISHER_STAGE_STATUSES).optional(),
    google_doc_url: z.string().url().nullable().optional(),
    live_url: z.string().url().nullable().optional(),
    scheduled_publish_date: z.string().date().nullable().optional(),
    display_published_date: z.string().date().nullable().optional(),
    target_publish_date: z.string().date().nullable().optional(),
    actual_published_at: z.string().nullable().optional(),
    is_archived: z.boolean().optional(),
  })
  .strict();

function hasAnyUpdate(payload: z.infer<typeof transitionPayloadSchema>) {
  return (
    payload.title !== undefined ||
    payload.site !== undefined ||
    payload.writer_id !== undefined ||
    payload.publisher_id !== undefined ||
    payload.writer_status !== undefined ||
    payload.publisher_status !== undefined ||
    payload.google_doc_url !== undefined ||
    payload.live_url !== undefined ||
    payload.scheduled_publish_date !== undefined ||
    payload.display_published_date !== undefined ||
    payload.target_publish_date !== undefined ||
    payload.actual_published_at !== undefined ||
    payload.is_archived !== undefined
  );
}

export const POST = withApiContract(async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(request);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await params;
  const rawPayload = (await request.json().catch(() => ({}))) as unknown;
  const parsedPayload = transitionPayloadSchema.safeParse(rawPayload);
  if (!parsedPayload.success) {
    return NextResponse.json(
      {
        error:
          parsedPayload.error.issues[0]?.message ?? "Invalid blog transition payload",
      },
      { status: 400 }
    );
  }
  const payload = parsedPayload.data;
  if (!hasAnyUpdate(payload)) {
    return NextResponse.json(
      { error: "At least one updatable field is required" },
      { status: 400 }
    );
  }

  const { data: blogRow, error: blogFetchError } = await auth.context.adminClient
    .from("blogs")
    .select(BLOG_SELECT_WITH_DATES_WITH_RELATIONS)
    .eq("id", id)
    .maybeSingle();
  if (blogFetchError) {
    return NextResponse.json(
      { error: "Failed to load blog. Please try again." },
      { status: 500 }
    );
  }
  if (!blogRow) {
    return NextResponse.json({ error: "Blog not found" }, { status: 404 });
  }

  const blog = normalizeBlogRow(blogRow as Record<string, unknown>) as BlogRecord;
  const has = (permissionKey: Parameters<typeof hasPermission>[1]) =>
    hasPermission(auth.context, permissionKey);

  const requestedWriterAssignmentChange =
    payload.writer_id !== undefined && payload.writer_id !== blog.writer_id;
  const requestedPublisherAssignmentChange =
    payload.publisher_id !== undefined && payload.publisher_id !== blog.publisher_id;
  const requestedMetadataChange =
    (payload.title !== undefined && payload.title !== blog.title) ||
    (payload.site !== undefined && payload.site !== blog.site);
  const requestedGoogleDocChange =
    payload.google_doc_url !== undefined && payload.google_doc_url !== blog.google_doc_url;
  const requestedLiveUrlChange =
    payload.live_url !== undefined && payload.live_url !== blog.live_url;
  const requestedScheduledDateChange =
    payload.scheduled_publish_date !== undefined ||
    payload.target_publish_date !== undefined;
  const requestedDisplayDateChange = payload.display_published_date !== undefined;
  const requestedActualPublishedAtChange =
    payload.actual_published_at !== undefined &&
    payload.actual_published_at !== blog.actual_published_at;
  const requestedArchiveChange =
    payload.is_archived !== undefined && payload.is_archived !== blog.is_archived;
  const isWorkflowOwner =
    blog.writer_id === auth.context.userId || blog.publisher_id === auth.context.userId;

  if (requestedMetadataChange && !has("edit_blog_metadata") && !has("edit_blog_title")) {
    return NextResponse.json(
      { error: "Permission denied for blog metadata changes" },
      { status: 403 }
    );
  }

  if (requestedWriterAssignmentChange && !has("change_writer_assignment")) {
    return NextResponse.json(
      { error: "Permission denied for writer assignment changes" },
      { status: 403 }
    );
  }
  if (requestedPublisherAssignmentChange && !has("change_publisher_assignment")) {
    return NextResponse.json(
      { error: "Permission denied for publisher assignment changes" },
      { status: 403 }
    );
  }
  if (
    payload.writer_status !== undefined &&
    !canTransitionWriterStatus(blog.writer_status, payload.writer_status, has)
  ) {
    return NextResponse.json(
      { error: "Permission denied for writer status transition" },
      { status: 403 }
    );
  }
  if (
    payload.publisher_status !== undefined &&
    !canTransitionPublisherStatus(blog.publisher_status, payload.publisher_status, has)
  ) {
    return NextResponse.json(
      { error: "Permission denied for publisher status transition" },
      { status: 403 }
    );
  }
  if (
    requestedGoogleDocChange &&
    !has("edit_google_doc_link") &&
    !isWorkflowOwner
  ) {
    return NextResponse.json(
      { error: "Permission denied for Google Doc URL changes" },
      { status: 403 }
    );
  }
  if (requestedLiveUrlChange && !has("edit_live_url") && !isWorkflowOwner) {
    return NextResponse.json(
      { error: "Permission denied for Live URL changes" },
      { status: 403 }
    );
  }
  if (
    requestedScheduledDateChange &&
    !has("edit_scheduled_publish_date") &&
    !isWorkflowOwner
  ) {
    return NextResponse.json(
      { error: "Permission denied for scheduled publish date changes" },
      { status: 403 }
    );
  }
  if (
    requestedDisplayDateChange &&
    !has("edit_display_publish_date") &&
    !isWorkflowOwner
  ) {
    return NextResponse.json(
      { error: "Permission denied for display publish date changes" },
      { status: 403 }
    );
  }
  if (requestedActualPublishedAtChange && !has("edit_actual_publish_timestamp")) {
    return NextResponse.json(
      { error: "Permission denied for actual publish timestamp changes" },
      { status: 403 }
    );
  }
  if (
    requestedArchiveChange &&
    !has("archive_blog") &&
    !has("restore_archived_blog")
  ) {
    return NextResponse.json(
      { error: "Permission denied for archive state changes" },
      { status: 403 }
    );
  }

  const nextWriterId = payload.writer_id !== undefined ? payload.writer_id : blog.writer_id;
  const nextPublisherId =
    payload.publisher_id !== undefined ? payload.publisher_id : blog.publisher_id;
  const nextWriterStatus: WriterStageStatus =
    payload.writer_status !== undefined ? payload.writer_status : blog.writer_status;
  const writerJustCompleted =
    payload.writer_status === "completed" && blog.writer_status !== "completed";
  const shouldAutoJogPublisher =
    payload.publisher_status === undefined &&
    blog.publisher_status === "not_started" &&
    nextWriterStatus === "completed" &&
    nextPublisherId !== null &&
    (writerJustCompleted || requestedPublisherAssignmentChange);
  const nextPublisherStatus: PublisherStageStatus =
    payload.publisher_status !== undefined
      ? payload.publisher_status
      : shouldAutoJogPublisher
        ? "in_progress"
        : blog.publisher_status;

  if (nextWriterStatus !== "not_started" && !nextWriterId) {
    return NextResponse.json(
      { error: "Assign a writer before changing writer status" },
      { status: 400 }
    );
  }
  if (nextPublisherStatus !== "not_started" && !nextPublisherId) {
    return NextResponse.json(
      { error: "Assign a publisher before changing publisher status" },
      { status: 400 }
    );
  }
  if (nextPublisherStatus === "completed" && nextWriterStatus !== "completed") {
    return NextResponse.json(
      { error: "Writer status must be completed before publisher completion" },
      { status: 400 }
    );
  }

  const updatePayload: Record<string, string | boolean | null> = {};
  if (payload.title !== undefined) {
    updatePayload.title = payload.title;
  }
  if (payload.site !== undefined) {
    updatePayload.site = payload.site;
  }
  if (payload.writer_id !== undefined) {
    updatePayload.writer_id = payload.writer_id;
  }
  if (payload.publisher_id !== undefined) {
    updatePayload.publisher_id = payload.publisher_id;
  }
  if (payload.writer_status !== undefined) {
    updatePayload.writer_status = payload.writer_status;
  }
  if (payload.publisher_status !== undefined) {
    updatePayload.publisher_status = payload.publisher_status;
  } else if (shouldAutoJogPublisher) {
    updatePayload.publisher_status = nextPublisherStatus;
  }
  if (payload.google_doc_url !== undefined) {
    updatePayload.google_doc_url = payload.google_doc_url;
  }
  if (payload.live_url !== undefined) {
    updatePayload.live_url = payload.live_url;
  }
  if (payload.scheduled_publish_date !== undefined) {
    updatePayload.scheduled_publish_date = payload.scheduled_publish_date;
    if (payload.target_publish_date === undefined) {
      updatePayload.target_publish_date = payload.scheduled_publish_date;
    }
  }
  if (payload.display_published_date !== undefined) {
    updatePayload.display_published_date = payload.display_published_date;
  }
  if (payload.target_publish_date !== undefined) {
    updatePayload.target_publish_date = payload.target_publish_date;
  }
  if (payload.actual_published_at !== undefined) {
    updatePayload.actual_published_at = payload.actual_published_at;
  }
  if (payload.is_archived !== undefined) {
    updatePayload.is_archived = payload.is_archived;
  }

  const { data: updatedRow, error: updateError } = await auth.context.adminClient
    .from("blogs")
    .update(updatePayload)
    .eq("id", id)
    .eq("updated_at", blog.updated_at)
    .select(BLOG_SELECT_WITH_DATES_WITH_RELATIONS)
    .maybeSingle();
  if (updateError) {
    return NextResponse.json(
      { error: "Failed to update blog. Please try again." },
      { status: 500 }
    );
  }
  if (!updatedRow) {
    return NextResponse.json(
      { error: "Concurrent modification detected. Refresh and retry." },
      { status: 409 }
    );
  }

  const updatedBlog = normalizeBlogRow(updatedRow as Record<string, unknown>);

  const slackEmissions: Array<{
    eventType:
      | "writer_assigned"
      | "ready_to_publish"
      | "published";
    targetUserId?: string | null;
  }> = [];
  if (requestedWriterAssignmentChange && payload.writer_id) {
    slackEmissions.push({
      eventType: "writer_assigned",
      targetUserId: payload.writer_id,
    });
  }
  if (requestedPublisherAssignmentChange && payload.publisher_id) {
    slackEmissions.push({
      eventType: "writer_assigned",
      targetUserId: payload.publisher_id,
    });
  }
  if (writerJustCompleted) {
    slackEmissions.push({
      eventType: "ready_to_publish",
      targetUserId: nextPublisherId,
    });
  }
  if (
    payload.publisher_status !== undefined &&
    payload.publisher_status === "completed" &&
    payload.publisher_status !== blog.publisher_status
  ) {
    slackEmissions.push({
      eventType: "published",
    });
  }

  await Promise.all(
    slackEmissions.map((emission) =>
      emitWorkflowSlackEvent(auth.context.adminClient, {
        eventType: emission.eventType,
        blogId: id,
        title: updatedBlog.title,
        site: updatedBlog.site,
        actorUserId: auth.context.userId,
        targetUserId: emission.targetUserId ?? undefined,
      })
    )
  );
  return NextResponse.json({ blog: updatedBlog }, { status: 200 });
});
