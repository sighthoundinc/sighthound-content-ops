type PostgrestLikeError = {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  hint?: string | null;
};

export function isMissingUserRolesColumnError(error: PostgrestLikeError | null | undefined) {
  if (!error) {
    return false;
  }
  const code = (error.code ?? "").toUpperCase();
  const text = `${error.message ?? ""} ${error.details ?? ""} ${error.hint ?? ""}`.toLowerCase();
  return (
    (code === "42703" || code === "PGRST204") &&
    text.includes("user_roles")
  );
}
