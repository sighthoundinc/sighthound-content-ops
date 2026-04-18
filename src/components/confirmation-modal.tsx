"use client";

import { useEffect, type ReactNode } from "react";
import { Button } from "@/components/button";

type ConfirmationTone = "danger" | "default";

export function ConfirmationModal({
  isOpen,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  tone = "default",
  isConfirming = false,
  confirmDisabled = false,
  children,
  onCancel,
  onConfirm,
}: {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: ConfirmationTone;
  isConfirming?: boolean;
  confirmDisabled?: boolean;
  children?: ReactNode;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCancel();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onCancel]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close confirmation dialog"
        className="absolute inset-0 bg-ink/40"
        onClick={onCancel}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative w-full max-w-md rounded-xl border border-[color:var(--sh-gray-200)] bg-surface p-4 shadow-brand-lg"
      >
        <div className="flex items-start gap-3">
          <span
            className={`mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full text-sm ${
              tone === "danger"
                ? "bg-rose-100 text-rose-700"
                : "bg-blurple-100 text-blurple-700"
            }`}
          >
            {tone === "danger" ? "!" : "?"}
          </span>
          <div>
            <h3 className="text-base font-semibold text-ink">{title}</h3>
            <p className="mt-1 text-sm text-navy-500">{description}</p>
            {children ? <div className="mt-3">{children}</div> : null}
          </div>
        </div>
        <div className="mt-4 flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={onCancel}
            disabled={isConfirming}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={tone === "danger" ? "destructive" : "primary"}
            size="md"
            onClick={onConfirm}
            disabled={isConfirming || confirmDisabled}
          >
            {isConfirming ? "Working..." : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
