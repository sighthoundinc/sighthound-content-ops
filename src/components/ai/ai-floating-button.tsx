'use client';

import React from 'react';
import { useAIAssistant } from '@/providers/ai-assistant-provider';
import { AppIcon } from '@/lib/icons';

export function AIFloatingButton() {
  const { togglePanel } = useAIAssistant();

  return (
    <button
      onClick={togglePanel}
      className="fixed bottom-6 right-6 z-40 flex items-center justify-center w-12 h-12 rounded-full border-2 border-blue-500 bg-white text-blue-600 shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200"
      aria-label="Ask AI Assistant"
      title="Ask AI Assistant"
    >
      <AppIcon name="sparkle" size={20} />
    </button>
  );
}
