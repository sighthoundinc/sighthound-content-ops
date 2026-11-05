import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

export const IDEA_ENTITY_STATE_SELECT =
  "id,title,site,description,created_by,is_converted,converted_blog_id,created_at";

export function queryIdeaEntityState(
  supabase: SupabaseClient,
  ideaId: string
) {
  return supabase
    .from("blog_ideas")
    .select(IDEA_ENTITY_STATE_SELECT)
    .eq("id", ideaId)
    .maybeSingle();
}

export function getIdeaEntityCacheVersion(idea: Record<string, unknown>) {
  const versionFields = [
    "id",
    "title",
    "site",
    "description",
    "created_by",
    "is_converted",
    "converted_blog_id",
    "created_at",
  ];
  const snapshot = versionFields.map((field) => idea[field] ?? null);
  return createHash("sha256").update(JSON.stringify(snapshot)).digest("hex");
}
