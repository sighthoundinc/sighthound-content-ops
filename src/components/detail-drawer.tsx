"use client";

import Link from "next/link";
import { type ReactNode, useEffect, useState } from "react";

import { buttonClass } from "@/components/button";
import { cn } from "@/lib/utils";

export const DETAIL_DRAWER_WIDTH_CLASS = "w-full max-w-[460px]";

export function DetailDrawer({
  isOpen,
  onClose,
  drawerLabel,
  closeLabel = "Close details",
  widthClassName,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  drawerLabel: string;
  closeLabel?: string;
  widthClassName?: string;
  children: ReactNode;
}) {
  if (!isOpen) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        aria-label={closeLabel}
        className="detail-drawer-overlay fixed inset-0 z-30 bg-slate-900/25"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={drawerLabel}
        className={cn(
          "detail-drawer-panel fixed inset-y-0 right-0 z-40 flex h-full flex-col overflow-hidden border-l border-slate-200 bg-white shadow-2xl",
          widthClassName ?? DETAIL_DRAWER_WIDTH_CLASS
        )}
      >
        {children}
      </aside>
    </>
  );
}

export function DetailDrawerHeader({
  label = "Details",
  title,
  subtitle,
  badges,
  onClose,
}: {
  label?: string;
  title: string;
  subtitle?: string;
  badges?: ReactNode;
  onClose: () => void;
}) {
  return (
    <header className="border-b border-slate-200 bg-white px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium leading-4 tracking-wide text-slate-600">
            {label}
          </p>
          <h3 className="mt-1 text-lg font-medium leading-snug text-slate-900">{title}</h3>
          {subtitle ? <p className="mt-1 text-sm font-normal leading-5 text-slate-700">{subtitle}</p> : null}
          {badges ? <div className="mt-2 flex flex-wrap items-center gap-2">{badges}</div> : null}
        </div>
        <button
          type="button"
          className={buttonClass({ variant: "secondary", size: "sm" })}
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </header>
  );
}

export function DetailDrawerBody({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("flex-1 overflow-y-auto p-4", className)}>{children}</div>;
}

export function DetailDrawerFooter({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <footer
      className={cn(
        "border-t border-slate-200 bg-white px-4 py-3",
        className
      )}
    >
      {children}
    </footer>
  );
}

export function DetailDrawerSection({
  title,
  children,
  className,
  collapsible = false,
  defaultOpen = true,
  itemCount,
}: {
  title: string;
  children: ReactNode;
  className?: string;
  collapsible?: boolean;
  defaultOpen?: boolean;
  itemCount?: number;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const countLabel = itemCount && itemCount > 0 ? ` (${itemCount})` : "";
  const sectionTitle = `${title}${countLabel}`;

  if (!collapsible) {
    return (
      <section className={cn("rounded-lg border border-slate-200 bg-white p-3", className)}>
        <h4 className="text-xs font-medium leading-4 uppercase tracking-wide text-slate-600">{sectionTitle}</h4>
        <div className="mt-2">{children}</div>
      </section>
    );
  }

  return (
    <details
      className={cn("rounded-lg border border-slate-200 bg-white", className)}
      open={isOpen}
      onToggle={(event) => {
        setIsOpen(event.currentTarget.open);
      }}
    >
      <summary className="cursor-pointer list-none px-3 py-2 text-xs font-medium leading-4 uppercase tracking-wide text-slate-600">
        {sectionTitle}
      </summary>
      <div className="border-t border-slate-200 p-3">{children}</div>
    </details>
  );
}

export function DetailDrawerField({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium leading-4 text-slate-600">{label}</p>
      <div className="text-sm font-normal leading-5 text-slate-800">{value}</div>
    </div>
  );
}

const DETAIL_DRAWER_QUICK_ACTION_CLASS = buttonClass({
  variant: "secondary",
  size: "sm",
  className: "flex-1 justify-between gap-2 transition-colors",
});

export function DetailDrawerQuickAction({
  label,
  href,
  disabled = false,
  disabledReason,
}: {
  label: string;
  href?: string | null;
  disabled?: boolean;
  disabledReason?: string;
}) {
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    if (!isCopied) {
      return;
    }
    const timeout = window.setTimeout(() => {
      setIsCopied(false);
    }, 1200);
    return () => {
      window.clearTimeout(timeout);
    };
  }, [isCopied]);

  if (disabled || !href) {
    return (
      <div className="space-y-1">
        <span
          aria-disabled="true"
          className={cn(
            DETAIL_DRAWER_QUICK_ACTION_CLASS,
            "cursor-not-allowed opacity-50 inline-block"
          )}
        >
          <span>{label}</span>
          <span aria-hidden="true">↗</span>
        </span>
        {disabledReason ? (
          <p className="text-xs text-slate-500">{disabledReason}</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Link
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(DETAIL_DRAWER_QUICK_ACTION_CLASS, "flex-1")}
      >
        <span>{label}</span>
        <span aria-hidden="true">↗</span>
      </Link>
      <button
        type="button"
        aria-label={`Copy ${label} URL`}
        className={buttonClass({
          variant: "secondary",
          size: "sm",
          className: cn("px-2 transition-colors", isCopied && "bg-green-50 text-green-700 border-green-300"),
        })}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(href);
            setIsCopied(true);
          } catch {
            // Silent fail—user may not have permission
          }
        }}
      >
        <span aria-hidden="true">{isCopied ? "✓" : "⧉"}</span>
      </button>
    </div>
  );
}
