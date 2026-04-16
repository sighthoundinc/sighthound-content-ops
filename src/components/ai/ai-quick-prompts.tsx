'use client';

import React, { useState } from 'react';
import { useAIAssistant } from '@/providers/ai-assistant-provider';
import { AppIcon } from '@/lib/icons';

const QUICK_PROMPTS = [
  'What should I do next?',
  'Why can\'t I proceed?',
  'What\'s wrong with this?',
];

export function AIQuickPrompts() {
  const { askAI, isLoading } = useAIAssistant();
  const [customPrompt, setCustomPrompt] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customPrompt.trim()) {
      askAI(customPrompt.trim());
      setCustomPrompt('');
    }
  };

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
