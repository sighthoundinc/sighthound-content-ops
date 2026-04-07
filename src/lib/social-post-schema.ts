import type { PostgrestError } from "@supabase/supabase-js";

export const SOCIAL_TASK_SELECT_WITH_OWNERSHIP =
  "id,title,status,scheduled_date,created_at,created_by,worker_user_id,reviewer_user_id,assigned_to_user_id,editor_user_id,admin_owner_id";

export const SOCIAL_TASK_SELECT_LEGACY =
  "id,title,status,scheduled_date,created_at,created_by,worker_user_id,reviewer_user_id";

export function isMissingSocialOwnershipColumnsError(
  error: Pick<PostgrestError, "code" | "message" | "details" | "hint"> | null | undefined
) {
  if (!error) {
    return false;
  }
  const code = (error.code ?? "").toUpperCase();
  const text = `${error.message ?? ""} ${error.details ?? ""} ${error.hint ?? ""}`.toLowerCase();
  const referencesOwnershipColumn =
    text.includes("assigned_to_user_id") ||
    text.includes("editor_user_id") ||
    text.includes("admin_owner_id");
  const isMissingColumnSignal =
    code === "42703" ||
    code === "PGRST204" ||
    text.includes("schema cache") ||
    text.includes("does not exist") ||
    text.includes("could not find") ||
    text.includes("unexpected input: ,assigned_to_user_id");
  return referencesOwnershipColumn && isMissingColumnSignal;
}
