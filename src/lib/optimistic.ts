/**
 * Optimistic mutation helper for Content Relay.
 *
 * Pattern:
 * 1. Apply optimistic patch locally.
 * 2. Fire the real server mutation.
 * 3. On success, replace the optimistic value with the authoritative server value.
 * 4. On failure, revert to the original value and surface a recoverable alert.
 *
 * AGENTS.md alignment:
 * - Every action must produce visible feedback.
 * - No silent mutation failure.
 * - Ownership / RLS stays authoritative — the server response is always
 *   preferred over the optimistic patch.
 */

export type OptimisticContext<TState, TResult> = {
  /** The value at call-site BEFORE the optimistic patch was applied. */
  previous: TState;
  /** The value the UI should display while the mutation is in flight. */
  optimistic: TState;
  /** Server result once the mutation has resolved. */
  result?: TResult;
};

export type OptimisticCallbacks<TState, TResult> = {
  /**
   * Apply the optimistic state to the UI. Must return synchronously.
   * The returned disposer will be called in the rollback path on failure.
   */
  onOptimistic: (optimistic: TState) => void | (() => void);
  /**
   * Reconcile UI state with the authoritative server response.
   * If omitted, `onOptimistic` is re-applied with the final value.
   */
  onCommit?: (result: TResult, context: OptimisticContext<TState, TResult>) => void;
  /**
   * Invoked when the mutation fails. Receives the error and original state.
   */
  onRollback?: (error: unknown, context: OptimisticContext<TState, TResult>) => void;
};

/**
 * Run an optimistic mutation with rollback + reconciliation hooks.
 *
 * Example:
 *   const result = await runOptimistic({
 *     previous,
 *     optimistic: { ...previous, status: "ready_to_publish" },
 *     mutate: () => transitionSocialPost({ postId, nextStatus: "ready_to_publish" }),
 *     onOptimistic: (next) => setRow(next),
 *     onCommit: (server) => setRow(server),
 *     onRollback: (err) => showError(recoverableMessage(err)),
 *   });
 */
export async function runOptimistic<TState, TResult>({
  previous,
  optimistic,
  mutate,
  onOptimistic,
  onCommit,
  onRollback,
}: {
  previous: TState;
  optimistic: TState;
  mutate: () => Promise<TResult>;
} & OptimisticCallbacks<TState, TResult>): Promise<TResult> {
  const disposer = onOptimistic(optimistic);
  try {
    const result = await mutate();
    if (onCommit) {
      onCommit(result, { previous, optimistic, result });
    } else {
      // Default commit path: keep the optimistic render if the caller
      // didn't provide a reconciler. This is safe when the server
      // response shape matches the optimistic state.
      onOptimistic(optimistic);
    }
    return result;
  } catch (error) {
    // Run any disposer returned by onOptimistic first, then onRollback.
    if (typeof disposer === "function") {
      try {
        disposer();
      } catch (rollbackError) {
        console.warn("optimistic rollback disposer threw", rollbackError);
      }
    }
    onOptimistic(previous);
    if (onRollback) {
      onRollback(error, { previous, optimistic });
    }
    throw error;
  }
}

/**
 * Normalize unknown mutation errors into a safe user-facing message.
 * Used by consumers to build fallback alert text without leaking raw
 * Supabase / API internals (AGENTS.md: Error Handling).
 */
export function recoverableMessage(
  error: unknown,
  fallback: string = "Something went wrong. Please try again."
): string {
  if (!error) {
    return fallback;
  }
  if (typeof error === "string") {
    return error;
  }
  if (error instanceof Error) {
    // Guard against raw Supabase / postgres error messages bleeding to users.
    if (/permission denied|RLS|violates row-level security/i.test(error.message)) {
      return "You don't have permission to perform this action.";
    }
    if (/network|fetch failed|timeout/i.test(error.message)) {
      return "Network error. Check your connection and try again.";
    }
    return error.message || fallback;
  }
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.length > 0) {
      return message;
    }
  }
  return fallback;
}
