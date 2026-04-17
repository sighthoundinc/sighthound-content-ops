'use client';

import React from 'react';
import { AppIcon, type AppIconName } from '@/lib/icons';

interface BlockerCardProps {
  blocker: {
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
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-800',
    icon: 'info',
    color: 'text-blue-600',
  },
};

export function AIBlockerCard({ blocker }: BlockerCardProps) {
  const config = SEVERITY_CONFIG[blocker.severity] || SEVERITY_CONFIG.info;

  return (
    <div
      className={`rounded-lg border p-3 transition-shadow hover:shadow-sm ${config.bg} ${config.border}`}
    >
      <div className="flex items-start gap-2.5">
        <AppIcon
          name={config.icon}
          size={14}
          boxClassName="h-4 w-4 mt-0.5"
          className={`shrink-0 ${config.color}`}
        />
        <div className="flex-1 min-w-0">
          <h4 className={`text-sm font-semibold leading-5 ${config.text}`}>
            {blocker.title}
          </h4>
          <p className={`mt-0.5 text-xs leading-5 ${config.text} opacity-80`}>
            {blocker.description}
          </p>
        </div>
      </div>
    </div>
  );
}
