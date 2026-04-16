'use client';

import React from 'react';
import { AIFloatingButton } from './ai-floating-button';
import { AIChatPanel } from './ai-chat-panel';

/**
 * Global AI Assistant component
 * Renders the floating button + chat panel
 * Should be placed in root layout
 */
export function AIFloatingAssistant() {
  return (
    <>
      <AIFloatingButton />
      <AIChatPanel />
    </>
  );
}