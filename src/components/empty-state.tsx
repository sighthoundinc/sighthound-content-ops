"use client";

import Link from "next/link";
import { Button, buttonClass } from "@/components/button";
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
        "flex w-full flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-[color:var(--sh-gray-200)] bg-white px-6 py-12 text-center",
        className
      )}
    >
      <AppIcon
        name={icon}
        className="text-brand"
        boxClassName="h-11 w-11 rounded-lg border border-[color:var(--sh-blurple-100)] bg-blurple-50"
        size={20}
      />
      <div className="flex flex-col gap-1">
        <p className="subsection-label text-ink">{title}</p>
        {description ? (
          <p className="body-text max-w-md text-navy-500">{description}</p>
        ) : null}
      </div>
      {action ? (
        action.href ? (
          <Link
            href={action.href}
            className={buttonClass({ variant: "primary", size: "sm" })}
          >
            {action.label}
          </Link>
        ) : (
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={action.onClick}
          >
            {action.label}
          </Button>
        )
      ) : null}
      {secondary ? (
        <Link
          href={secondary.href}
          className="text-xs text-navy-500 underline-offset-2 hover:text-navy-500 hover:underline"
        >
          {secondary.label}
        </Link>
      ) : null}
    </div>
  );
}
