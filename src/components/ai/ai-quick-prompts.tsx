'use client';

import React from 'react';
import { useAIAssistant } from '@/providers/ai-assistant-provider';

const QUICK_PROMPTS = [
  'What should I do next?',
  'Why can\'t I proceed?',
  'What\'s wrong with this?',
];

export function AIQuickPrompts() {
  const { askAI, isLoading } = useAIAssistant();

  return (
    <div className="border-t border-slate-200 px-6 py-4 space-y-3">
      {/* Quick Prompts */}
      <div className="space-y-2">
        {QUICK_PROMPTS.map((prompt) => (
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
    </div>
  );
}
