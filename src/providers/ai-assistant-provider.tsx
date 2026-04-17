'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from 'react';
import { usePathname, useParams } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { getUserRoles } from '@/lib/roles';
import type { AskAISafeLinkView } from '@/components/ai/ai-links-row';
import type { AIFeedbackContext } from '@/components/ai/ai-feedback';

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
  | 'lookup'
  | 'general'
  | 'overview'
  | 'priorities'
  | 'overdue'
  | 'ownership_map';

export type AIEntityType = 'blog' | 'social_post' | 'idea' | 'workspace';

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
  responseSource?: 'deterministic' | 'gemini';
  links: AskAISafeLinkView[];
  assignee: { name?: string; role?: string } | null;
  feedbackContext: AIFeedbackContext;
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
  responseSource?: 'deterministic' | 'gemini';
  links?: AskAISafeLinkView[];
  assignee?: { name?: string; role?: string } | null;
}

const FACTUAL_INTENTS: ReadonlySet<AIResponseIntent> = new Set([
  'identity',
  'people',
  'timeline',
  'lookup',
]);

function toTitleCase(value: string): string {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function extractErrorMessage(data: unknown): string {
  if (data && typeof data === 'object') {
    const maybeError = (data as { error?: unknown }).error;
    if (typeof maybeError === 'string' && maybeError.trim()) {
      return maybeError;
    }
    if (maybeError && typeof maybeError === 'object') {
      const msg = (maybeError as { message?: unknown }).message;
      if (typeof msg === 'string' && msg.trim()) return msg;
    }
  }
  return 'Failed to get AI response';
}

function mapSeverity(value: string): 'critical' | 'warning' | 'info' {
  if (value === 'critical' || value === 'warning' || value === 'info') return value;
  if (value === 'error') return 'critical';
  return 'info';
}

function mapApiDataToAIResponse(
  data: AssistantApiData,
  feedbackContext: AIFeedbackContext
): AIResponse {
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

  const fallbackCurrentState = `Current stage: ${toTitleCase(data.currentState.status)} \u2022 ${
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
    responseSource: data.responseSource,
    links: Array.isArray(data.links) ? data.links : [],
    assignee: data.assignee ?? null,
    feedbackContext: {
      ...feedbackContext,
      intent: intent ?? null,
      responseSource: data.responseSource ?? null,
    },
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
  entityType: AIEntityType | null;
}

const AIAssistantContext = createContext<AIAssistantContextType | undefined>(undefined);

const WORKSPACE_PATHS = ['/dashboard', '/tasks', '/calendar'];

function pageAllowsAssistant(pathname: string | null): {
  entityType: AIEntityType | null;
  entityId: string | null;
} {
  if (!pathname) return { entityType: null, entityId: null };
  if (pathname.includes('/blogs/') && !pathname.endsWith('/blogs')) {
    return { entityType: 'blog', entityId: null /* resolved via useParams */ };
  }
  if (pathname.includes('/social-posts/') && !pathname.endsWith('/social-posts')) {
    return { entityType: 'social_post', entityId: null };
  }
  if (pathname.includes('/ideas/') && !pathname.endsWith('/ideas')) {
    return { entityType: 'idea', entityId: null };
  }
  if (WORKSPACE_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return { entityType: 'workspace', entityId: null };
  }
  return { entityType: null, entityId: null };
}

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
  const userTimezone = profile?.timezone || undefined;
  const inflightRef = useRef<AbortController | null>(null);

  const getContext = useCallback((): {
    entityType: AIEntityType | null;
    entityId: string | null;
  } => {
    const base = pageAllowsAssistant(pathname);
    if (!base.entityType) return base;
    if (base.entityType === 'workspace') return { ...base, entityId: null };
    const id = (params?.id as string) || null;
    return { entityType: base.entityType, entityId: id };
  }, [pathname, params]);

  const { entityType } = getContext();

  const togglePanel = useCallback(() => {
    setIsOpen((prev) => !prev);
    if (isOpen) {
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
      const { entityType, entityId } = getContext();
      if (!entityType) {
        setError('AI assistant is not available on this page');
        return;
      }
      if (entityType !== 'workspace' && !entityId) {
        setError('AI assistant is only available on content detail pages');
        return;
      }

      const effectivePrompt =
        prompt || (entityType === 'workspace' ? 'What should I focus on today?' : 'What should I do next?');
      setLastPrompt(effectivePrompt);
      setIsLoading(true);
      setError(null);

      inflightRef.current?.abort();
      const controller = new AbortController();
      inflightRef.current = controller;

      try {
        const { data: { session } } = await (await import('@/lib/supabase/browser'))
          .getSupabaseBrowserClient()
          .auth.getSession();
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (session?.access_token) {
          headers.Authorization = `Bearer ${session.access_token}`;
        }

        const res = await fetch('/api/ai/assistant', {
          method: 'POST',
          headers,
          signal: controller.signal,
          body: JSON.stringify({
            entityType,
            entityId: entityId ?? undefined,
            userId: user.id,
            userRole,
            prompt: effectivePrompt,
            userTimezone,
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(extractErrorMessage(errData));
        }

        const apiResponse = await res.json();
        const data = apiResponse?.data as AssistantApiData | undefined;
        if (!data) throw new Error('Invalid response format from AI assistant');

        if (controller.signal.aborted) return;

        setResponse(
          mapApiDataToAIResponse(data, {
            entityType,
            entityId: entityId ?? null,
          })
        );
        setIsOpen(true);
      } catch (err) {
        if (err instanceof Error && (err.name === 'AbortError' || controller.signal.aborted)) {
          return;
        }
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        if (inflightRef.current === controller) inflightRef.current = null;
        setIsLoading(false);
      }
    },
    [user, getContext, userRole, userTimezone]
  );

  useEffect(() => {
    inflightRef.current?.abort();
    setResponse(null);
    setError(null);
    setIsLoading(false);
    setLastPrompt(null);
  }, [pathname, params?.id]);

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

  const clearResponse = useCallback(() => {
    inflightRef.current?.abort();
    setResponse(null);
    setError(null);
    setIsLoading(false);
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
        entityType,
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
