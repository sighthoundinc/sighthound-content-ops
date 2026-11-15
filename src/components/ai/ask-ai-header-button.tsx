'use client';

import { useAIAssistant } from '@/providers/ai-assistant-provider';
import { SparkleIcon } from "@/lib/icons";
import { cn } from "@/lib/utils";

/**
 * Ask AI trigger, docked in the AppShell header.
 *
 * This replaces the old floating button (fixed bottom-right). A floating
 * trigger sits on top of whatever scrolls beneath it: table rows, pagination,
 * drawer footers, form submit buttons. Padding and z-index tweaks only move
 * the collision around. In the header it is part of the normal layout, so it
 * can never cover another control at any scroll position, width, or with any
 * drawer open.
 *
 * Renders nothing on pages where the assistant is not available.
 */
export function AskAIHeaderButton() {
  const { togglePanel, isOpen, entityType } = useAIAssistant();
  if (!entityType) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={togglePanel}
      aria-label="Ask AI"
      aria-expanded={isOpen}
      aria-haspopup="dialog"
      className={cn(
        "pressable inline-flex min-h-9 items-center gap-1.5 rounded-md border border-transparent bg-brand px-2.5 py-1 text-xs font-semibold text-surface hover:bg-blurple-700 focus-visible:outline-none focus-visible:shadow-brand-focus",
        isOpen ? "bg-blurple-700" : null
      )}
    >
      <SparkleIcon size={13} boxClassName="h-4 w-4" />
      <span className="hidden sm:inline">Ask AI</span>
    </button>
  );
}
