"use client";

import { parseISO, isBefore } from "date-fns";
import {
  PublisherStatusBadge,
  StatusBadge,
  WriterStatusBadge,
} from "./status-badge";
import { formatDisplayDate } from "@/lib/utils";
import { getSiteBadgeClasses, getSiteShortLabel } from "@/lib/site";
import { getWorkflowStage } from "@/lib/status";
import type {
  BlogRecord,
  PublisherStageStatus,
  WriterStageStatus,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  getTableBodyCellClass,
  TABLE_BASE_CLASS,
  TABLE_BODY_CLASS,
  TABLE_CONTAINER_CLASS,
  TABLE_HEAD_CLASS,
  TABLE_HEADER_CELL_CLASS,
  TABLE_STICKY_HEADER_CELL_CLASS,
} from "@/lib/table";

export type DashboardTableColumnKey =
  | "title"
  | "site"
  | "writer"
  | "writer_status"
  | "publisher"
  | "publisher_status"
  | "overall_status"
  | "publish_date";

export const DASHBOARD_COLUMN_LABELS: Record<DashboardTableColumnKey, string> = {
  title: "Title",
  site: "Site",
  writer: "Writer",
  writer_status: "Writer Status",
  publisher: "Publisher",
  publisher_status: "Publisher Status",
  overall_status: "Stage",
  publish_date: "Publish Date",
};

export const CENTER_ALIGNED_COLUMNS: DashboardTableColumnKey[] = [
  "writer_status",
  "publisher_status",
  "overall_status",
];

export interface DashboardTableProps {
  blogs: BlogRecord[];
  visibleColumns: DashboardTableColumnKey[];
  activeBlogId: string | null;
  selectedIds: Set<string>;
  rowDensity: "compact" | "comfortable";
  canSelectRows: boolean;
  canEditWritingStage: boolean;
  canEditPublishingStage: boolean;
  staleDraftDays: number;
  onRowClick: (blogId: string) => void;
  onToggleAll: (checked: boolean) => void;
  onToggleSingle: (blogId: string, checked: boolean) => void;
  onWriterStatusChange: (blog: BlogRecord, status: WriterStageStatus) => void;
  onPublisherStatusChange: (blog: BlogRecord, status: PublisherStageStatus) => void;
}


const WRITER_STATUSES: WriterStageStatus[] = [
  "not_started",
  "in_progress",
  "pending_review",
  "needs_revision",
  "completed",
];
const PUBLISHER_STATUSES: PublisherStageStatus[] = [
  "not_started",
  "in_progress",
  "pending_review",
  "completed",
];
const WRITER_STAGE_DISPLAY_LABELS: Record<WriterStageStatus, string> = {
  not_started: "Draft",
  in_progress: "Writing in Progress",
  pending_review: "Waiting for Approval",
  needs_revision: "Needs Revision",
  completed: "Writing Approved",
};
const PUBLISHER_STAGE_DISPLAY_LABELS: Record<PublisherStageStatus, string> = {
  not_started: "Not Started",
  in_progress: "Publishing in Progress",
  pending_review: "Waiting for Approval",
  completed: "Published",
};

/**
 * Dashboard table component for displaying and interacting with blog records.
 * Handles sorting, selection, status editing, and row styling.
 */
