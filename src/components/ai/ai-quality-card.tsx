'use client';

import React from 'react';
import { AppIcon, type AppIconName } from '@/lib/icons';

interface QualityCardProps {
  issue: {
    severity: 'critical' | 'warning' | 'info';
    title: string;
    description: string;
  };
}

const SEVERITY_CONFIG: Record<string, { bg: string; border: string; text: string; icon: AppIconName; color: string }> = {
  critical: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-800',
    icon: 'error',
    color: 'text-red-600',
  },
  warning: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-800',
    icon: 'warning',
    color: 'text-amber-600',
  },
  info: {
    bg: 'bg-blurple-50',
    border: 'border-[color:var(--sh-blurple-100)]',
    text: 'text-blurple-800',
    icon: 'info',
    color: 'text-brand',
  },
};

export function AIQualityCard({ issue }: QualityCardProps) {
  const config = SEVERITY_CONFIG[issue.severity] || SEVERITY_CONFIG.info;

  return (
    <div className={`p-3 rounded-lg border ${config.bg} ${config.border}`}>
      <div className="flex gap-2">
        <AppIcon name={config.icon} size={16} className={`flex-shrink-0 mt-0.5 ${config.color}`} />
        <div className="flex-1">
          <h4 className={`text-sm font-medium ${config.text}`}>{issue.title}</h4>
          <p className={`text-xs ${config.text} opacity-90`}>{issue.description}</p>
        </div>
      </div>
    </div>
  );
}