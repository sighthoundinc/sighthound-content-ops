'use client';

import React from 'react';
import { AIResponse } from '@/providers/ai-assistant-provider';
import { AIBlockerCard } from './ai-blocker-card';
import { AIQualityCard } from './ai-quality-card';
import { AINextStepsCard } from './ai-next-steps-card';
import { AILinksRow } from './ai-links-row';
import { AIFeedback } from './ai-feedback';
import { BasedOnPanel } from './based-on-panel';

interface AIMessageProps {
  response: AIResponse;
}

export function AIMessage({ response }: AIMessageProps) {
  const isFactual = !!response.isFactual;
  const showConfidence =
    !isFactual && response.responseSource !== 'gemini' && response.confidence > 0;
  // Only show the assignee pill for workflow-oriented answers — it's noise on
  // meta / identity / timeline questions where ownership isn't the subject.
  const showAssignee = !isFactual && !!response.assignee?.name;
  // Drop the "Current State" heading for conversational / factual answers;
  // the answer text stands on its own.
  const showHeading = !isFactual;

  return (
    <div className="flex flex-col gap-5">
      {showAssignee && response.assignee?.name && (
        <div className="inline-flex items-center gap-1.5 self-start rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700 shadow-sm">
          <span className="text-slate-500">{response.assignee.role ?? 'Assigned to'}:</span>
          <span className="text-slate-900">{response.assignee.name}</span>
        </div>
      )}
      {response.currentState && (
        <section className="space-y-2">
          {showHeading && (
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
              Current State
            </h3>
          )}
          <p className="text-sm leading-6 text-slate-800">{response.currentState}</p>
          {response.links.length > 0 && <AILinksRow links={response.links} />}
        </section>
      )}

      {/* Workflow sections are hidden for factual Q&A */}
      {!isFactual && response.blockers && response.blockers.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
            Blockers
          </h3>
          <div className="space-y-2">
            {response.blockers.map((blocker, i) => (
              <AIBlockerCard key={i} blocker={blocker} />
            ))}
          </div>
        </section>
      )}

      {!isFactual && response.qualityIssues && response.qualityIssues.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
            Quality Issues
          </h3>
          <div className="space-y-2">
            {response.qualityIssues.map((issue, i) => (
              <AIQualityCard key={i} issue={issue} />
            ))}
          </div>
        </section>
      )}

      {!isFactual && response.nextSteps && response.nextSteps.length > 0 && (
        <AINextStepsCard steps={response.nextSteps} />
      )}

      {response.links.length > 0 ? (
        <BasedOnPanel
          facts={[]}
          links={response.links.map((link) => ({
            key: link.key,
            label: link.label,
            href: link.href,
          }))}
          responseSource={response.responseSource ?? 'deterministic'}
          aiModel={response.aiModel ?? null}
        />
      ) : null}

      {showConfidence && (
        <div className="pt-3 border-t border-slate-100">
          <p className="text-[11px] text-slate-500">
            Confidence: {Math.round(response.confidence * 100)}%
          </p>
        </div>
      )}

      <div className="pt-3 border-t border-slate-100 flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <AIFeedback context={response.feedbackContext} />
        <ProvenanceChip
          source={response.responseSource}
          model={response.aiModel}
          fallbackReason={response.fallbackReason}
        />
      </div>
    </div>
  );
}

function ProvenanceChip({
  source,
  model,
  fallbackReason,
}: {
  source?: 'deterministic' | 'gemini';
  model?: string;
  fallbackReason?: string;
}) {
  if (!source) return null;

  const isGemini = source === 'gemini';
  const label = isGemini
    ? `via ${model ?? 'Google Gemini'}`
    : fallbackReason
      ? `Gemini skipped: ${fallbackReason}`
      : 'via deterministic fallback';
  const title = isGemini
    ? 'This response came from Google Gemini using live data from this page.'
    : fallbackReason
      ? `Falling back to the built-in rule engine because ${fallbackReason}.`
      : 'Gemini was unavailable; this response came from the built-in rule engine.';
  const dotClass = isGemini ? 'bg-emerald-500' : 'bg-amber-500';

  return (
    <span
      title={title}
      className="inline-flex items-start gap-1.5 text-[11px] font-medium text-slate-500 leading-4 break-words"
    >
      <span
        className={`mt-1 inline-block h-1.5 w-1.5 rounded-full ${dotClass} shrink-0`}
      />
      <span className="whitespace-normal">{label}</span>
    </span>
  );
}
