import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { withApiContract } from "@/lib/api-contract";
import {
  BLOG_SELECT_WITH_DATES_WITH_RELATIONS,
  normalizeBlogRow,
} from "@/lib/blog-schema";
import { hasPermission, authenticateRequest } from "@/lib/server-permissions";
import { emitWorkflowSlackEvent } from "@/lib/server-slack-emitter";
import type { PublisherStageStatus, WriterStageStatus } from "@/lib/types";

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

const createBlogPayloadSchema = z
  .object({
    title: z.string().trim().min(1),
    slug: z.string().trim().min(1).optional(),
    site: z.enum(["sighthound.com", "redactor.com"]),
    writer_id: z.string().uuid().nullable().optional(),
    publisher_id: z.string().uuid().nullable().optional(),
    writer_status: z.enum(WRITER_STAGE_STATUSES).optional(),
    publisher_status: z.enum(PUBLISHER_STAGE_STATUSES).optional(),
    google_doc_url: z.string().url().nullable().optional(),
    scheduled_publish_date: z.string().date().nullable().optional(),
    display_published_date: z.string().date().nullable().optional(),
    target_publish_date: z.string().date().nullable().optional(),
  })
  .strict();

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export const POST = withApiContract(async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  if (!hasPermission(auth.context, "create_blog")) {
    return NextResponse.json({ error: "Permission denied" }, { status: 403 });
  }

  const rawPayload = (await request.json().catch(() => ({}))) as unknown;
  const parsedPayload = createBlogPayloadSchema.safeParse(rawPayload);
  if (!parsedPayload.success) {
    return NextResponse.json(
      {
        error:
          parsedPayload.error.issues[0]?.message ?? "Invalid blog create payload",
      },
      { status: 400 }
    );
  }
  const payload = parsedPayload.data;

  const writerId = payload.writer_id ?? null;
  const publisherId = payload.publisher_id ?? null;
  const writerStatus: WriterStageStatus =
    payload.writer_status ?? (writerId ? "in_progress" : "not_started");
  const publisherStatus: PublisherStageStatus =
    payload.publisher_status ?? "not_started";

  if (
    writerId &&
    writerId !== auth.context.userId &&
    !hasPermission(auth.context, "change_writer_assignment")
  ) {
    return NextResponse.json(
      { error: "Permission denied for writer assignment changes" },
      { status: 403 }
    );
  }
  if (
    publisherId &&
    publisherId !== auth.context.userId &&
    !hasPermission(auth.context, "change_publisher_assignment")
  ) {
    return NextResponse.json(
      { error: "Permission denied for publisher assignment changes" },
      { status: 403 }
    );
  }
  if (!writerId && writerStatus !== "not_started") {
    return NextResponse.json(
      { error: "Assign a writer before setting writing status" },
      { status: 400 }
    );
  }
  if (!publisherId && publisherStatus !== "not_started") {
    return NextResponse.json(
      { error: "Assign a publisher before setting publishing status" },
      { status: 400 }
    );
  }

  const scheduledPublishDate = payload.scheduled_publish_date ?? null;
  const targetPublishDate =
    payload.target_publish_date ?? payload.scheduled_publish_date ?? null;
  const displayPublishDate =
    payload.display_published_date ??
    payload.scheduled_publish_date ??
    payload.target_publish_date ??
    null;

  const { data: createdRow, error: createError } = await auth.context.adminClient
    .from("blogs")
    .insert({
      title: payload.title,
      slug: payload.slug ?? slugify(payload.title),
      site: payload.site,
      writer_id: writerId,
      publisher_id: publisherId,
      writer_status: writerStatus,
      publisher_status: publisherStatus,
      google_doc_url: payload.google_doc_url ?? null,
      scheduled_publish_date: scheduledPublishDate,
      display_published_date: displayPublishDate,
      target_publish_date: targetPublishDate,
      created_by: auth.context.userId,
    })
    .select(BLOG_SELECT_WITH_DATES_WITH_RELATIONS)
    .maybeSingle();

  if (createError) {
    const conflict = createError.code === "23505";
    return NextResponse.json(
      {
        error: conflict
          ? "A blog with this slug already exists."
          : "Couldn't create blog. Please try again.",
      },
      { status: conflict ? 409 : 500 }
    );
  }
  if (!createdRow) {
    return NextResponse.json(
      { error: "Couldn't create blog. Please try again." },
      { status: 500 }
    );
  }

  const createdBlog = normalizeBlogRow(createdRow as Record<string, unknown>);
  await emitWorkflowSlackEvent(auth.context.adminClient, {
    eventType: "blog_created",
    blogId: createdBlog.id,
    title: createdBlog.title,
    site: createdBlog.site,
    actorUserId: auth.context.userId,
    targetUserId: writerId ?? undefined,
  });

  return NextResponse.json({ blog: createdBlog }, { status: 201 });
});
