"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/button";
import {
  TABLE_BASE_CLASS,
  TABLE_BODY_CLASS,
  TABLE_CONTAINER_CLASS,
  TABLE_STICKY_HEAD_CLASS,
} from "@/lib/table";

import { cn } from "@/lib/utils";

type FilterPill = {
  id: string;
  label: string;
  onRemove: () => void;
};

export function DataPageHeader({
  title,
  description,
  primaryAction,
}: {
  title: string;
  description?: string;
  primaryAction?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
        {description ? <p className="text-sm text-slate-600">{description}</p> : null}
      </div>
      {primaryAction ? <div>{primaryAction}</div> : null}
    </header>
  );
}

export function DataPageToolbar({
  searchValue,
  onSearchChange,
  searchPlaceholder,
  showSearch = true,
  filters,
  actions,
}: {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  showSearch?: boolean;
  filters?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <section className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="flex flex-wrap items-center gap-2">
        {showSearch ? (
          <label className="relative min-w-[16rem] flex-1">
            <input
              type="search"
              value={searchValue}
              onChange={(event) => {
                onSearchChange(event.target.value);
              }}
              placeholder={searchPlaceholder}
              className="focus-field w-full rounded-md border border-slate-300 bg-white px-3 py-2 pr-8 text-sm"
            />
            {searchValue.trim().length > 0 ? (
              <Button
                type="button"
                size="xs"
                variant="ghost"
                aria-label="Clear search"
                className="absolute right-1 top-1/2 -translate-y-1/2 px-1 py-0.5 text-slate-500 hover:text-slate-700"
                onClick={() => {
                  onSearchChange("");
                }}
              >
                ✕
              </Button>
            ) : null}
          </label>
        ) : null}
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {filters ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{filters}</div> : null}
    </section>
  );
}

export function DataPageFilterPills({ pills }: { pills: FilterPill[] }) {
  if (pills.length === 0) {
    return null;
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      {pills.map((pill) => (
        <span
          key={pill.id}
          className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700"
        >
          {pill.label}
          <Button
            type="button"
            size="xs"
            variant="ghost"
            aria-label={`Remove ${pill.label}`}
            className="px-1 py-0.5 text-slate-500 hover:text-slate-700"
            onClick={pill.onRemove}
          >
            ✕
          </Button>
        </span>
      ))}
    </div>
  );
}

export function DataPageTableShell({
  isLoading,
  loadingRows = 5,
  columnCount,
  tableClassName,
  header,
  children,
}: {
  isLoading: boolean;
  loadingRows?: number;
  columnCount: number;
  tableClassName?: string;
  header: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={TABLE_CONTAINER_CLASS}>
      <table className={cn(TABLE_BASE_CLASS, tableClassName)}>
        <thead className={TABLE_STICKY_HEAD_CLASS}>
          {header}
        </thead>
        <tbody className={TABLE_BODY_CLASS}>
          {isLoading
            ? Array.from({ length: loadingRows }).map((_, rowIndex) => (
                <tr key={`table-skeleton-row-${rowIndex}`}>
                  <td className="h-12 px-3 py-2 align-middle" colSpan={columnCount}>
                    <div className="skeleton h-4 w-full" />
                  </td>
                </tr>
              ))
            : children}
        </tbody>
      </table>
    </div>
  );
}

export function DataPageEmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
      <div>
        <p className="text-sm font-medium text-slate-900">{title}</p>
        <p className="text-sm text-slate-600">{description}</p>
      </div>
      {action ? <div>{action}</div> : null}
    </div>
  );
}
