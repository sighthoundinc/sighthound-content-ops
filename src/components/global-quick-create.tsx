"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Routes "create" commands from the command palette to the matching flow.
 *
 * This used to also render its own Quick Create modal and listen for the
 * quick-create key, duplicating the permission-aware modal in `AppShell`
 * (both answered the same shortcut and raced through `modal-state`).
 * `AppShell` now owns the modal and the shortcut; this component is only
 * the palette bridge and renders nothing.
 */
export function GlobalQuickCreate() {
  const router = useRouter();

  useEffect(() => {
    const handleCreateCommand = (event: Event) => {
      const customEvent = event as CustomEvent<{ command?: { id?: string } }>;
      const commandId = customEvent.detail?.command?.id;
      if (commandId === "create-blog") {
        router.push("/blogs/new");
        return;
      }
      if (commandId === "create-social-post") {
        router.push("/social-posts?create=1");
        return;
      }
      if (commandId === "create-idea") {
        router.push("/ideas");
      }
    };
    window.addEventListener("create-command", handleCreateCommand as EventListener);
    return () => {
      window.removeEventListener("create-command", handleCreateCommand as EventListener);
    };
  }, [router]);

  return null;
}
