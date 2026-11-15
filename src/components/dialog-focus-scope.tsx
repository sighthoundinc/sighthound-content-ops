"use client";

import { useEffect, useRef } from "react";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "summary",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

// Open dialogs, oldest first. Only the last entry (the topmost dialog)
// traps focus and answers Escape, so a confirmation over a drawer works.
const openScopes: HTMLElement[] = [];

function getFocusable(container: HTMLElement) {
  return Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
  ).filter(
    (element) =>
      element.getClientRects().length > 0 &&
      element.getAttribute("aria-hidden") !== "true"
  );
}

/**
 * Keyboard behaviour for a modal or drawer panel.
 *
 * Render as the FIRST CHILD of the panel element (the one carrying
 * `role="dialog"`). While mounted it:
 *  - moves focus into the panel (first form field, else first control);
 *  - keeps Tab / Shift+Tab inside the panel;
 *  - calls `onClose` on Escape, when provided (omit it where the owner
 *    already handles Escape);
 *  - returns focus to the element that opened the panel on unmount.
 *
 * Mount it only while the dialog is open (conditional render), so mount /
 * unmount maps to open / close.
 */
export function DialogFocusScope({ onClose }: { onClose?: () => void }) {
  const markerRef = useRef<HTMLSpanElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const container = markerRef.current?.parentElement;
    if (!container) {
      return;
    }
    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    openScopes.push(container);

    if (!container.contains(document.activeElement)) {
      const focusable = getFocusable(container);
      const preferred =
        container.querySelector<HTMLElement>("[data-autofocus]") ??
        focusable.find((element) =>
          ["INPUT", "TEXTAREA", "SELECT"].includes(element.tagName)
        ) ??
        focusable[0];
      if (preferred) {
        preferred.focus({ preventScroll: true });
      } else {
        if (!container.hasAttribute("tabindex")) {
          container.setAttribute("tabindex", "-1");
        }
        container.focus({ preventScroll: true });
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (openScopes[openScopes.length - 1] !== container) {
        return;
      }
      if (event.key === "Escape") {
        onCloseRef.current?.();
        return;
      }
      if (event.key !== "Tab") {
        return;
      }
      const focusable = getFocusable(container);
      if (focusable.length === 0) {
        event.preventDefault();
        container.focus({ preventScroll: true });
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (!container.contains(active)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
        return;
      }
      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown, true);

    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
      const index = openScopes.lastIndexOf(container);
      if (index !== -1) {
        openScopes.splice(index, 1);
      }
      if (previouslyFocused && document.contains(previouslyFocused)) {
        previouslyFocused.focus({ preventScroll: true });
      }
    };
  }, []);

  return <span ref={markerRef} hidden data-dialog-focus-scope="" />;
}
