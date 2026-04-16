'use client';

import { usePathname, useParams } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';

export interface AIContextData {
  entityType: 'dashboard' | 'blog' | 'social_post' | 'idea' | 'tasks';
  entityId?: string;
  userId?: string;
  userRole?: string;
}

/**
 * Auto-detects AI context based on current page
 * Extracts entity type, entity ID, user ID, and user role
 */
export function useAIContext(): AIContextData {
  const pathname = usePathname();
  const params = useParams();
  const { user } = useAuth();

  const userId = user?.id;
  const userRole = user?.user_metadata?.role || 'user';

  // Detect entity type and ID from pathname
  let entityType: 'dashboard' | 'blog' | 'social_post' | 'idea' | 'tasks' = 'dashboard';
  let entityId: string | undefined;

  if (pathname?.includes('/blogs/')) {
    entityType = 'blog';
    entityId = params?.id as string;
  } else if (pathname?.includes('/social-posts/')) {
    entityType = 'social_post';
    entityId = params?.id as string;
  } else if (pathname?.includes('/ideas/')) {
    entityType = 'idea';
    entityId = params?.id as string;
  } else if (pathname?.includes('/tasks')) {
    entityType = 'tasks';
  } else if (pathname?.includes('/dashboard') || pathname === '/') {
    entityType = 'dashboard';
  }

  return {
    entityType,
    entityId,
    userId,
    userRole,
  };
}
