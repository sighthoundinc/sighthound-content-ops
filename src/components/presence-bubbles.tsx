"use client";

import { useMemo } from "react";
import type { PresenceUser } from "@/hooks/useRealtimePresence";
import { cn } from "@/lib/utils";

/**
 * <PresenceBubbles /> — compact avatar row for "who else is here?".
 *
 * Renders up to `max` initials bubbles. When more users are present,
 * adds a "+N" overflow bubble with a full list in its title tooltip.
 * Empty list renders nothing (no reserved space, no "0" pill).
 *
 * Paired with `useRealtimePresence` from `src/hooks/useRealtimePresence.ts`.
 */

const BUBBLE_PALETTE = [
  "bg-sky-100 text-sky-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-violet-100 text-violet-700",
  "bg-rose-100 text-rose-700",
  "bg-slate-200 text-slate-700",
] as const;

function initialsFor(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) {
    return "?";
  }
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) {
    return parts[0]!.slice(0, 2).toUpperCase();
  }
  return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase();
}

function paletteFor(userId: string): string {
  let hash = 0;
  for (const character of userId) {
    hash = (hash * 31 + character.charCodeAt(0)) | 0;
  }
  const index = Math.abs(hash) % BUBBLE_PALETTE.length;
  return BUBBLE_PALETTE[index]!;
}

export function PresenceBubbles({
  users,
  max = 3,
  className,
  label = "Also here",
}: {
  users: PresenceUser[];
  max?: number;
  className?: string;
  label?: string;
}) {
  const visible = useMemo(() => users.slice(0, max), [users, max]);
  const overflow = Math.max(0, users.length - visible.length);

  if (users.length === 0) {
    return null;
  }

  const tooltip = users.map((user) => user.name).join(", ");

  return (
    <div
      role="status"
      aria-label={`${label}: ${tooltip}`}
      className={cn("inline-flex items-center gap-2", className)}
    >
      <span className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <div className="flex items-center -space-x-1.5">
        {visible.map((user) => (
          <span
            key={user.userId}
            title={user.name}
            className={cn(
              "inline-flex h-6 w-6 items-center justify-center rounded-full border border-white text-[10px] font-semibold shadow-sm",
              paletteFor(user.userId)
            )}
          >
            {initialsFor(user.name)}
          </span>
        ))}
        {overflow > 0 ? (
          <span
            title={tooltip}
            className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-white bg-slate-100 text-[10px] font-semibold text-slate-600 shadow-sm"
          >
            +{overflow}
          </span>
        ) : null}
      </div>
    </div>
  );
}
