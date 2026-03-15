"use client";

import { cn } from "@/lib/utils";

export function KbdShortcut({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <kbd
      className={cn(
        "inline-flex items-center rounded border border-slate-300 bg-white px-1.5 py-0.5 text-[11px] font-medium text-slate-600 shadow-[inset_0_-1px_0_rgba(15,23,42,0.06)]",
        className
      )}
    >
      {children}
    </kbd>
  );
}
