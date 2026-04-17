"use client";

import Link from "next/link";
import { AppIcon, type AppIconName } from "@/lib/icons";
import { cn } from "@/lib/utils";

export type EmptyStateProps = {
  icon?: AppIconName;
  title: string;
  description?: string;
  /** Primary CTA (button or internal link). */
  action?: {
    label: string;
    onClick?: () => void;
    href?: string;
  };
  /** Optional secondary link — usually the user guide / docs. */
  secondary?: {
    label: string;
    href: string;
  };
  className?: string;
};

/**
 * Reusable empty-state component.
 *
 * Replace every "No data" / "Nothing here" string with <EmptyState /> to
 * deliver a single, predictable empty experience across lists, detail
 * tabs, calendar-with-no-entries, and zero-result search.
 *
 * AGENTS.md alignment:
 * - Icons come from `AppIcon` — never emoji.
 * - Internal links (same tab) via `next/link`; external links must use
 *   `ExternalLink` instead.
 * - Keyboard focusable + single primary CTA.
 */
export function EmptyState({
  icon = "info",
  title,
  description,
  action,
  secondary,
  className,
}: EmptyStateProps) {
  return (
    <div
      role="status"
      className={cn(
        "flex w-full flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-slate-200 bg-white px-6 py-10 text-center",
        className
      )}
    >
      <AppIcon
        name={icon}
        className="text-slate-400"
        boxClassName="h-10 w-10 rounded-full bg-slate-50"
        size={20}
      />
      <div className="flex flex-col gap-1">
        <p className="subsection-label text-slate-900">{title}</p>
        {description ? (
          <p className="body-text max-w-md text-slate-600">{description}</p>
        ) : null}
      </div>
      {action ? (
        action.href ? (
          <Link
            href={action.href}
            className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            {action.label}
          </Link>
        ) : (
          <button
            type="button"
            onClick={action.onClick}
            className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            {action.label}
          </button>
        )
      ) : null}
      {secondary ? (
        <Link
          href={secondary.href}
          className="text-xs text-slate-500 underline-offset-2 hover:text-slate-700 hover:underline"
        >
          {secondary.label}
        </Link>
      ) : null}
    </div>
  );
}
