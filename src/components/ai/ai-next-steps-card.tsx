'use client';

import { useState } from 'react';

import { Button } from '@/components/button';
import { AppIcon } from '@/lib/icons';
import { copyText } from '@/lib/clipboard';
import { useAlerts } from '@/providers/alerts-provider';

interface NextStepsCardProps {
  steps: Array<{
    step: string;
    action: string;
  }>;
}

export function AINextStepsCard({ steps }: NextStepsCardProps) {
  const { showSuccess, showError } = useAlerts();
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopy = (text: string, index: number) => {
    void copyText(text, {
      subject: 'Text',
      onSuccess: (message) => {
        setCopiedIndex(index);
        showSuccess(message);
        setTimeout(() => setCopiedIndex(null), 2000);
      },
      onError: (message) => {
        showError(message);
      },
    });
  };

  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold text-navy-500">
        Next Steps
      </h3>
      <div className="divide-y divide-[color:var(--sh-gray-200)] rounded-lg border border-[color:var(--sh-gray-200)] bg-white">
        {steps.map((item, i) => (
          <div key={i} className="group flex items-start justify-between gap-3 px-3 py-3 first:rounded-t-lg last:rounded-b-lg">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-navy-500">{item.step}</p>
              <p className="mt-1 text-sm leading-5 text-ink">{item.action}</p>
            </div>
            <Button
              type="button"
              variant="icon"
              size="icon"
              onClick={() => handleCopy(item.action, i)}
              className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
              aria-label="Copy next step"
            >
              <AppIcon
                name={copiedIndex === i ? 'check' : 'copy'}
                size={14}
                boxClassName="h-4 w-4"
                className={copiedIndex === i ? 'text-emerald-600' : undefined}
              />
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
}