export function DashboardTable({
  blogs,
  visibleColumns,
  activeBlogId,
  selectedIds,
  rowDensity,
  canSelectRows,
  canEditWritingStage,
  canEditPublishingStage,
  staleDraftDays,
  onRowClick,
  onToggleAll,
  onToggleSingle,
  onWriterStatusChange,
  onPublisherStatusChange,
}: DashboardTableProps) {
  const bodyCellClass = getTableBodyCellClass(rowDensity);

  const allSelected = blogs.length > 0 && selectedIds.size === blogs.length;
  const someSelected = selectedIds.size > 0 && !allSelected;

  const getBlogPublishDate = (blog: BlogRecord): string | null => {
    const scheduled = blog.scheduled_publish_date;
    const published = blog.actual_published_at ?? blog.published_at;
    return scheduled || published || null;
  };

  const getBlogScheduledDate = (blog: BlogRecord): string | null => {
    return blog.scheduled_publish_date || null;
  };

  const now = new Date();

  return (
    <div className={TABLE_CONTAINER_CLASS}>
      <table className={TABLE_BASE_CLASS}>
        <thead className={TABLE_HEAD_CLASS}>
          <tr>
            {canSelectRows && (
              <th
                className={cn(
                  TABLE_HEADER_CELL_CLASS,
                  TABLE_STICKY_HEADER_CELL_CLASS
                )}
              >
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(input) => {
                    if (input) {
                      input.indeterminate = someSelected;
                    }
                  }}
                  onChange={(event) => {
                    onToggleAll(event.target.checked);
                  }}
                  aria-label="Select all visible rows"
                />
              </th>
            )}
            {visibleColumns.map((column) => (
              <th
                key={column}
                className={cn(
                  TABLE_HEADER_CELL_CLASS,
                  TABLE_STICKY_HEADER_CELL_CLASS,
                  CENTER_ALIGNED_COLUMNS.includes(column) ? "text-center" : ""
                )}
              >
                {DASHBOARD_COLUMN_LABELS[column]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className={TABLE_BODY_CLASS}>
          {blogs.length === 0 ? (
            <tr>
              <td
                className={cn(
                  bodyCellClass,
                  "text-center text-slate-500 text-sm"
                )}
                colSpan={visibleColumns.length + (canSelectRows ? 1 : 0)}
              >
                No blogs found with current filters.
              </td>
            </tr>
          ) : (
            blogs.map((blog) => {
              const displayPublishDate = getBlogPublishDate(blog);
              const scheduledPublishDate = getBlogScheduledDate(blog);
              const publishDate = scheduledPublishDate
                ? parseISO(scheduledPublishDate)
                : null;
              const publishedTimestamp =
                blog.actual_published_at ?? blog.published_at;
              const publishedDelayDays =
                scheduledPublishDate && publishedTimestamp
                  ? Math.floor(
                      (new Date(publishedTimestamp).getTime() -
                        new Date(
                          `${scheduledPublishDate}T00:00:00Z`
                        ).getTime()) /
                        (24 * 60 * 60 * 1000)
                    )
                  : null;
              const isOverdue =
                publishDate !== null &&
                isBefore(publishDate, new Date()) &&
                blog.publisher_status !== "completed";
              const isStaleDraft =
                blog.writer_status !== "completed" &&
                isBefore(
                  parseISO(blog.status_updated_at),
                  new Date(now.getTime() - staleDraftDays * 24 * 60 * 60 * 1000)
                );

              const rowWorkflowStage = getWorkflowStage({
                writerStatus: blog.writer_status,
                publisherStatus: blog.publisher_status,
              });

              const rowToneClass = isOverdue
                ? "bg-rose-50"
                : rowWorkflowStage === "ready"
                  ? "bg-amber-50"
                  : rowWorkflowStage === "publishing"
                    ? "bg-blue-50"
                    : rowWorkflowStage === "writing"
                      ? "bg-white"
                      : "bg-emerald-50/40";

              const isSelected = selectedIds.has(blog.id);

              return (
                <tr
                  key={blog.id}
                  className={cn(
                    "table-row-focus cursor-pointer",
                    activeBlogId === blog.id
                      ? "bg-slate-100"
                      : `${rowToneClass} hover:bg-slate-100`
                  )}
                  onClick={() => {
                    onRowClick(blog.id);
                  }}
                >
                  {canSelectRows && (
                    <td
                      className={bodyCellClass}
                      onClick={(event) => {
                        event.stopPropagation();
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(event) => {
                          onToggleSingle(blog.id, event.target.checked);
                        }}
                        aria-label={`Select ${blog.title}`}
                      />
                    </td>
                  )}

                  {visibleColumns.map((column) => {
                    if (column === "title") {
                      return (
                        <td
                          key={column}
                          className={cn(
                            bodyCellClass,
                            "max-w-[26rem] font-medium text-slate-900"
                          )}
                        >
                          <span className="block truncate" title={blog.title}>
                            {blog.title}
                          </span>
                        </td>
                      );
                    }

                    if (column === "site") {
                      return (
                        <td key={column} className={cn(bodyCellClass)}>
                          <span
                            className={cn(
                              "inline-flex items-center justify-center rounded-full border px-2 py-0.5 text-xs font-medium",
                              getSiteBadgeClasses(blog.site)
                            )}
                          >
                            {getSiteShortLabel(blog.site)}
                          </span>
                        </td>
                      );
                    }

                    if (column === "writer") {
                      return (
                        <td key={column} className={bodyCellClass}>
                          <span
                            className="block max-w-[10rem] truncate text-slate-600"
                            title={blog.writer?.full_name ?? "Unassigned"}
                          >
                            {blog.writer?.full_name ?? "Unassigned"}
                          </span>
                        </td>
                      );
                    }

                    if (column === "writer_status") {
                      return (
                        <td
                          key={column}
                          className={cn(bodyCellClass, "text-center")}
                        >
                          {canEditWritingStage ? (
                            <select
                              className="rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700"
                              value={blog.writer_status}
                              onClick={(event) => {
                                event.stopPropagation();
                              }}
                              onChange={(event) => {
                                event.stopPropagation();
                                onWriterStatusChange(
                                  blog,
                                  event.target.value as WriterStageStatus
                                );
                              }}
                            >
                              {WRITER_STATUSES.map((status) => (
                                <option key={status} value={status}>
                                  {WRITER_STAGE_DISPLAY_LABELS[status]}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <div className="inline-flex items-center gap-1.5">
                              <span className="text-xs text-slate-500">
                                Writer:
                              </span>
                              <WriterStatusBadge status={blog.writer_status} />
                            </div>
                          )}
                        </td>
                      );
                    }

                    if (column === "publisher") {
                      return (
                        <td key={column} className={bodyCellClass}>
                          <span
                            className="block max-w-[10rem] truncate text-slate-600"
                            title={blog.publisher?.full_name ?? "Unassigned"}
                          >
                            {blog.publisher?.full_name ?? "Unassigned"}
                          </span>
                        </td>
                      );
                    }

                    if (column === "publisher_status") {
                      return (
                        <td
                          key={column}
                          className={cn(bodyCellClass, "text-center")}
                        >
                          {canEditPublishingStage ? (
                            <select
                              className="rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700"
                              value={blog.publisher_status}
                              onClick={(event) => {
                                event.stopPropagation();
                              }}
                              onChange={(event) => {
                                event.stopPropagation();
                                onPublisherStatusChange(
                                  blog,
                                  event.target.value as PublisherStageStatus
                                );
                              }}
                            >
                              {PUBLISHER_STATUSES.map((status) => (
                                <option key={status} value={status}>
                                  {
                                    PUBLISHER_STAGE_DISPLAY_LABELS[status]
                                  }
                                </option>
                              ))}
                            </select>
                          ) : (
                            <div className="inline-flex items-center gap-1.5">
                              <span className="text-xs text-slate-500">
                                Publisher:
                              </span>
                              <PublisherStatusBadge
                                status={blog.publisher_status}
                              />
                            </div>
                          )}
                        </td>
                      );
                    }

                    if (column === "overall_status") {
                      return (
                        <td key={column} className={cn(bodyCellClass)}>
                          <div className="flex items-center justify-center gap-2">
                            <StatusBadge status={blog.overall_status} />
                            {isOverdue ? (
                              <span className="rounded bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700">
                                Overdue
                              </span>
                            ) : null}
                            {isStaleDraft ? (
                              <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                                Stale draft
                              </span>
                            ) : null}
                            {rowWorkflowStage === "published" &&
                            (publishedDelayDays ?? 0) > 0 ? (
                              <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                                ⚠ Delayed {publishedDelayDays} days
                              </span>
                            ) : null}
                          </div>
                        </td>
                      );
                    }

                    // publish_date column
                    return (
                      <td key={column} className={bodyCellClass}>
                        <span className="text-slate-600">
                          {formatDisplayDate(displayPublishDate) || "—"}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
