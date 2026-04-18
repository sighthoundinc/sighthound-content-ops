"use client";

import { useAIAssistant } from "@/providers/ai-assistant-provider";
import { SparkleIcon } from "@/lib/icons";
import { cn } from "@/lib/utils";

/**
 * <UnstickThisButton /> — detail-page shortcut into Ask AI pre-prompted
 * with the canonical "what's blocking me?" question.
 *
 * Opens the Ask AI panel with the response ready, so users don't have
 * to think about the prompt. Stays advisory \u2014 Ask AI never mutates.
 *
 * Rules:
 * - Only visible when Ask AI is available on the current surface
 *   (blog detail, social post editor, idea detail \u2014 enforced by the
 *   provider's internal `entityType` detection).
 * - Uses `useAIAssistant().askAI()` directly; does not bypass rate limits,
 *   fallback behavior, or permission checks enforced server-side.
 */

const UNSTICK_PROMPT =
  "Why can't I move this forward? Give me a short, actionable checklist of what's blocking me right now.";

export function UnstickThisButton({
  className,
  label = "Unstick this",
}: {
  className?: string;
  label?: string;
}) {
  const { entityType, askAI, isLoading } = useAIAssistant();
  if (!entityType || entityType === "workspace") {
    return null;
  }
  return (
    <button
      type="button"
      disabled={isLoading}
      onClick={() => {
        void askAI(UNSTICK_PROMPT);
      }}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border border-[color:var(--sh-blurple-100)] bg-blurple-50 px-2.5 py-1 text-xs font-medium text-blurple-800 transition hover:bg-blurple-100 disabled:cursor-not-allowed disabled:opacity-60",
        className
      )}
      title="Ask AI for a checklist of what's blocking this record"
    >
      <SparkleIcon boxClassName="h-3.5 w-3.5" size={12} />
      {isLoading ? "Thinking…" : label}
    </button>
  );
}
