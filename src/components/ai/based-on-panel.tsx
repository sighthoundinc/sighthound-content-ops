"use client";

import { useState } from "react";
import { AppIcon, InfoIcon } from "@/lib/icons";
import { cn } from "@/lib/utils";

/**
 * <BasedOnPanel /> — collapsible "Based on" strip for Ask AI responses.
 *
 * Shows the grounded facts and curated links that Gemini (or the
 * deterministic fallback) used to produce the answer. Users can quickly
 * verify that guidance is anchored to the current record instead of a
 * hallucinated summary.
 *
 * Rules (AGENTS.md Ask AI Workflow Assistant Contract):
 * - No raw enum keys surface in UI copy.
 * - Facts come from the API response; never hallucinated.
 * - Links must come from `data.links` (safe-link curation).
 */

export type BasedOnFact = {
  label: string;
  value: string;
};

export type BasedOnLink = {
  key: string;
  label: string;
  href: string;
};

export function BasedOnPanel({
  facts,
  links,
  responseSource,
  aiModel,
  className,
  defaultOpen = false,
}: {
  facts: BasedOnFact[];
  links: BasedOnLink[];
  responseSource: "deterministic" | "gemini";
  aiModel?: string | null;
  className?: string;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  if (facts.length === 0 && links.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "rounded-md border border-slate-200 bg-slate-50/60 text-xs text-slate-700",
        className
      )}
    >
      <button
        type="button"
        onClick={() => setIsOpen((previous) => !previous)}
        className="flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 font-medium text-slate-700 hover:bg-slate-100"
        aria-expanded={isOpen}
      >
        <span className="inline-flex items-center gap-1.5">
          <InfoIcon boxClassName="h-3.5 w-3.5" size={12} />
          Based on
          <span className="text-slate-500">
            · {facts.length} facts{links.length > 0 ? ` · ${links.length} links` : ""}
          </span>
        </span>
        <AppIcon
          name={isOpen ? "chevronUp" : "chevronDown"}
          boxClassName="h-3.5 w-3.5"
          size={12}
        />
      </button>
      {isOpen ? (
        <div className="flex flex-col gap-2 border-t border-slate-200 px-3 py-2">
          {facts.length > 0 ? (
            <dl className="grid grid-cols-[120px_1fr] gap-x-3 gap-y-1">
              {facts.map((fact) => (
                <div
                  key={`${fact.label}-${fact.value}`}
                  className="contents"
                >
                  <dt className="truncate text-[11px] font-medium text-slate-500">
                    {fact.label}
                  </dt>
                  <dd className="truncate font-mono text-[11px] text-slate-800">
                    {fact.value}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}
          {links.length > 0 ? (
            <ul className="flex flex-col gap-1">
              {links.map((link) => (
                <li key={link.key}>
                  <a
                    href={link.href}
                    target={link.href.startsWith("http") ? "_blank" : undefined}
                    rel={
                      link.href.startsWith("http")
                        ? "noopener noreferrer"
                        : undefined
                    }
                    className="inline-flex items-center gap-1 text-[11px] text-slate-700 hover:text-slate-900 hover:underline"
                  >
                    <AppIcon
                      name={link.href.startsWith("http") ? "externalLink" : "link"}
                      boxClassName="h-3 w-3"
                      size={10}
                    />
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
          <p className="text-[10px] text-slate-500">
            Source:{" "}
            {responseSource === "gemini"
              ? `Gemini${aiModel ? ` · ${aiModel}` : ""}`
              : "deterministic"}
            . I guide, I don’t write.
          </p>
        </div>
      ) : null}
    </div>
  );
}
