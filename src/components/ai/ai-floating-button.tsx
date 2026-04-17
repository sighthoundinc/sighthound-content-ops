'use client';

import React from 'react';
import { useAIAssistant } from '@/providers/ai-assistant-provider';
import { AppIcon } from '@/lib/icons';

export function AIFloatingButton() {
  const { togglePanel, isOpen } = useAIAssistant();

  return (
    <>
      <button
        onClick={togglePanel}
        aria-label="Ask AI Assistant"
        aria-expanded={isOpen}
        title="Ask AI"
        className="ai-floating-sparkle-button group fixed bottom-6 right-6 z-40 inline-flex h-11 items-center gap-2 rounded-full border border-slate-900 bg-slate-900 pl-3 pr-4 text-sm font-semibold text-white shadow-md transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 motion-reduce:transform-none motion-reduce:transition-none"
      >
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-indigo-200 transition-colors group-hover:bg-white/15 group-hover:text-indigo-100">
          <AppIcon name="sparkle" size={14} boxClassName="h-4 w-4" />
        </span>
        <span className="tracking-tight">Ask AI</span>
      </button>
      <style jsx global>{`
        .ai-floating-sparkle-button {
          animation: aiFloat 4.8s ease-in-out infinite;
        }
        @keyframes aiFloat {
          0%,
          100% {
            transform: translateY(0);
            box-shadow: 0 8px 20px rgba(15, 23, 42, 0.12);
          }
          50% {
            transform: translateY(-2px);
            box-shadow: 0 12px 28px rgba(15, 23, 42, 0.18);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .ai-floating-sparkle-button {
            animation: none !important;
          }
        }
      `}</style>
    </>
  );
}
