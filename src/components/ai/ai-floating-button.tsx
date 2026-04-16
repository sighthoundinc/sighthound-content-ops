'use client';

import React from 'react';
import { useAIAssistant } from '@/providers/ai-assistant-provider';
import { AppIcon } from '@/lib/icons';

export function AIFloatingButton() {
  const { togglePanel } = useAIAssistant();

  return (
    <>
      <button
        onClick={togglePanel}
        className="fixed bottom-6 right-6 z-40 flex h-10 w-10 items-center justify-center rounded-full border-2 border-blue-500 bg-white text-blue-600 shadow-md transition-all duration-500 ease-out hover:-translate-y-0.5 hover:scale-[1.03] hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2 motion-reduce:transform-none motion-reduce:transition-none"
        aria-label="Ask AI Assistant"
        title="Ask AI Assistant"
        style={{
          animation: 'aiFloat 4.8s ease-in-out infinite',
        }}
      >
        <AppIcon name="sparkle" size={16} />
      </button>
      <style jsx>{`
        @keyframes aiFloat {
          0%,
          100% {
            transform: translateY(0);
            box-shadow: 0 10px 24px rgba(37, 99, 235, 0.14);
          }
          50% {
            transform: translateY(-3px);
            box-shadow: 0 14px 30px rgba(37, 99, 235, 0.2);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          button[aria-label='Ask AI Assistant'] {
            animation: none !important;
          }
        }
      `}</style>
    </>
  );
}
