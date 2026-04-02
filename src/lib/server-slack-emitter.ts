import { createAdminClient } from "@/lib/supabase/server";

export type SlackWorkflowEventType =
  | "blog_created"
  | "writer_assigned"
  | "writer_completed"
  | "ready_to_publish"
  | "published"
  | "blog_publish_overdue"
  | "social_post_created"
  | "social_submitted_for_review"
  | "social_changes_requested"
  | "social_creative_approved"
  | "social_ready_to_publish"
  | "social_awaiting_live_link"
  | "social_published"
  | "social_live_link_reminder"
  | "social_review_overdue"
  | "social_publish_overdue";

type AdminClient = ReturnType<typeof createAdminClient>;

type EmitWorkflowSlackEventInput = {
  eventType: SlackWorkflowEventType;
  blogId?: string | null;
  socialPostId?: string | null;
  title: string;
  site: string;
  actorName?: string | null;
  actorUserId?: string | null;
  targetUserName?: string | null;
  targetUserNames?: string[] | null;
  targetUserId?: string | null;
  targetUserIds?: Array<string | null | undefined>;
};

const ROLE_LABELS = new Set([
  "writer",
  "publisher",
  "editor",
  "social editor",
  "admin",
]);

function normalizeDisplayName(value: string | null | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  if (ROLE_LABELS.has(trimmed.toLowerCase())) {
    return null;
  }
  return trimmed;
}

function normalizeDisplayNameList(values: Array<string | null | undefined>) {
  const normalized: string[] = [];
  for (const value of values) {
    const candidate = normalizeDisplayName(value);
    if (!candidate || normalized.includes(candidate)) {
      continue;
    }
    normalized.push(candidate);
  }
  return normalized;
}

async function resolveNameByUserId(adminClient: AdminClient, userIds: string[]) {
  if (userIds.length === 0) {
    return new Map<string, string>();
  }

  const { data: profileRows, error } = await adminClient
    .from("profiles")
    .select("id,full_name")
    .in("id", userIds);

  if (error) {
    console.warn("[emitWorkflowSlackEvent] failed to resolve profile names", error.message);
    return new Map<string, string>();
  }

  const nameByUserId = new Map<string, string>();
  for (const row of profileRows ?? []) {
    if (typeof row.id !== "string" || typeof row.full_name !== "string") {
      continue;
    }
    nameByUserId.set(row.id, row.full_name);
  }
  return nameByUserId;
}

export async function emitWorkflowSlackEvent(
  adminClient: AdminClient,
  input: EmitWorkflowSlackEventInput
) {
  const blogId = typeof input.blogId === "string" && input.blogId.trim().length > 0
    ? input.blogId
    : undefined;
  const socialPostId =
    typeof input.socialPostId === "string" && input.socialPostId.trim().length > 0
      ? input.socialPostId
      : undefined;

  if (!blogId && !socialPostId) {
    console.warn("[emitWorkflowSlackEvent] missing content id", input.eventType);
    return;
  }

  const profileIds = Array.from(
    new Set(
      [
        input.actorUserId,
        input.targetUserId,
        ...(input.targetUserIds ?? []),
      ].filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    )
  );

  const nameByUserId = await resolveNameByUserId(adminClient, profileIds);
  const actorName =
    normalizeDisplayName(input.actorName) ??
    normalizeDisplayName(input.actorUserId ? nameByUserId.get(input.actorUserId) : undefined) ??
    "Team";

  const explicitTargetNames = normalizeDisplayNameList(input.targetUserNames ?? []);
  const resolvedTargetNames = normalizeDisplayNameList(
    (input.targetUserIds ?? []).map((userId) =>
      typeof userId === "string" ? nameByUserId.get(userId) : null
    )
  );
  const targetUserNames =
    explicitTargetNames.length > 0 ? explicitTargetNames : resolvedTargetNames;
  const targetUserName =
    normalizeDisplayName(input.targetUserName) ??
    (targetUserNames.length > 0 ? targetUserNames[0] : null) ??
    normalizeDisplayName(input.targetUserId ? nameByUserId.get(input.targetUserId) : undefined) ??
    "Team";

  try {
    await adminClient.functions.invoke("slack-notify", {
      body: {
        eventType: input.eventType,
        blogId,
        socialPostId,
        title: input.title,
        site: input.site,
        actorName,
        targetUserName,
        targetUserNames: targetUserNames.length > 0 ? targetUserNames : undefined,
        appUrl: process.env.NEXT_PUBLIC_APP_URL,
      },
    });
  } catch (error) {
    console.warn("[emitWorkflowSlackEvent] Slack notify failed (non-critical)", error);
  }
}
