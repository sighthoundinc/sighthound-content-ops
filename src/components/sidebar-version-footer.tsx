"use client";

import { useAlerts } from "@/providers/alerts-provider";

/**
 * Sidebar version footer component.
 *
 * Displays the current git commit hash at the bottom of the expanded sidebar.
 * Hidden when sidebar is collapsed.
 * Allows clicking to copy the commit hash to clipboard.
 */
export function SidebarVersionFooter() {
  const commit = process.env.NEXT_PUBLIC_GIT_COMMIT || "unknown";
  const { showSuccess, showError } = useAlerts();

  const handleCopyCommit = async () => {
    try {
      await navigator.clipboard.writeText(commit);
      showSuccess("Commit hash copied");
    } catch {
      showError("Failed to copy");
    }
  };

  return (
    <div className="shrink-0 border-t border-slate-200 px-3 py-2">
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Build
        </p>
        <button
          type="button"
          onClick={handleCopyCommit}
          className="group text-left transition"
          title="Click to copy commit hash"
        >
          <code className="text-xs font-mono text-slate-600 group-hover:text-slate-800">
            {commit}
          </code>
        </button>
      </div>
    </div>
  );
}
