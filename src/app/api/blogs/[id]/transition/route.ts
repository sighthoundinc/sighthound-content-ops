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
    writer_id: z.string().uuid().nullable().optional(),
    publisher_id: z.string().uuid().nullable().optional(),
    writer_status: z.enum(WRITER_STAGE_STATUSES).optional(),
    publisher_status: z.enum(PUBLISHER_STAGE_STATUSES).optional(),
    scheduled_publish_date: z.string().date().nullable().optional(),
    display_published_date: z.string().date().nullable().optional(),
    target_publish_date: z.string().date().nullable().optional(),
  })
  .strict();

function hasAnyUpdate(payload: z.infer<typeof transitionPayloadSchema>) {
  return (
    payload.writer_id !== undefined ||
    payload.publisher_id !== undefined ||
    payload.writer_status !== undefined ||
    payload.publisher_status !== undefined ||
    payload.scheduled_publish_date !== undefined ||
    payload.display_published_date !== undefined ||
    payload.target_publish_date !== undefined
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
  const requestedScheduledDateChange =
    payload.scheduled_publish_date !== undefined ||
    payload.target_publish_date !== undefined;
  const requestedDisplayDateChange = payload.display_published_date !== undefined;

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
  if (requestedScheduledDateChange && !has("edit_scheduled_publish_date")) {
    return NextResponse.json(
      { error: "Permission denied for scheduled publish date changes" },
      { status: 403 }
    );
  }
  if (requestedDisplayDateChange && !has("edit_display_publish_date")) {
    return NextResponse.json(
      { error: "Permission denied for display publish date changes" },
      { status: 403 }
    );
  }

  const nextWriterId = payload.writer_id !== undefined ? payload.writer_id : blog.writer_id;
  const nextPublisherId =
    payload.publisher_id !== undefined ? payload.publisher_id : blog.publisher_id;
  const nextWriterStatus: WriterStageStatus =
    payload.writer_status !== undefined ? payload.writer_status : blog.writer_status;
  const nextPublisherStatus: PublisherStageStatus =
    payload.publisher_status !== undefined
      ? payload.publisher_status
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

  const updatePayload: Record<string, string | null> = {};
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

  const { data: updatedRow, error: updateError } = await auth.context.adminClient
    .from("blogs")
    .update(updatePayload)
    .eq("id", id)
    .select(BLOG_SELECT_WITH_DATES_WITH_RELATIONS)
    .maybeSingle();
  if (updateError) {
    return NextResponse.json(
      { error: "Failed to update blog. Please try again." },
      { status: 500 }
    );
  }
  if (!updatedRow) {
    return NextResponse.json({ error: "Blog not found" }, { status: 404 });
  }

  const updatedBlog = normalizeBlogRow(updatedRow as Record<string, unknown>);
  return NextResponse.json({ blog: updatedBlog }, { status: 200 });
});
