'use client';

import React from 'react';
import { AIResponse } from '@/providers/ai-assistant-provider';
import { AIBlockerCard } from './ai-blocker-card';
import { AIQualityCard } from './ai-quality-card';
import { AINextStepsCard } from './ai-next-steps-card';

interface AIMessageProps {
  response: AIResponse;
}

export function AIMessage({ response }: AIMessageProps) {
  const isFactual = !!response.isFactual;
  const answerHeading = isFactual ? 'Answer' : 'Current State';
  // Confidence is a deterministic-workflow signal. Hide it for factual
  // answers and for Gemini-authored prose (where the 99% default is misleading).
  const showConfidence =
    !isFactual && response.responseSource !== 'gemini' && response.confidence > 0;

  return (
    <div className="space-y-6">
      {/* Answer / Current State */}
      {response.currentState && (
        <div>
          <h3 className="text-sm font-semibold text-slate-900 mb-2">{answerHeading}</h3>
          <p className="text-sm text-slate-700">{response.currentState}</p>
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

      {/* Workflow confidence is not meaningful for factual or Gemini answers */}
      {showConfidence && (
        <div className="pt-4 border-t border-slate-200">
          <p className="text-xs text-slate-500">
            Confidence: {Math.round(response.confidence * 100)}%
          </p>
        </div>
      )}
    </div>
  );
}
