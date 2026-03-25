import type { BlogRecord } from "@/lib/types";

export interface BulkActionPreviewModalProps {
  isOpen: boolean;
  blogs: BlogRecord[];
  changesSummary: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

/**
 * BulkActionPreviewModal - Shows affected blogs before bulk action execution
 * Requires explicit confirmation to proceed
 */
export function BulkActionPreviewModal({
  isOpen,
  blogs,
  changesSummary,
  onConfirm,
  onCancel,
  isLoading = false,
}: BulkActionPreviewModalProps) {
  if (!isOpen) return null;

  const affectedCount = blogs.length;
  const displayLimit = 10;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
        <h2 className="text-lg font-semibold text-slate-900">Review Changes</h2>
        <p className="mt-1 text-sm text-slate-600">
          This action will affect {affectedCount} blog{affectedCount !== 1 ? "s" : ""}.
        </p>

        <div className="mt-4 rounded-md bg-slate-50 p-3 text-sm">
          <p className="font-medium text-slate-900">{changesSummary}</p>
        </div>

        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Affected Blogs</p>
          <div className="mt-2 max-h-48 overflow-y-auto rounded-md border border-slate-200 bg-white p-3">
            <ul className="space-y-2">
              {blogs.slice(0, displayLimit).map((blog) => (
                <li key={blog.id} className="text-sm text-slate-700 truncate" title={blog.title}>
                  • {blog.title}
                </li>
              ))}
            </ul>
            {affectedCount > displayLimit && (
              <p className="mt-2 text-xs text-slate-500 italic">
                +{affectedCount - displayLimit} more blog{affectedCount - displayLimit !== 1 ? "s" : ""}
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            disabled={isLoading}
            className="flex-1 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isLoading}
            className="flex-1 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={onConfirm}
          >
            {isLoading ? "Applying..." : "Confirm Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
