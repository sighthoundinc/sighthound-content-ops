'use client';

import React from 'react';
import { useAIAssistant } from '@/providers/ai-assistant-provider';
import { AIChatPanel } from './ai-chat-panel';

/**
 * Global AI Assistant panel mount.
 *
 * Available on content detail pages (blogs, social posts, ideas) and on
 * workspace surfaces (dashboard, tasks, calendar). Hidden everywhere else so
 * the assistant never appears where it can't help.
 *
 * This mounts the panel only. The trigger lives in the AppShell header
 * (`AskAIHeaderButton`); there is deliberately no floating button, because a
 * fixed-position trigger covers whatever scrolls under it.
 */
export function AIFloatingAssistant() {
  const { entityType } = useAIAssistant();
  if (!entityType) return null;

  return <AIChatPanel />;
}
