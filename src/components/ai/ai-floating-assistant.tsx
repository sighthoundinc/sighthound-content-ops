'use client';

import React from 'react';
import { useAIAssistant } from '@/providers/ai-assistant-provider';
import { AIFloatingButton } from './ai-floating-button';
import { AIChatPanel } from './ai-chat-panel';

/**
 * Global AI Assistant.
 *
 * Visible on content detail pages (blogs, social posts, ideas) and on
 * workspace surfaces (dashboard, tasks, calendar). Hidden everywhere
 * else so the AI icon never appears where the assistant can't help.
 */
export function AIFloatingAssistant() {
  const { entityType } = useAIAssistant();
  if (!entityType) return null;

  return (
    <>
      <AIFloatingButton />
      <AIChatPanel />
    </>
  );
}
