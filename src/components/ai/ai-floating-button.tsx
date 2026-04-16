'use client';

import React from 'react';
import { useAIAssistant } from '@/providers/ai-assistant-provider';
import { AppIcon } from '@/lib/icons';

export function AIFloatingButton() {
  const { togglePanel } = useAIAssistant();

  return (
    <button
      onClick={togglePanel}
      className="fixed bottom-6 right-6 z-40 flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-200"
      aria-label="Ask AI Assistant"
      title="Ask AI Assistant (Alt+A)"
    >
      <AppIcon name="idea" size={24} />
    </button>
  );
}