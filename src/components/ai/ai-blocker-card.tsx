'use client';

import { AppIcon, type AppIconName } from '@/lib/icons';
import { Card, type CardTone } from '@/components/card';

type Severity = 'critical' | 'warning' | 'info';

interface BlockerCardProps {
  blocker: {
    severity: Severity;
    title: string;
    description: string;
  };
}

type SeverityConfig = { tone: CardTone; icon: AppIconName; iconColor: string; textColor: string };

const SEVERITY_CONFIG: Record<Severity, SeverityConfig> = {
  critical: { tone: 'critical', icon: 'error', iconColor: 'text-red-600', textColor: 'text-red-800' },
  warning: { tone: 'warning', icon: 'warning', iconColor: 'text-amber-600', textColor: 'text-amber-800' },
  info: { tone: 'info', icon: 'info', iconColor: 'text-brand', textColor: 'text-blurple-800' },
};

export function AIBlockerCard({ blocker }: BlockerCardProps) {
  const config = SEVERITY_CONFIG[blocker.severity] ?? SEVERITY_CONFIG.info;

  return (
    <Card tone={config.tone} className="transition-shadow hover:shadow-sm">
      <div className="flex items-start gap-2.5">
        <AppIcon
          name={config.icon}
          size={14}
          boxClassName="h-4 w-4 mt-0.5"
          className={`shrink-0 ${config.iconColor}`}
        />
        <div className="min-w-0 flex-1">
          <h4 className={`text-sm font-semibold leading-5 ${config.textColor}`}>
            {blocker.title}
          </h4>
          <p className={`mt-0.5 text-xs leading-5 ${config.textColor} opacity-80`}>
            {blocker.description}
          </p>
        </div>
      </div>
    </Card>
  );
}
