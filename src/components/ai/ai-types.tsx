export interface AIContext {
  entityType: 'dashboard' | 'blog' | 'social_post' | 'idea' | 'tasks';
  entityId?: string;
  userId?: string;
  userRole?: 'admin' | 'writer' | 'publisher' | 'editor';
}

export interface AIBlocker {
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
}

export interface AIQualityIssue {
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
}

export interface AINextStep {
  step: string;
  action: string;
}