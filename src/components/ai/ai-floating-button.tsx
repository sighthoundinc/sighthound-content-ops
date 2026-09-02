'use client';

import { useAIAssistant } from '@/providers/ai-assistant-provider';
import { SparkleIcon } from "@/lib/icons";
import { buttonClass } from "@/components/button";

export function AIFloatingButton() {
  const { togglePanel, isOpen } = useAIAssistant();

  return (
    <>
      <button
        onClick={togglePanel}
        aria-label="Ask AI Assistant"
        aria-expanded={isOpen}
        className={buttonClass({
          variant: "primary",
          size: "md",
          className: `group fixed bottom-6 right-6 z-40 h-11 rounded-full pl-3 pr-4 shadow-brand-md hover:shadow-brand-lg ${
            isOpen ? "!bg-blurple-700" : ""
          }`,
        })}
      >
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/15 text-white transition-colors group-hover:bg-white/25 group-hover:text-white">
          <SparkleIcon size={14} boxClassName="h-4 w-4" />
        </span>
        <span className="tracking-tight">Ask AI</span>
      </button>
    </>
  );
}
