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
    <section className="space-y-2">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-navy-500">
        Next Steps
      </h3>
      <div className="space-y-2">
        {steps.map((item, i) => (
          <div
            key={i}
            className="group rounded-lg border border-[color:var(--sh-gray-200)] bg-white p-3 transition-shadow hover:shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-navy-500">
                  {item.step}
                </p>
                <p className="mt-1 text-sm leading-5 text-ink">{item.action}</p>
              </div>
              <button
                onClick={() => handleCopy(item.action, i)}
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-navy-500 opacity-0 transition-all group-hover:opacity-100 hover:bg-blurple-50 hover:text-navy-500 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
                aria-label="Copy"
              >
                <AppIcon
                  name={copiedIndex === i ? 'check' : 'copy'}
                  size={14}
                  boxClassName="h-4 w-4"
                  className={copiedIndex === i ? 'text-emerald-600' : undefined}
                />
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
