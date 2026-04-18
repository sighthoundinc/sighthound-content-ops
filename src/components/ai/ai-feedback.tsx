'use client';

import React, { useState } from 'react';
import { SuccessIcon, WarningIcon } from "@/lib/icons";
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';

export interface AIFeedbackContext {
  entityType: string;
  entityId: string | null;
  intent?: string | null;
  responseSource?: string | null;
}

export function AIFeedback({ context }: { context: AIFeedbackContext }) {
  const [submitted, setSubmitted] = useState<'up' | 'down' | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(thumbs: 'up' | 'down') {
    if (submitting || submitted) return;
    setSubmitting(true);
    setError(null);
    try {
      const { data } = await getSupabaseBrowserClient().auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        setError('Sign in required');
        return;
      }
      const res = await fetch('/api/ai/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          entityType: context.entityType,
          entityId: context.entityId,
          intent: context.intent ?? null,
          responseSource: context.responseSource ?? null,
          thumbs,
        }),
      });
      if (!res.ok) {
        setError("Couldn't save feedback. Please try again.");
        return;
      }
      setSubmitted(thumbs);
    } catch {
      setError("Couldn't save feedback. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <p className="text-xs text-slate-500">
        Thanks for the feedback.
      </p>
    );
  }

  return (
    <div className="flex items-center gap-2 text-xs text-slate-500">
      <span>Was this helpful?</span>
      <button
        type="button"
        onClick={() => send('up')}
        disabled={submitting}
        className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition-colors hover:border-emerald-300 hover:text-emerald-600 disabled:opacity-50"
        aria-label="Helpful"
        title="Helpful"
      >
        <SuccessIcon size={12} boxClassName="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={() => send('down')}
        disabled={submitting}
        className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition-colors hover:border-rose-300 hover:text-rose-600 disabled:opacity-50"
        aria-label="Not helpful"
        title="Not helpful"
      >
        <WarningIcon size={12} boxClassName="h-3.5 w-3.5" />
      </button>
      {error && <span className="text-rose-600">{error}</span>}
    </div>
  );
}
