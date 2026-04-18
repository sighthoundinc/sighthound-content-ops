'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRightIcon, ExternalLinkIcon } from "@/lib/icons";

export interface AskAISafeLinkView {
  key: string;
  label: string;
  href: string;
  kind: 'internal' | 'external';
}

export function AILinksRow({ links }: { links: AskAISafeLinkView[] }) {
  if (!links || links.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 pt-1">
      {links.map((link) => {
        const Icon = link.kind === 'external' ? (
          <ExternalLinkIcon size={12} boxClassName="h-3.5 w-3.5" />
        ) : (
          <ArrowRightIcon size={12} boxClassName="h-3.5 w-3.5" />
        );
        const className =
          'inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2';
        if (link.kind === 'internal') {
          return (
            <Link key={link.key} href={link.href} className={className}>
              {Icon}
              <span>{link.label}</span>
            </Link>
          );
        }
        return (
          <a
            key={link.key}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className={className}
          >
            {Icon}
            <span>{link.label}</span>
          </a>
        );
      })}
    </div>
  );
}
