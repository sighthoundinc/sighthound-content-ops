'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useAIContext } from '@/hooks/use-ai-context';

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
}

interface AIAssistantContextType {
  isOpen: boolean;
  isLoading: boolean;
  response: AIResponse | null;
  error: string | null;
  togglePanel: () => void;
  askAI: (prompt: string) => Promise<void>;
  closePanel: () => void;
  reset: () => void;
}

const AIAssistantContext = createContext<AIAssistantContextType | undefined>(undefined);

export function AIAssistantProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<AIResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const context = useAIContext();

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
    async (prompt: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/ai/assistant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt,
            context: {
              entityType: context.entityType,
              entityId: context.entityId,
              userId: context.userId,
              userRole: context.userRole,
            },
          }),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to get AI response');
        }

        const data = (await response.json()) as AIResponse;
        setResponse(data);
        setIsOpen(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    },
    [context]
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

  return (
    <AIAssistantContext.Provider
      value={{
        isOpen,
        isLoading,
        response,
        error,
        togglePanel,
        askAI,
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
