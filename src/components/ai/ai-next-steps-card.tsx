'use client';

import React, { useState } from 'react';
import { AppIcon } from '@/lib/icons';
import { useAlerts } from '@/providers/alerts-provider';

interface NextStepsCardProps {
  steps: Array<{
    step: string;
    action: string;
  }>;
}

export function AINextStepsCard({ steps }: NextStepsCardProps) {
  const { showSuccess } = useAlerts();
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    showSuccess('Copied to clipboard');
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-900 mb-3">Next Steps</h3>
      <div className="space-y-3">
        {steps.map((item, i) => (
          <div key={i} className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <p className="text-xs font-semibold text-slate-600 uppercase">{item.step}</p>
                <p className="text-sm text-slate-700 mt-1">{item.action}</p>
              </div>
              <button
                onClick={() => handleCopy(item.action, i)}
                className="flex-shrink-0 p-1 hover:bg-slate-200 rounded transition-colors"
                aria-label="Copy"
              >
                <AppIcon
                  name={copiedIndex === i ? 'check' : 'copy'}
                  size={16}
                  className={copiedIndex === i ? 'text-emerald-600' : 'text-slate-600'}
                />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}