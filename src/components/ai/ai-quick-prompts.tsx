'use client';

import React, { useMemo, useState } from 'react';
import { useAIAssistant } from '@/providers/ai-assistant-provider';
import { AppIcon } from '@/lib/icons';

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
  'What\u2019s waiting on me right now?',
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
    <div className="border-t border-slate-200 px-6 py-4 space-y-3">
      {workflowPrompts.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Workflow
          </p>
          {workflowPrompts.map((prompt) => (
            <button
              key={prompt}
              onClick={() => askAI(prompt)}
              disabled={isLoading}
              className="w-full p-2 text-left text-sm bg-slate-100 hover:bg-slate-200 disabled:opacity-50 rounded transition-colors"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {factualPrompts.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            {factualLabel}
          </p>
          {factualPrompts.map((prompt) => (
            <button
              key={prompt}
              onClick={() => askAI(prompt)}
              disabled={isLoading}
              className="w-full p-2 text-left text-sm bg-slate-100 hover:bg-slate-200 disabled:opacity-50 rounded transition-colors"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* Custom Input */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={customPrompt}
          onChange={(e) => setCustomPrompt(e.target.value)}
          placeholder="Ask anything about this..."
          disabled={isLoading}
          className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded hover:border-slate-400 focus:outline-none focus:border-blue-500 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isLoading || !customPrompt.trim()}
          className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
          aria-label="Send"
        >
          <AppIcon name="arrowRight" size={18} />
        </button>
      </form>
    </div>
  );
}
