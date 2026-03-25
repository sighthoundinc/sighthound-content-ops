import { useState } from 'react';
import {
  NEXT_ACTION_LABELS,
  STATUS_LABELS,
  TRANSITION_GRAPH,
  getNextAssignment,
  isBackwardTransition,
  type SocialPostStatus,
} from '@/lib/social-post-workflow';
import {
  getApiErrorMessage,
  isApiFailure,
  parseApiResponseJson,
} from '@/lib/api-response';

export interface SocialPostData {
  id: string;
  status: SocialPostStatus;
  created_by: string; // Non-null: creator is required
  editor_id: string | null;
  assigned_to_user_id: string | null;
  title: string;
  platforms: string[] | null;
  product: string | null;
  type: string | null;
  canva_url: string | null;
  canva_page: string | null;
  caption: string | null;
  scheduled_publish_date: string | null;
}

export interface UseTransitionOptions {
  currentUserId?: string;
  onSuccess?: (result: {
    success: true;
    post: {
      id: string;
      status: SocialPostStatus;
      assigned_to_user_id: string | null;
    } | null;
    nextAssignedUser: string | null;
  }) => void;
  onError?: (error: string) => void;
}

export function useSocialPostTransition(
  socialPost: SocialPostData | null,
  options: UseTransitionOptions = {}
) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAssignedToCurrentUser = () => {
    return options.currentUserId && socialPost?.assigned_to_user_id === options.currentUserId;
  };

  const canTransition = () => {
    return socialPost && isAssignedToCurrentUser();
  };

  const getAvailableTransitions = (): SocialPostStatus[] => {
    if (!socialPost) return [];
    return TRANSITION_GRAPH[socialPost.status] || [];
  };

  const getNextActionLabel = (): string => {
    if (!socialPost) return '';
    return NEXT_ACTION_LABELS[socialPost.status] || 'Continue';
  };

  const getStatusLabel = (): string => {
    if (!socialPost) return '';
    return STATUS_LABELS[socialPost.status] || socialPost.status;
  };

  const getNextAssignedUser = (nextStatus: SocialPostStatus): string | null => {
    if (!socialPost) return null;
    return getNextAssignment(nextStatus, socialPost.created_by, socialPost.editor_id);
  };

  const transitionTo = async (
    nextStatus: SocialPostStatus,
    reason?: string,
    liveLinks?: Array<{ platform: 'linkedin' | 'facebook' | 'instagram'; url: string }>,
    briefFieldUpdates?: {
      title?: string;
      product?: string;
      type?: string;
      canva_url?: string;
      canva_page?: number;
      caption?: string;
      platforms?: string[];
      scheduled_date?: string;
    }
  ): Promise<void> => {
    if (!socialPost) {
      setError('No social post loaded');
      return;
    }

    if (!canTransition()) {
      setError('You are not assigned to this post');
      return;
    }

    const allowedTransitions = getAvailableTransitions();
    if (!allowedTransitions.includes(nextStatus)) {
      setError(`Cannot transition from ${socialPost.status} to ${nextStatus}`);
      return;
    }

    if (isBackwardTransition(socialPost.status, nextStatus) && !reason?.trim()) {
      setError('Reason is required for backward transitions');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Prepare transition payload with optional brief fields
      const transitionPayload: Record<string, unknown> = {
        nextStatus,
        reason,
        liveLinks,
      };

      // Include brief field updates if provided
      if (briefFieldUpdates) {
        Object.entries(briefFieldUpdates).forEach(([key, value]) => {
          if (value !== undefined) {
            transitionPayload[key] = value;
          }
        });
      }

      const response = await fetch(`/api/social-posts/${socialPost.id}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transitionPayload),
      });

      const data = await parseApiResponseJson<{
        post?: {
          id: string;
          status: SocialPostStatus;
          assigned_to_user_id: string | null;
        } | null;
        nextAssignedUser?: string | null;
      }>(response);
      if (isApiFailure(response, data)) {
        throw new Error(getApiErrorMessage(data, 'Transition failed'));
      }

      setError(null);
      options.onSuccess?.({
        success: true,
        post: data.post ?? null,
        nextAssignedUser: data.nextAssignedUser ?? null,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      options.onError?.(message);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    error,
    isAssignedToCurrentUser: isAssignedToCurrentUser(),
    canTransition: canTransition(),
    availableTransitions: getAvailableTransitions(),
    statusLabel: getStatusLabel(),
    nextActionLabel: getNextActionLabel(),
    transitionTo,
    getNextAssignedUser,
  };
}
