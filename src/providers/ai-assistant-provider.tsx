'use client';

import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { usePathname, useParams } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { getUserRoles } from '@/lib/roles';

export type AIResponseIntent =
  | 'blockers'
  | 'next_steps'
  | 'requirements'
  | 'ownership'
  | 'transition'
  | 'quality'
  | 'status'
  | 'identity'
  | 'people'
  | 'timeline'
  | 'general';

export interface AIResponse {
  currentState: string;
  blockers: Array<{
    severity: 'critical' | 'warning' | 'info';
    title: string;
    description: string;
  }>;
  nextSteps: Array<{
    step: string;
    action: string;
  }>;
  qualityIssues: Array<{
    severity: 'critical' | 'warning' | 'info';
    title: string;
    description: string;
  }>;
  canProceed: boolean;
  confidence: number;
  intent?: AIResponseIntent;
  isFactual?: boolean;
}

interface AssistantApiData {
  currentState: {
    entityType: string;
    status: string;
    userRole: string;
    isOwner: boolean;
  };
  blockers: Array<{
    type: string;
    severity: string;
    field?: string;
    message?: string;
  }>;
  nextSteps: string[];
  qualityIssues: Array<{
    type: string;
    severity: string;
    field: string;
    message: string;
  }>;
  canProceed: boolean;
  confidence: number;
  answer?: string;
  questionIntent?: AIResponseIntent;
}

const FACTUAL_INTENTS: ReadonlySet<AIResponseIntent> = new Set([
  'identity',
  'people',
  'timeline',
]);

function toTitleCase(value: string): string {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function mapSeverity(value: string): 'critical' | 'warning' | 'info' {
  if (value === 'critical' || value === 'warning' || value === 'info') {
    return value;
  }

  if (value === 'error') {
    return 'critical';
  }

  return 'info';
}

function mapApiDataToAIResponse(data: AssistantApiData): AIResponse {
  const blockers = data.blockers.map((blocker) => ({
    severity: mapSeverity(blocker.severity),
    title: blocker.field ? `${toTitleCase(blocker.field)} issue` : toTitleCase(blocker.type),
    description: blocker.message || toTitleCase(blocker.type),
  }));

  const qualityIssues = data.qualityIssues.map((issue) => ({
    severity: mapSeverity(issue.severity),
    title: issue.field ? `${toTitleCase(issue.field)} quality` : 'Quality issue',
    description: issue.message,
  }));

  const nextSteps = data.nextSteps.map((step, index) => ({
    step: `Step ${index + 1}`,
    action: step,
  }));

  const fallbackCurrentState = `Current stage: ${toTitleCase(data.currentState.status)} • ${
    data.currentState.isOwner ? 'You are assigned' : 'Another user is assigned'
  }`;

  const intent = data.questionIntent;
  const isFactual = intent ? FACTUAL_INTENTS.has(intent) : false;

  return {
    currentState: data.answer || fallbackCurrentState,
    blockers,
    nextSteps,
    qualityIssues,
    canProceed: data.canProceed,
    confidence: data.confidence / 100,
    intent,
    isFactual,
  };
}

interface AIAssistantContextType {
  isOpen: boolean;
  isLoading: boolean;
  response: AIResponse | null;
  error: string | null;
  lastPrompt: string | null;
  togglePanel: () => void;
  askAI: (prompt?: string) => Promise<void>;
  retryLast: () => Promise<void>;
  clearResponse: () => void;
  closePanel: () => void;
  reset: () => void;
}

const AIAssistantContext = createContext<AIAssistantContextType | undefined>(undefined);

export function AIAssistantProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<AIResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastPrompt, setLastPrompt] = useState<string | null>(null);
  const pathname = usePathname();
  const params = useParams();
  const { user, profile } = useAuth();
  const userRoles = profile ? getUserRoles(profile) : [];
  const userRole = userRoles.includes('admin') ? 'admin' : userRoles[0] || 'writer';

  // Detect context from current page
  const getContext = useCallback(() => {
    let entityType: 'blog' | 'social_post' | 'idea' = 'blog';
    let entityId: string | null = null;

    if (pathname?.includes('/blogs/')) {
      entityType = 'blog';
      entityId = (params?.id as string) || null;
    } else if (pathname?.includes('/social-posts/')) {
      entityType = 'social_post';
      entityId = (params?.id as string) || null;
    } else if (pathname?.includes('/ideas/')) {
      entityType = 'idea';
      entityId = (params?.id as string) || null;
    }

    return { entityType, entityId };
  }, [pathname, params]);

  const togglePanel = useCallback(() => {
    setIsOpen((prev) => !prev);
    if (isOpen) {
      // Clear response when closing
      setResponse(null);
      setError(null);
    }
  }, [isOpen]);

  const closePanel = useCallback(() => {
    setIsOpen(false);
    setResponse(null);
    setError(null);
  }, []);

  const reset = useCallback(() => {
    setIsOpen(false);
    setIsLoading(false);
    setResponse(null);
    setError(null);
  }, []);

  const askAI = useCallback(
    async (prompt?: string) => {
      if (!user?.id) {
        setError('You must be logged in to use the AI assistant');
        return;
      }

      const effectivePrompt = prompt || 'What should I do next?';
      setLastPrompt(effectivePrompt);
      setIsLoading(true);
      setError(null);
      try {
        const { entityType, entityId } = getContext();

        // Only send request if on a detail page with an entity
        if (!entityId) {
          setError('AI assistant is only available on content detail pages');
          setIsLoading(false);
          return;
        }

        // Get the user's session to send auth token
        const { data: { session } } = await (await import('@/lib/supabase/browser')).getSupabaseBrowserClient().auth.getSession();
        const headers: Record<string, string> = { 
          'Content-Type': 'application/json',
        };
        if (session?.access_token) {
          headers.Authorization = `Bearer ${session.access_token}`;
        }

        const response = await fetch('/api/ai/assistant', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            entityType,
            entityId,
            userId: user.id,
            userRole,
            prompt: effectivePrompt,
          }),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          const errorMsg = data.error?.message || data.error || 'Failed to get AI response';
          throw new Error(errorMsg);
        }

        const apiResponse = await response.json();
        // Extract the data from the API response wrapper
        const data = apiResponse?.data as AssistantApiData | undefined;
        if (!data) {
          throw new Error('Invalid response format from AI assistant');
        }

        setResponse(mapApiDataToAIResponse(data));
        setIsOpen(true);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'An error occurred';
        setError(errorMsg);
      } finally {
        setIsLoading(false);
      }
    },
    [user, getContext, userRole]
  );

  // Clear response on navigation
  useEffect(() => {
    const handleBeforeUnload = () => {
      setResponse(null);
      setError(null);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const retryLast = useCallback(async () => {
    await askAI(lastPrompt ?? undefined);
  }, [askAI, lastPrompt]);

  // Clear the current answer/error so the panel returns to the quick-prompt
  // state, without closing the panel. Powers the "Ask another question" button.
  const clearResponse = useCallback(() => {
    setResponse(null);
    setError(null);
    setIsLoading(false);
    setLastPrompt(null);
  }, []);

  return (
    <AIAssistantContext.Provider
      value={{
        isOpen,
        isLoading,
        response,
        error,
        lastPrompt,
        togglePanel,
        askAI,
        retryLast,
        clearResponse,
        closePanel,
        reset,
      }}
    >
      {children}
    </AIAssistantContext.Provider>
  );
}

export function useAIAssistant() {
  const context = useContext(AIAssistantContext);
  if (!context) {
    throw new Error('useAIAssistant must be used within AIAssistantProvider');
  }
  return context;
}
