"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

/**
 * useRealtimePresence — lightweight "who else is here?" signal.
 *
 * Subscribes to a Supabase Realtime presence channel keyed by record
 * (e.g. `presence:blog:<id>`) and returns the list of other users
 * currently viewing the same record. The caller stays the source of
 * truth for its own identity; we track it per-tab so reopening the
 * same record in another tab does not double-count.
 *
 * Contract:
 * - Presence is advisory. No mutation, no workflow authority.
 * - If Supabase Realtime is unavailable or presence fails to join,
 *   the hook returns an empty list and logs a warning \u2014 never throws.
 * - Reduced-motion has no effect (this is data, not animation).
 */

export type PresenceUser = {
  userId: string;
  name: string;
  email: string | null;
  /** ISO timestamp of the latest presence tick for this user. */
  lastSeen: string;
};

export type RealtimePresenceArgs = {
  channelKey: string | null;
  self: { id: string; name: string; email?: string | null } | null;
};

export function useRealtimePresence({
  channelKey,
  self,
}: RealtimePresenceArgs): PresenceUser[] {
  const [others, setOthers] = useState<PresenceUser[]>([]);

  useEffect(() => {
    if (!channelKey || !self?.id) {
      setOthers([]);
      return;
    }
    const supabase = getSupabaseBrowserClient();
    const channel = supabase.channel(channelKey, {
      config: { presence: { key: self.id } },
    });

    const applyPresenceState = () => {
      const raw = channel.presenceState<{
        userId: string;
        name: string;
        email?: string | null;
        joinedAt: string;
      }>();
      const merged: Record<string, PresenceUser> = {};
      for (const entries of Object.values(raw)) {
        for (const entry of entries) {
          if (!entry?.userId || entry.userId === self.id) {
            continue;
          }
          const existing = merged[entry.userId];
          const lastSeen = entry.joinedAt ?? new Date().toISOString();
          if (!existing || existing.lastSeen < lastSeen) {
            merged[entry.userId] = {
              userId: entry.userId,
              name: entry.name,
              email: entry.email ?? null,
              lastSeen,
            };
          }
        }
      }
      setOthers(Object.values(merged));
    };

    channel
      .on("presence", { event: "sync" }, applyPresenceState)
      .on("presence", { event: "join" }, applyPresenceState)
      .on("presence", { event: "leave" }, applyPresenceState)
      .subscribe(async (status) => {
        if (status !== "SUBSCRIBED") {
          return;
        }
        try {
          await channel.track({
            userId: self.id,
            name: self.name,
            email: self.email ?? null,
            joinedAt: new Date().toISOString(),
          });
        } catch (error) {
          console.warn("presence track failed", error);
        }
      });

    return () => {
      try {
        void channel.untrack();
      } catch {
        // no-op
      }
      void supabase.removeChannel(channel);
    };
  }, [channelKey, self?.email, self?.id, self?.name]);

  return others;
}

/**
 * Build a presence channel key for a record. Keep the format stable so
 * every surface that participates in presence uses the same channel.
 */
export function buildPresenceChannelKey(
  entity: "blog" | "social" | "idea",
  id: string
): string {
  return `presence:${entity}:${id}`;
}
