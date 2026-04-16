'use client';

import React, { useEffect } from 'react';
import { useAIAssistant } from '@/providers/ai-assistant-provider';
import { AIMessage } from './ai-message';
import { AIQuickPrompts } from './ai-quick-prompts';
import { AppIcon } from '@/lib/icons';

export function AIChatPanel() {
  const { isOpen, closePanel, response, isLoading, error } = useAIAssistant();

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        closePanel();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, closePanel]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-30 bg-black/20"
        onClick={closePanel}
      />

      {/* Panel */}
      <div
        className="fixed right-0 top-0 h-full w-96 bg-white shadow-2xl z-40 flex flex-col animate-in slide-in-from-right-full duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-2">
            <AppIcon name="idea" size={20} className="text-blue-600" />
            <h2 className="text-lg font-semibold text-slate-900">AI Assistant</h2>
          </div>
          <button
            onClick={closePanel}
            className="p-1 hover:bg-slate-100 rounded transition-colors"
            aria-label="Close"
          >
            <AppIcon name="close" size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <AppIcon
                name="loading"
                size={22}
                boxClassName="h-7 w-7"
                className="text-blue-600 animate-[spin_1.5s_linear_infinite] motion-reduce:animate-none"
              />
              <p className="text-sm text-slate-600">Analyzing...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col gap-4">
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">{error}</p>
              </div>
              <button
                onClick={closePanel}
                className="px-4 py-2 bg-slate-900 text-white rounded hover:bg-slate-800 text-sm font-medium"
              >
                Try Again
              </button>
            </div>
          ) : response ? (
            <AIMessage response={response} />
          ) : (
            <div className="text-center text-slate-500">
              <p className="text-sm">Ask a question to get started</p>
            </div>
          )}
        </div>

        {/* Quick Prompts */}
        {!response && !isLoading && <AIQuickPrompts />}
      </div>
    </>
  );
}