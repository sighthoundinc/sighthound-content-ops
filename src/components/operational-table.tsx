"use client";

import type { ReactNode } from "react";

import {
  DATA_PAGE_CONTROL_ACTION_BUTTON_CLASS,
  DATA_PAGE_CONTROL_ACTIONS_CLASS,
  DATA_PAGE_CONTROL_ROW_CLASS,
  DATA_PAGE_CONTROL_STRIP_CLASS,
  DATA_PAGE_TABLE_SECTION_CLASS,
} from "@/components/data-page";
import {
  TablePaginationControls,
  TableResultsSummary,
  TableRowLimitSelect,
} from "@/components/table-controls";
import {
  SEGMENTED_CONTROL_CLASS,
  segmentedControlItemClass,
} from "@/lib/segmented-control";
import { cn } from "@/lib/utils";
import type { TableDensity, TableRowLimit } from "@/lib/table";

export type OperationalTableActionSlots = {
  copy?: ReactNode;
  customize?: ReactNode;
  importAction?: ReactNode;
  exportAction?: ReactNode;
};

export type OperationalTableCustomizeColumn = {
  id: string;
  label: string;
  checked: boolean;
  disabled?: boolean;
  locked?: boolean;
  onToggle?: () => void;
};

export type OperationalTableCustomizeGroup = {
  label?: string;
  columns: OperationalTableCustomizeColumn[];
};

export function OperationalTableFrame({
  totalRows,
  currentPage,
  rowLimit,
  noun,
  pageCount,
  onRowLimitChange,
  onPageChange,
  actions,
  selection,
  emptyState,
  feedback,
  children,
  className,
}: {
  totalRows: number;
  currentPage: number;
  rowLimit: TableRowLimit;
  noun: string;
  pageCount: number;
  onRowLimitChange: (value: TableRowLimit) => void;
  onPageChange: (value: number) => void;
  actions?: ReactNode;
  selection?: ReactNode;
  emptyState?: ReactNode;
  feedback?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn(DATA_PAGE_TABLE_SECTION_CLASS, className)}>
      <div className={`${DATA_PAGE_CONTROL_STRIP_CLASS} relative`}>
        <div className={DATA_PAGE_CONTROL_ROW_CLASS}>
          <TableResultsSummary
            totalRows={totalRows}
            currentPage={currentPage}
            rowLimit={rowLimit}
            noun={noun}
          />
          {actions ? (
            <div className={DATA_PAGE_CONTROL_ACTIONS_CLASS}>{actions}</div>
          ) : null}
        </div>
      </div>
      {selection}
      {emptyState}
      {children}
      <div className={DATA_PAGE_CONTROL_STRIP_CLASS}>
        <div className="flex flex-wrap items-center gap-3">
          <TableRowLimitSelect value={rowLimit} onChange={onRowLimitChange} />
          <TablePaginationControls
            currentPage={currentPage}
            pageCount={pageCount}
            onPageChange={onPageChange}
          />
        </div>
      </div>
      {feedback}
    </section>
  );
}

export function OperationalTableActions({
  copy,
  customize,
  importAction,
  exportAction,
}: OperationalTableActionSlots) {
  return (
    <>
      {copy}
      {customize}
      {importAction}
      {exportAction}
    </>
  );
}

export function OperationalTableDropdown({
  label,
  variant = "secondary",
  widthClassName = "w-44",
  menuClassName,
  children,
}: {
  label: string;
  variant?: "secondary" | "primary";
  widthClassName?: string;
  menuClassName?: string;
  children: ReactNode;
}) {
  return (
    <details className="relative">
      <summary
        className={cn(
          DATA_PAGE_CONTROL_ACTION_BUTTON_CLASS,
          "cursor-pointer list-none border",
          variant === "primary"
            ? "border-brand bg-brand text-white hover:bg-blurple-700"
            : "border-[color:var(--sh-gray-200)] bg-white text-navy-500 hover:bg-blurple-50"
        )}
      >
        {label}
      </summary>
      <div
        className={cn(
          "absolute right-0 z-30 mt-1 rounded-md border border-[color:var(--sh-gray-200)] bg-white p-1 shadow-md",
          widthClassName,
          menuClassName
        )}
      >
        {children}
      </div>
    </details>
  );
}

