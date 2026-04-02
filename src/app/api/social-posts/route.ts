import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { withApiContract } from "@/lib/api-contract";
import { getUserRoles } from "@/lib/roles";
import { authenticateRequest, hasPermission } from "@/lib/server-permissions";
import { emitWorkflowSlackEvent } from "@/lib/server-slack-emitter";

const SOCIAL_PRODUCTS = [
  "alpr_plus",
  "redactor",
  "hardware",
  "general_company",
] as const;
const SOCIAL_TYPES = ["image", "carousel", "link", "video"] as const;
const SOCIAL_PLATFORMS = ["linkedin", "facebook", "instagram"] as const;

const createSocialPostPayloadSchema = z
  .object({
    title: z.string().optional(),
    product: z.enum(SOCIAL_PRODUCTS),
    type: z.enum(SOCIAL_TYPES),
    platforms: z.array(z.enum(SOCIAL_PLATFORMS)).optional(),
    scheduled_date: z.string().date().nullable().optional(),
    worker_user_id: z.string().uuid().nullable().optional(),
    reviewer_user_id: z.string().uuid(),
  })
  .strict();

export const POST = withApiContract(async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  if (!hasPermission(auth.context, "create_social_post")) {
    return NextResponse.json({ error: "Permission denied" }, { status: 403 });
  }

  const rawPayload = (await request.json().catch(() => ({}))) as unknown;
  const parsedPayload = createSocialPostPayloadSchema.safeParse(rawPayload);
  if (!parsedPayload.success) {
    return NextResponse.json(
      {
        error:
          parsedPayload.error.issues[0]?.message ??
          "Invalid social post create payload",
      },
      { status: 400 }
    );
  }
  const payload = parsedPayload.data;

  const isAdmin = getUserRoles(auth.context.profile).includes("admin");
  const workerUserId = payload.worker_user_id ?? auth.context.userId;
  if (!workerUserId) {
    return NextResponse.json({ error: "Assigned to is required." }, { status: 400 });
  }
  if (!isAdmin && workerUserId !== auth.context.userId) {
    return NextResponse.json(
      { error: "Only admins can assign another user on create." },
      { status: 403 }
    );
  }

  const normalizedPlatforms = Array.from(new Set(payload.platforms ?? []));

  const { data: createdRow, error: createError } = await auth.context.adminClient
    .from("social_posts")
    .insert({
      title: payload.title?.trim() ?? "",
      product: payload.product,
      type: payload.type,
      scheduled_date: payload.scheduled_date ?? null,
      status: "draft",
      platforms: normalizedPlatforms,
      created_by: auth.context.userId,
      worker_user_id: workerUserId,
      reviewer_user_id: payload.reviewer_user_id,
    })
    .select(
      "id,title,product,type,canva_url,canva_page,caption,platforms,scheduled_date,status,created_by,worker_user_id,reviewer_user_id,created_at,updated_at,associated_blog_id,associated_blog:associated_blog_id(id,title,slug,site),creator:created_by(id,full_name,email),worker:worker_user_id(id,full_name,email),reviewer:reviewer_user_id(id,full_name,email)"
    )
    .maybeSingle();

  if (createError) {
    const invalidForeignKey = createError.code === "23503";
    return NextResponse.json(
      {
        error: invalidForeignKey
          ? "Assigned users are invalid. Select valid team members and try again."
          : "Couldn't create post. Please try again.",
      },
      { status: invalidForeignKey ? 400 : 500 }
    );
  }
  if (!createdRow) {
    return NextResponse.json(
      { error: "Couldn't create post. Please try again." },
      { status: 500 }
    );
  }

  await emitWorkflowSlackEvent(auth.context.adminClient, {
    eventType: "social_post_created",
    socialPostId: createdRow.id,
    title: createdRow.title || "Untitled social post",
    site: createdRow.product,
    actorUserId: auth.context.userId,
    targetUserId: workerUserId,
  });

  return NextResponse.json({ post: createdRow }, { status: 201 });
});
