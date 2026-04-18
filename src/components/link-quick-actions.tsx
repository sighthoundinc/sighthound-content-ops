"use client";

import { useState } from "react";

import { buttonClass } from "@/components/button";
import { ExternalLink } from "@/components/external-link";
import { AppIcon, ExternalLinkIcon } from "@/lib/icons";
import { copyText, type CopySubject } from "@/lib/clipboard";
import { cn } from "@/lib/utils";
import { useAlerts } from "@/providers/alerts-provider";

export function LinkQuickActions({
  href,
  label,
  className,
  size = "sm",
}: {
  href?: string | null;
  label: string;
  className?: string;
  size?: "xs" | "sm";
}) {
  const { showError, showSuccess } = useAlerts();
  const [isCopied, setIsCopied] = useState(false);
  const trimmedHref = href?.trim() ?? "";
  const hasHref = trimmedHref.length > 0;

  return (
    <div className={cn("space-y-1", className)}>
      <p className="truncate text-xs text-navy-500" title={trimmedHref || "No link added"}>
        {trimmedHref || "No link added"}
      </p>
      <div className="flex flex-wrap items-center gap-1">
        {hasHref ? (
          <ExternalLink
            href={trimmedHref}
            className={buttonClass({
              variant: "secondary",
              size,
              className: "gap-1 no-underline",
            })}
          >
            <ExternalLinkIcon boxClassName="h-4 w-4" size={13} />
            Open
          </ExternalLink>
        ) : (
          <span
            aria-disabled="true"
            className={buttonClass({
              variant: "secondary",
              size,
              className: "gap-1 cursor-not-allowed no-underline opacity-60",
            })}
          >
            <ExternalLinkIcon boxClassName="h-4 w-4" size={13} />
            Open
          </span>
        )}
        <button
          type="button"
          disabled={!hasHref}
          className={buttonClass({
            variant: "secondary",
            size,
            className: cn("gap-1", isCopied && "border-green-300 bg-green-50 text-green-700"),
          })}
          onClick={async () => {
            if (!hasHref) {
              return;
            }
            const succeeded = await copyText(trimmedHref, {
              subject: label as CopySubject,
              onSuccess: (message) => showSuccess(message),
              onError: (message) => showError(message),
            });
            if (succeeded) {
              setIsCopied(true);
              window.setTimeout(() => {
                setIsCopied(false);
              }, 1200);
            }
          }}
        >
          <AppIcon
            name={isCopied ? "success" : "copy"}
            boxClassName="h-4 w-4"
            size={13}
          />
          Copy
        </button>
      </div>
    </div>
  );
}
