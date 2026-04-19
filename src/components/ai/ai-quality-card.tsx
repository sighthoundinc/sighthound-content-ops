'use client';

import { AppIcon, type AppIconName } from '@/lib/icons';
import { Card, type CardTone } from '@/components/card';

type Severity = 'critical' | 'warning' | 'info';

interface QualityCardProps {
  issue: {
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

export function AIQualityCard({ issue }: QualityCardProps) {
  const config = SEVERITY_CONFIG[issue.severity] ?? SEVERITY_CONFIG.info;

  return (
    <Card tone={config.tone}>
      <div className="flex gap-2">
        <AppIcon
          name={config.icon}
          size={16}
          className={`mt-0.5 flex-shrink-0 ${config.iconColor}`}
        />
        <div className="flex-1">
          <h4 className={`text-sm font-medium ${config.textColor}`}>{issue.title}</h4>
          <p className={`text-xs opacity-90 ${config.textColor}`}>{issue.description}</p>
        </div>
      </div>
    </Card>
  );
}
