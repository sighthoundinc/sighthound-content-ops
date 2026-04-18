'use client';

import React, { useMemo, useState } from 'react';
import { useAIAssistant } from '@/providers/ai-assistant-provider';
import { ArrowRightIcon } from "@/lib/icons";

const WORKFLOW_PROMPTS = [
  'What should I do next?',
  "Why can't I proceed?",
  "What's wrong with this?",
];

const BLOG_FACTUAL_PROMPTS = [
  'What is the title of this blog?',
  'Who is the writer?',
  'When was this published?',
  'How long did it take from draft to publish?',
];

const SOCIAL_FACTUAL_PROMPTS = [
  'What is the title of this post?',
  'Who created this post?',
  'When was this scheduled?',
];

const IDEA_FACTUAL_PROMPTS = [
  'What is the title of this idea?',
  'Who submitted this idea?',
  'When was this submitted?',
];

const WORKSPACE_PROMPTS = [
  'What should I focus on today?',
  'What’s waiting on me right now?',
  'Which items are overdue?',
];

export function AIQuickPrompts() {
  const { askAI, isLoading, entityType } = useAIAssistant();
  const [customPrompt, setCustomPrompt] = useState('');

  const { workflowPrompts, factualPrompts, factualLabel } = useMemo(() => {
    if (entityType === 'blog') {
      return {
        workflowPrompts: WORKFLOW_PROMPTS,
        factualPrompts: BLOG_FACTUAL_PROMPTS,
        factualLabel: 'About this blog',
      };
    }
    if (entityType === 'social_post') {
      return {
        workflowPrompts: WORKFLOW_PROMPTS,
        factualPrompts: SOCIAL_FACTUAL_PROMPTS,
        factualLabel: 'About this post',
      };
    }
    if (entityType === 'idea') {
      return {
        workflowPrompts: [],
        factualPrompts: IDEA_FACTUAL_PROMPTS,
        factualLabel: 'About this idea',
      };
    }
    if (entityType === 'workspace') {
      return {
        workflowPrompts: WORKSPACE_PROMPTS,
        factualPrompts: [] as string[],
        factualLabel: 'About your workspace',
      };
    }
    return {
      workflowPrompts: WORKFLOW_PROMPTS,
      factualPrompts: [] as string[],
      factualLabel: 'About this record',
    };
  }, [entityType]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customPrompt.trim()) {
      askAI(customPrompt.trim());
      setCustomPrompt('');
    }
  };

  return (
    <div className="border-t border-[color:var(--sh-gray-200)] bg-[color:var(--sh-gray)]/30 px-5 py-4 space-y-4">
      {workflowPrompts.length > 0 && (
        <PromptGroup
          label="Workflow"
          prompts={workflowPrompts}
          onAsk={askAI}
          isLoading={isLoading}
        />
      )}

      {factualPrompts.length > 0 && (
        <PromptGroup
          label={factualLabel}
          prompts={factualPrompts}
          onAsk={askAI}
          isLoading={isLoading}
        />
      )}

      {/* Custom Input */}
      <form onSubmit={handleSubmit} className="flex gap-2 pt-1">
        <input
          type="text"
          value={customPrompt}
          onChange={(e) => setCustomPrompt(e.target.value)}
          placeholder="Ask anything about this…"
          disabled={isLoading}
          className="flex-1 rounded-md border border-[color:var(--sh-gray-200)] bg-white px-3 py-2 text-sm text-ink placeholder:text-navy-500/60 transition-colors hover:border-[color:var(--sh-gray-400)] focus:border-navy-500 focus:outline-none focus:ring-2 focus:ring-brand/40 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isLoading || !customPrompt.trim()}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-ink text-white transition-colors hover:bg-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Send"
        >
          <ArrowRightIcon size={16} boxClassName="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}

function PromptGroup({
  label,
  prompts,
  onAsk,
  isLoading,
}: {
  label: string;
  prompts: string[];
  onAsk: (prompt: string) => void;
  isLoading: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-navy-500">
        {label}
      </p>
      <div className="flex flex-col gap-1.5">
        {prompts.map((prompt) => (
          <button
            key={prompt}
            onClick={() => onAsk(prompt)}
            disabled={isLoading}
            className="group w-full rounded-md border border-[color:var(--sh-gray-200)] bg-white px-3 py-2 text-left text-sm text-navy-500 transition-all duration-150 ease-out hover:border-[color:var(--sh-gray-200)] hover:bg-blurple-50 hover:shadow-sm hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none motion-reduce:transform-none motion-reduce:transition-none"
          >
            <span className="inline-flex w-full items-center justify-between gap-2">
              <span className="truncate">{prompt}</span>
              <ArrowRightIcon size={12}
                boxClassName="h-3.5 w-3.5"
                className="shrink-0 text-navy-500/60 transition-colors group-hover:text-navy-500" />
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
