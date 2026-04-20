'use client';

import React, { useEffect, useState } from 'react';
import { useAIAssistant } from '@/providers/ai-assistant-provider';
import { AIMessage } from './ai-message';
import { AIQuickPrompts } from './ai-quick-prompts';
import { ChevronLeftIcon, CloseIcon, SparkleIcon, WarningIcon } from "@/lib/icons";

const LOADING_HINTS = [
  'Reading this page’s context…',
  'Cross-checking the latest updates…',
  'Drafting your guidance…',
];

export function AIChatPanel() {
  const {
    isOpen,
    closePanel,
    response,
    isLoading,
    error,
    retryLast,
    lastPrompt,
    clearResponse,
  } = useAIAssistant();

  const [hintIndex, setHintIndex] = useState(0);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) closePanel();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, closePanel]);

  // Rotate loading hints every 1.8s while analysing.
  useEffect(() => {
    if (!isLoading) {
      setHintIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setHintIndex((i) => (i + 1) % LOADING_HINTS.length);
    }, 1800);
    return () => clearInterval(interval);
  }, [isLoading]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop — subtle blur + slate tint instead of flat black */}
      <div
        className="fixed inset-0 z-30 bg-ink/30 backdrop-blur-[2px] animate-in fade-in duration-200 motion-reduce:animate-none"
        onClick={closePanel}
      />

      {/* Panel */}
      <aside
        role="dialog"
        aria-label="Ask AI"
        className="fixed right-0 top-0 h-full w-[420px] max-w-[calc(100vw-2rem)] bg-white z-40 flex flex-col border-l border-[color:var(--sh-gray-200)] shadow-[0_25px_60px_-15px_rgba(15,23,42,0.35)] animate-in slide-in-from-right duration-300 ease-out motion-reduce:animate-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <header className="flex items-center justify-between border-b border-[color:var(--sh-gray-200)] px-5 py-4 bg-gradient-to-b from-white to-[color:var(--sh-gray)]/50">
          <div className="flex items-center gap-2.5">
            <span className="relative inline-flex h-8 w-8 items-center justify-center rounded-full bg-ink text-blurple-100 shadow-inner">
              <SparkleIcon size={14} boxClassName="h-4 w-4" />
              {isLoading && (
                <span className="absolute inset-0 rounded-full ring-2 ring-blurple-300/70 animate-ping motion-reduce:hidden" />
              )}
            </span>
            <div className="flex flex-col leading-tight">
              <h2 className="text-sm font-semibold text-ink tracking-tight">
                Ask AI
              </h2>
              <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-navy-500">
                Read-only · Advisory
              </span>
            </div>
          </div>
          <button
            onClick={closePanel}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-navy-500 transition-colors hover:bg-blurple-50 hover:text-navy-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
            aria-label="Close"
          >
            <CloseIcon size={16} />
          </button>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-5 ai-panel-scroll">
          {isLoading ? (
            <LoadingState hint={LOADING_HINTS[hintIndex]} />
          ) : error ? (
            <ErrorState
              message={error}
              canRetry={!!lastPrompt}
              onRetry={() => retryLast()}
              onClose={closePanel}
            />
          ) : response ? (
            <div className="flex flex-col gap-5 animate-in fade-in-50 slide-in-from-bottom-1 duration-300 motion-reduce:animate-none">
              <AIMessage response={response} />
              <button
                onClick={clearResponse}
                className="inline-flex items-center gap-1.5 self-start rounded-md px-2 py-1 text-xs font-medium text-navy-500 transition-colors hover:bg-blurple-50 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
                aria-label="Ask another question"
              >
                <ChevronLeftIcon size={12} boxClassName="h-3.5 w-3.5" />
                Ask another question
              </button>
            </div>
          ) : (
            <EmptyState />
          )}
        </div>

        {/* Quick Prompts */}
        {!response && !isLoading && !error && <AIQuickPrompts />}
      </aside>

      <style jsx global>{`
        .ai-panel-scroll {
          scrollbar-width: thin;
          scrollbar-color: rgb(203 213 225) transparent;
        }
        .ai-panel-scroll::-webkit-scrollbar {
          width: 6px;
        }
        .ai-panel-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .ai-panel-scroll::-webkit-scrollbar-thumb {
          background-color: rgb(203 213 225);
          border-radius: 9999px;
        }
        .ai-panel-scroll::-webkit-scrollbar-thumb:hover {
          background-color: rgb(148 163 184);
        }
      `}</style>
    </>
  );
}

function LoadingState({ hint }: { hint: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
      <div className="relative flex h-12 w-12 items-center justify-center">
        <span className="absolute inset-0 rounded-full bg-ink/5 animate-ping motion-reduce:hidden" />
        <span className="relative inline-flex h-10 w-10 items-center justify-center rounded-full bg-ink text-blurple-100 shadow-sm">
          <SparkleIcon size={18}
            boxClassName="h-5 w-5"
            className="animate-pulse motion-reduce:animate-none" />
        </span>
      </div>
      <p
        key={hint}
        className="text-sm text-navy-500 animate-in fade-in duration-500 motion-reduce:animate-none"
      >
        {hint}
      </p>
    </div>
  );
}

function ErrorState({
  message,
  canRetry,
  onRetry,
  onClose,
}: {
  message: string;
  canRetry: boolean;
  onRetry: () => void;
  onClose: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 animate-in fade-in-50 duration-200">
      <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3.5">
        <WarningIcon size={16}
          boxClassName="h-4 w-4 mt-0.5"
          className="text-rose-600 shrink-0" />
        <p className="text-sm text-rose-800 leading-5">{message}</p>
      </div>
      <div className="flex items-center gap-2">
        {canRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center justify-center rounded-md bg-brand px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-blurple-700 focus-visible:outline-none focus-visible:shadow-brand-focus"
          >
            Try again
          </button>
        )}
        <button
          onClick={onClose}
          className="inline-flex items-center justify-center rounded-md border border-[color:var(--sh-gray-200)] bg-white px-3 py-2 text-sm font-medium text-navy-500 transition-colors hover:bg-blurple-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
        >
          Close
        </button>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center px-2">
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-ink to-navy-700 text-blurple-100 shadow-sm">
        <SparkleIcon size={20} boxClassName="h-5 w-5" />
      </span>
      <h3 className="mt-4 text-sm font-semibold text-ink tracking-tight">
        What can I help with?
      </h3>
      <p className="mt-1.5 max-w-[260px] text-xs leading-5 text-navy-500">
        I explain stages, blockers, ownership, and next steps using live data from this page. I don’t write content or change anything.
      </p>
    </div>
  );
}
