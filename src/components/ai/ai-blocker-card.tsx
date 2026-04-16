'use client';

import React from 'react';
import { AppIcon } from '@/lib/icons';

interface BlockerCardProps {
  blocker: {
    severity: 'critical' | 'warning' | 'info';
    title: string;
    description: string;
  };
}

export function AIBlockerCard({ blocker }: BlockerCardProps) {
  const severityConfig = {
    critical: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-800',
      icon: 'alert-circle',
      color: 'text-red-600',
    },
    warning: {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      text: 'text-amber-800',
      icon: 'alert-triangle',
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

  const config = severityConfig[blocker.severity];

  return (
    <div className={`p-3 rounded-lg border ${config.bg} ${config.border}`}>
      <div className="flex gap-2">
        <AppIcon name={config.icon as any} size={16} className={`flex-shrink-0 mt-0.5 ${config.color}`} />
        <div className="flex-1">
          <h4 className={`text-sm font-medium ${config.text}`}>{blocker.title}</h4>
          <p className={`text-xs ${config.text} opacity-90`}>{blocker.description}</p>
        </div>
      </div>
    </div>
  );
}