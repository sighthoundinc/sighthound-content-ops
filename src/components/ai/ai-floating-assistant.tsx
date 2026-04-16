'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { AIFloatingButton } from './ai-floating-button';
import { AIChatPanel } from './ai-chat-panel';

/**
 * Global AI Assistant component
 * Only visible on detail pages (blogs, social posts, ideas)
 * Hidden on dashboard, tasks, and other non-detail pages
 */
export function AIFloatingAssistant() {
  const pathname = usePathname();
  
  // Only show on detail pages that have a specific ID
  const isDetailPage = 
    pathname?.includes('/blogs/') || 
    pathname?.includes('/social-posts/') || 
    pathname?.includes('/ideas/');
  
  if (!isDetailPage) {
    return null;
  }

  return (
    <>
      <AIFloatingButton />
      <AIChatPanel />
    </>
  );
}
