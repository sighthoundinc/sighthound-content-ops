"use client";

import React from "react";

interface MarkdownCommentProps {
  content: string;
}

/**
 * Simple markdown-to-React renderer for comments.
 * Supports:
 * - **bold** and *italic*
 * - # Headings
 * - - Lists
 * - `code`
 * - [links](url)
 * - Line breaks (double space at end of line or blank lines)
 */
export function MarkdownComment({ content }: MarkdownCommentProps) {
  // Split by double newline to create paragraphs
  const paragraphs = content.split(/\n\n+/).filter((p) => p.trim());

  return (
    <div className="space-y-3 text-sm leading-relaxed">
      {paragraphs.map((para, idx) => {
        // Check if this paragraph is a list
        if (para.trim().match(/^[-*•]\s/m)) {
          return (
            <ul key={idx} className="ml-4 list-disc space-y-1">
              {para
                .split("\n")
                .filter((line) => line.trim().match(/^[-*•]\s/))
                .map((line, lidx) => (
                  <li key={lidx} className="text-slate-800">
                    <MarkdownInline
                      text={line.replace(/^[-*•]\s+/, "").trim()}
                    />
                  </li>
                ))}
            </ul>
          );
        }

        // Check if this is a heading
        const headingMatch = para.match(/^(#{1,6})\s+(.+)$/);
        if (headingMatch) {
          const level = headingMatch[1].length;
          const text = headingMatch[2];
          const headingClasses = {
            1: "text-base font-bold text-slate-900",
            2: "text-sm font-semibold text-slate-900",
            3: "text-sm font-semibold text-slate-800",
            4: "text-sm font-medium text-slate-800",
            5: "text-xs font-medium text-slate-700",
            6: "text-xs font-medium text-slate-600",
          }[level] || "text-sm font-semibold text-slate-900";

          return (
            <div key={idx} className={headingClasses}>
              <MarkdownInline text={text} />
            </div>
          );
        }

        // Regular paragraph
        return (
          <p key={idx} className="text-slate-800">
            <MarkdownInline text={para.trim()} />
          </p>
        );
      })}
    </div>
  );
}

/**
 * Inline markdown processor for text content
 * Handles bold, italic, code, and links
 */
function MarkdownInline({ text }: { text: string }) {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;

  // Pattern to match: **bold**, *italic*, `code`, [link](url)
  // We need to be careful with the order: bold before italic to avoid conflicts
  const regex =
    /\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`|\[(.+?)\]\((.+?)\)|(?:\r?\n)/g;

  let match;
  while ((match = regex.exec(text)) !== null) {
    // Add text before match
    if (match.index > lastIndex) {
      parts.push(
        <span key={`text-${lastIndex}`}>
          {text.substring(lastIndex, match.index)}
        </span>
      );
    }

    // Handle matched pattern
    if (match[1]) {
      // Bold: **text**
      parts.push(
        <strong key={`bold-${match.index}`} className="font-semibold">
          {match[1]}
        </strong>
      );
    } else if (match[2]) {
      // Italic: *text*
      parts.push(
        <em key={`italic-${match.index}`} className="italic">
          {match[2]}
        </em>
      );
    } else if (match[3]) {
      // Code: `text`
      parts.push(
        <code
          key={`code-${match.index}`}
          className="rounded-sm bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-700"
        >
          {match[3]}
        </code>
      );
    } else if (match[4] && match[5]) {
      // Link: [text](url)
      parts.push(
        <a
          key={`link-${match.index}`}
          href={match[5]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 underline hover:text-blue-700"
        >
          {match[4]}
        </a>
      );
    } else if (match[0] === "\n") {
      // Line break
      parts.push(<br key={`br-${match.index}`} />);
    }

    lastIndex = regex.lastIndex;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(
      <span key={`text-${lastIndex}`}>{text.substring(lastIndex)}</span>
    );
  }

  return <>{parts}</>;
}
