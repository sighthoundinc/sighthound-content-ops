"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/button";
import { EmptyState } from "@/components/empty-state";
import { CloseIcon } from "@/lib/icons";
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

export const DATA_PAGE_STACK_CLASS = "space-y-6";
export const DATA_PAGE_TABLE_SECTION_CLASS =
  "space-y-3 rounded-lg border border-[color:var(--sh-gray-200)] bg-white p-4";
export const DATA_PAGE_CONTROL_STRIP_CLASS =
  "flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[color:var(--sh-gray-200)] bg-[color:var(--sh-gray)] px-3 py-2";
export const DATA_PAGE_CONTROL_ROW_CLASS =
  "flex w-full min-w-0 flex-wrap items-center justify-between gap-3";
export const DATA_PAGE_CONTROL_ACTIONS_CLASS =
  "ml-auto flex max-w-full flex-wrap items-center justify-end gap-2";
export const DATA_PAGE_CONTROL_ACTION_BUTTON_CLASS =
  "inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium";
export const DATA_PAGE_TABLE_FEEDBACK_CLASS = "min-h-[1rem] px-1";

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
        <h2 className="text-xl font-semibold text-ink">{title}</h2>
        {description ? <p className="text-sm text-navy-500">{description}</p> : null}
      </div>
      {primaryAction ? <div>{primaryAction}</div> : null}
    </header>
  );
}

export function DataPageTableFeedback({
  isVisible,
  label = "Updating results…",
  className,
}: {
  isVisible: boolean;
  label?: string;
  className?: string;
}) {
  return (
    <div className={cn(DATA_PAGE_TABLE_FEEDBACK_CLASS, className)}>
      {isVisible ? (
        <div
          aria-live="polite"
          role="status"
          className="inline-flex items-center gap-2 text-xs text-navy-500"
        >
          <span className="h-2 w-2 animate-pulse rounded-full bg-[color:var(--sh-gray-400)]" />
          {label}
        </div>
      ) : null}
    </div>
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
    <section className="space-y-3 rounded-lg border border-[color:var(--sh-gray-200)] bg-[color:var(--sh-gray)] p-3">
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
              className="focus-field w-full rounded-md border border-[color:var(--sh-gray-200)] bg-white px-3 py-2 pr-8 text-sm"
            />
            {searchValue.trim().length > 0 ? (
              <Button
                type="button"
                size="xs"
                variant="ghost"
                aria-label="Clear search"
                className="absolute right-1 top-1/2 -translate-y-1/2 px-1 py-0.5 text-navy-500 hover:text-navy-500"
                onClick={() => {
                  onSearchChange("");
                }}
              >
                <CloseIcon boxClassName="h-4 w-4" size={13} />
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
          className="inline-flex items-center gap-1 rounded-full border border-[color:var(--sh-gray-200)] bg-white px-2 py-1 text-xs text-navy-500"
        >
          {pill.label}
          <Button
            type="button"
            size="xs"
            variant="ghost"
            aria-label={`Remove ${pill.label}`}
            className="px-1 py-0.5 text-navy-500 hover:text-navy-500"
            onClick={pill.onRemove}
          >
            <CloseIcon boxClassName="h-4 w-4" size={13} />
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
  // Keeps the DataPage call signature (action may be any ReactNode such as a
  // custom button), while delegating visual shape to the shared EmptyState
  // primitive when `action` is omitted.
  if (action) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-[color:var(--sh-gray-200)] bg-[color:var(--sh-gray)] px-4 py-3">
        <div>
          <p className="text-sm font-medium text-ink">{title}</p>
          <p className="text-sm text-navy-500">{description}</p>
        </div>
        <div>{action}</div>
      </div>
    );
  }
  return <EmptyState title={title} description={description} />;
}
