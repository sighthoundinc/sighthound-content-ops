'use client';

import React from 'react';
import { AIResponse } from '@/providers/ai-assistant-provider';
import { AIBlockerCard } from './ai-blocker-card';
import { AIQualityCard } from './ai-quality-card';
import { AINextStepsCard } from './ai-next-steps-card';
import { AILinksRow } from './ai-links-row';
import { AIFeedback } from './ai-feedback';

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
    <div className="space-y-6">
      {showAssignee && response.assignee?.name && (
        <div className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700">
          <span className="text-slate-500">{response.assignee.role ?? 'Assigned to'}:</span>
          <span>{response.assignee.name}</span>
        </div>
      )}
      {response.currentState && (
        <div>
          {showHeading && (
            <h3 className="text-sm font-semibold text-slate-900 mb-2">Current State</h3>
          )}
          <p className="text-sm text-slate-700">{response.currentState}</p>
          {response.links.length > 0 && <AILinksRow links={response.links} />}
        </div>
      )}

      {/* Workflow sections are hidden for factual Q&A */}
      {!isFactual && response.blockers && response.blockers.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-900 mb-3">Blockers</h3>
          <div className="space-y-2">
            {response.blockers.map((blocker, i) => (
              <AIBlockerCard key={i} blocker={blocker} />
            ))}
          </div>
        </div>
      )}

      {!isFactual && response.qualityIssues && response.qualityIssues.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-900 mb-3">Quality Issues</h3>
          <div className="space-y-2">
            {response.qualityIssues.map((issue, i) => (
              <AIQualityCard key={i} issue={issue} />
            ))}
          </div>
        </div>
      )}

      {!isFactual && response.nextSteps && response.nextSteps.length > 0 && (
        <AINextStepsCard steps={response.nextSteps} />
      )}

      {showConfidence && (
        <div className="pt-4 border-t border-slate-200">
          <p className="text-xs text-slate-500">
            Confidence: {Math.round(response.confidence * 100)}%
          </p>
        </div>
      )}

      <div className="pt-3 border-t border-slate-100">
        <AIFeedback context={response.feedbackContext} />
      </div>
    </div>
  );
}