export function OperationalTableMenuItem({
  children,
  disabled,
  onClick,
  title,
  variant = "default",
  className,
}: {
  children: ReactNode;
  disabled?: boolean;
  onClick: () => void;
  title?: string;
  variant?: "default" | "danger";
  className?: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      title={title}
      className={cn(
        "block w-full rounded px-3 py-2 text-left text-sm hover:bg-blurple-50 disabled:cursor-not-allowed disabled:opacity-60",
        variant === "danger" ? "text-rose-700 hover:bg-rose-50" : "text-navy-500",
        className
      )}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function OperationalTableSelectionBar({
  count,
  label = "selected",
  actions,
  className,
}: {
  count: number;
  label?: string;
  actions?: ReactNode;
  className?: string;
}) {
  if (count <= 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[color:var(--sh-gray-200)] bg-[color:var(--sh-gray)] px-4 py-3",
        className
      )}
    >
      <p className="text-sm text-navy-500">
        <span className="font-semibold text-ink">{count}</span> {label}
      </p>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function OperationalTableCustomizeMenu({
  groups,
  density,
  onDensityChange,
  onReset,
  resetLabel = "Reset Defaults",
  widthClassName = "w-64",
}: {
  groups: OperationalTableCustomizeGroup[];
  density: TableDensity;
  onDensityChange: (density: TableDensity) => void;
  onReset: () => void;
  resetLabel?: string;
  widthClassName?: string;
}) {
  return (
    <OperationalTableDropdown
      label="Customize"
      widthClassName={widthClassName}
      menuClassName="p-2"
    >
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-navy-500">
          Show Columns
        </p>
        <button
          type="button"
          className="pressable rounded border border-[color:var(--sh-gray-200)] bg-white px-2 py-1 text-[11px] font-medium text-navy-500 hover:bg-blurple-50"
          onClick={onReset}
        >
          {resetLabel}
        </button>
      </div>
      <div className="mt-2 flex items-center justify-between rounded border border-[color:var(--sh-gray-200)] bg-[color:var(--sh-gray)] px-2 py-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-navy-500">
          Density
        </span>
        <div className={`${SEGMENTED_CONTROL_CLASS} text-xs`}>
          <button
            type="button"
            className={segmentedControlItemClass({
              isActive: density === "compact",
              className: "px-2 py-1 text-xs",
            })}
            onClick={() => {
              onDensityChange("compact");
            }}
          >
            Compact
          </button>
          <button
            type="button"
            className={segmentedControlItemClass({
              isActive: density === "comfortable",
              className: "px-2 py-1 text-xs",
            })}
            onClick={() => {
              onDensityChange("comfortable");
            }}
          >
            Comfortable
          </button>
        </div>
      </div>
      <div className="mt-3 space-y-3">
        {groups.map((group, groupIndex) => (
          <div key={group.label ?? `group-${groupIndex}`} className="space-y-1">
            {group.label ? (
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-navy-500">
                {group.label}
              </p>
            ) : null}
            {group.columns.map((column) => (
              <label
                key={column.id}
                className={cn(
                  "inline-flex w-full items-center justify-between gap-2 rounded px-1 py-1 text-xs text-navy-500",
                  !column.locked && "hover:bg-blurple-50"
                )}
              >
                <span>{column.label}</span>
                <input
                  type="checkbox"
                  checked={column.checked}
                  disabled={column.disabled || column.locked}
                  className={column.locked ? "cursor-not-allowed" : undefined}
                  onChange={() => {
                    column.onToggle?.();
                  }}
                />
              </label>
            ))}
          </div>
        ))}
      </div>
    </OperationalTableDropdown>
  );
}
