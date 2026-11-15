"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { ConfirmationModal } from "@/components/confirmation-modal";

/**
 * Stops unsaved edits from being lost without warning.
 *
 * While `isDirty` is true:
 *  - in-app link clicks (sidebar, breadcrumbs, header) are held and the user
 *    is asked to keep editing or discard;
 *  - closing the tab, reloading, or leaving the site shows the browser's own
 *    "leave site?" prompt.
 *
 * Not covered: the browser Back / Forward buttons inside the app, which the
 * App Router does not let a page intercept.
 */
export function UnsavedChangesGuard({ isDirty }: { isDirty: boolean }) {
  const router = useRouter();
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  useEffect(() => {
    if (!isDirty) {
      return;
    }
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // Required by Chromium to show the prompt.
      event.returnValue = "";
    };
    const handleClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }
      const target = event.target instanceof Element ? event.target : null;
      const anchor = target?.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) {
        return;
      }
      if (anchor.target && anchor.target !== "_self") {
        return;
      }
      if (anchor.hasAttribute("download")) {
        return;
      }
      const destination = new URL(anchor.href, window.location.href);
      if (destination.origin !== window.location.origin) {
        // Leaving the site: the beforeunload prompt covers it.
        return;
      }
      if (
        destination.pathname === window.location.pathname &&
        destination.search === window.location.search
      ) {
        // Same page (e.g. "Jump to" hash links): nothing is lost.
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      setPendingHref(
        `${destination.pathname}${destination.search}${destination.hash}`
      );
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("click", handleClick, true);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("click", handleClick, true);
    };
  }, [isDirty]);

  return (
    <ConfirmationModal
      isOpen={pendingHref !== null}
      title="Discard unsaved changes?"
      description="You have changes on this page that haven’t been saved. Leaving now will discard them."
      confirmLabel="Discard changes"
      cancelLabel="Keep editing"
      tone="danger"
      onCancel={() => {
        setPendingHref(null);
      }}
      onConfirm={() => {
        const href = pendingHref;
        setPendingHref(null);
        if (href) {
          router.push(href);
        }
      }}
    />
  );
}
