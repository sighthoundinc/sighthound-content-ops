"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";

import { AppShell } from "@/components/app-shell";
import { AssociatedSocialPostsSection } from "@/components/associated-social-posts-section";
import { BlogDetailsDrawer } from "@/components/blog-details-drawer";
import { BlogImportModal } from "@/components/blog-import-modal";
import { BulkActionPreviewModal } from "@/components/bulk-action-preview-modal";
import { Button } from "@/components/button";
import { CheckboxMultiSelect } from "@/components/checkbox-multi-select";
import { ColumnEditor } from "@/components/column-editor";
import { DashboardTable } from "@/components/dashboard-table";
import { DetailDrawerField } from "@/components/detail-drawer";
import { Tooltip } from "@/components/tooltip";
import {
  DATA_PAGE_CONTROL_ACTION_BUTTON_CLASS,
  DATA_PAGE_CONTROL_ACTIONS_CLASS,
  DATA_PAGE_CONTROL_ROW_CLASS,
  DATA_PAGE_CONTROL_STRIP_CLASS,
  DATA_PAGE_STACK_CLASS,
  DataPageEmptyState,
  DataPageFilterPills,
  DataPageHeader,
  DataPageTableFeedback,
  DataPageToolbar,
} from "@/components/data-page";
import { LinkQuickActions } from "@/components/link-quick-actions";
import { KbdShortcut } from "@/components/kbd-shortcut";
import { ProtectedPage } from "@/components/protected-page";
import {
  PublisherStatusBadge,
  StatusBadge,
  WorkflowStageBadge,
  WriterStatusBadge,
} from "@/components/status-badge";
import {
  TablePaginationControls,
  TableResultsSummary,
  TableRowLimitSelect,
} from "@/components/table-controls";
import {
  BLOG_SELECT_LEGACY_WITH_RELATIONS,
  BLOG_SELECT_WITH_DATES_WITH_RELATIONS,
  getBlogPublishDate,
  getBlogScheduledDate,
  isMissingBlogDateColumnsError,
  normalizeBlogRow,
  normalizeBlogRows,
} from "@/lib/blog-schema";
import {
  isMissingSocialOwnershipColumnsError,
} from "@/lib/social-post-schema";
import {
  canTransitionPublisherStatus,
  canTransitionWriterStatus,
} from "@/lib/permissions";
import { createUiPermissionContract } from "@/lib/permissions/uiPermissions";
import {
  SEGMENTED_CONTROL_CLASS,
  segmentedControlItemClass,
} from "@/lib/segmented-control";
import {
  OVERALL_STATUSES,
  PUBLISHER_STATUS_LABELS,
  PUBLISHER_STATUSES,
  SOCIAL_POST_STATUSES,
  SITES,
  STATUS_LABELS,
  getWorkflowStage,
  WRITER_STATUS_LABELS,
  WRITER_STATUSES,
} from "@/lib/status";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  DEFAULT_TABLE_ROW_LIMIT,
  TABLE_ROW_LIMIT_OPTIONS,
  getTablePageCount,
  getTablePageRows,
  type SortDirection,
  type TableRowLimit,
} from "@/lib/table";
import {
  getMixedContentLabel,
  MIXED_CONTENT_FILTER_LABELS,
  MIXED_CONTENT_FILTER_OPTIONS,
  matchesMixedContentFilters,
  type MixedContentFilterValue,
} from "@/lib/content-classification";
import { getSiteBadgeClasses, getSiteLabel, getSiteShortLabel } from "@/lib/site";
import { MAIN_CREATE_SHORTCUTS } from "@/lib/shortcuts";
import { AppIcon } from "@/lib/icons";
import type {
  BlogSite,
  BlogHistoryRecord,
  BlogRecord,
  OverallBlogStatus,
  ProfileRecord,
  PublisherStageStatus,
  SocialPostType,
  SocialPostStatus,
  WriterStageStatus,
} from "@/lib/types";
import { formatDateInput, formatDateOnly, toTitleCase } from "@/lib/utils";
import { formatDateInTimezone } from "@/lib/format-date";
import {
  formatActivityChangeDescription,
  formatActivityEventTitle,
} from "@/lib/activity-history-format";
import {
  getApiErrorMessage,
  isApiFailure,
  parseApiResponseJson,
} from "@/lib/api-response";
import { useAuth } from "@/providers/auth-provider";
import { useAlerts } from "@/providers/alerts-provider";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { logDashboardVisitEvent } from "@/app/actions/log-dashboard-visit";

type BlogCommentRecord = {
  id: string;
  blog_id: string;
  comment: string;
  created_by: string;
  created_at: string;
  author?: Pick<ProfileRecord, "id" | "full_name" | "email"> | null;
};
type BlogCompletionTiming = {
  writerCompletedAt: string | null;
  publisherCompletedAt: string | null;
};

function normalizeCommentRows(rows: Array<Record<string, unknown>>) {
  return rows.map((row) => {
    const authorValue = row.author;
    const author = Array.isArray(authorValue)
      ? ((authorValue[0] ?? null) as BlogCommentRecord["author"])
      : ((authorValue ?? null) as BlogCommentRecord["author"]);

    return {
      id: String(row.id ?? ""),
      blog_id: String(row.blog_id ?? ""),
      comment: String(row.comment ?? ""),
      created_by: String(row.user_id ?? row.created_by ?? ""),
      created_at: String(row.created_at ?? ""),
      author,
    } satisfies BlogCommentRecord;
  });
}

function normalizeRelationObject<T>(value: unknown): T | null {
  if (Array.isArray(value)) {
    return (value[0] ?? null) as T | null;
  }
  return (value ?? null) as T | null;
}

function isMissingBlogCommentUserIdColumnError(error: {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  hint?: string | null;
} | null) {
  if (!error) {
    return false;
  }
  const code = (error.code ?? "").toUpperCase();
  const text =
    `${error.message ?? ""} ${error.details ?? ""} ${error.hint ?? ""}`.toLowerCase();
  return code === "42703" && text.includes("user_id");
}

function isMissingBlogCommentsTableError(error: {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  hint?: string | null;
} | null) {
  if (!error) {
    return false;
  }
  const code = (error.code ?? "").toUpperCase();
  const text =
    `${error.message ?? ""} ${error.details ?? ""} ${error.hint ?? ""}`.toLowerCase();
  return (
    (code === "42P01" || code === "PGRST204" || code === "PGRST205") &&
    (text.includes("blog_comments") ||
      text.includes("schema cache") ||
      text.includes("could not find"))
  );
}


type DashboardColumnKey =
  | "content_type"
  | "site"
  | "id"
  | "title"
  | "status_display"
  | "lifecycle_bucket"
  | "scheduled_date"
  | "published_date"
  | "owner_display"
  | "updated_at"
  | "product"
  | "associated_content";
type DashboardSortField = DashboardColumnKey;
type DashboardSocialPostMetric = {
  id: string;
  title: string;
  product: string | null;
  type: SocialPostType | null;
  status: SocialPostStatus;
  scheduled_date: string | null;
  created_at: string;
  updated_at: string;
  associated_blog_site: string | null;
  creator_name: string | null;
  created_by_user_id: string | null;
  assigned_to_user_id: string | null;
  worker_name: string | null;
  worker_user_id: string | null;
  reviewer_name: string | null;
  reviewer_user_id: string | null;
  has_live_link: boolean;
  published_transition_at: string | null;
};
type DashboardContentType = "blog" | "social_post";
type DashboardLifecycleBucket =
  | "open_work"
  | "awaiting_review"
  | "ready_to_publish"
  | "awaiting_live_link"
  | "published";
type DashboardContentRow = {
  content_type: DashboardContentType;
  content_label: string;
  site: string;
  site_key: BlogSite;
  id: string;
  title: string;
  status_display: string;
  lifecycle_bucket: DashboardLifecycleBucket;
  scheduled_date: string | null;
  published_date: string | null;
  owner_display: string;
  owner_user_id: string | null;
  updated_at: string;
  product?: string | null;
  blog?: BlogRecord;
  social_post?: DashboardSocialPostMetric;
};

const DASHBOARD_COLUMN_LABELS: Record<DashboardColumnKey, string> = {
  content_type: "Content",
  site: "Site",
  id: "ID",
  title: "Title",
  status_display: "Status",
  lifecycle_bucket: "Lifecycle",
  scheduled_date: "Scheduled Date",
  published_date: "Published Date",
  owner_display: "Owner",
  updated_at: "Updated",
  product: "Product",
  associated_content: "Associated Content",
};
const DEFAULT_DASHBOARD_HIDDEN_COLUMNS: DashboardColumnKey[] = ["id", "product"];

const DEFAULT_DASHBOARD_COLUMN_ORDER: DashboardColumnKey[] = [
  "content_type",
  "site",
  "id",
  "title",
  "status_display",
  "lifecycle_bucket",
  "scheduled_date",
  "published_date",
  "owner_display",
  "updated_at",
  "product",
  "associated_content",
];
const REQUIRED_DASHBOARD_COLUMNS: DashboardColumnKey[] = [];

const DASHBOARD_COLUMN_VIEW_STORAGE_KEY = "dashboard-column-view:v1";
const DASHBOARD_COLUMN_HIDDEN_STORAGE_KEY = "dashboard-column-hidden:v1";

const isDashboardColumnKey = (value: string): value is DashboardColumnKey =>
  value in DASHBOARD_COLUMN_LABELS;
const escapeCsvValue = (value: string) => `"${value.replaceAll("\"", "\"\"")}"`;
const escapeHtmlValue = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");

const normalizeDashboardColumnOrder = (value: unknown): DashboardColumnKey[] => {
  if (!Array.isArray(value)) {
    return DEFAULT_DASHBOARD_COLUMN_ORDER;
  }

  const seen = new Set<DashboardColumnKey>();
  const normalized: DashboardColumnKey[] = [];

  for (const item of value) {
    if (typeof item !== "string" || !isDashboardColumnKey(item) || seen.has(item)) {
      continue;
    }
    seen.add(item);
    normalized.push(item);
  }

  for (const column of DEFAULT_DASHBOARD_COLUMN_ORDER) {
    if (!seen.has(column)) {
      normalized.push(column);
    }
  }

  return normalized;
};

const normalizeDashboardHiddenColumns = (value: unknown): DashboardColumnKey[] => {
  if (!Array.isArray(value)) {
    return DEFAULT_DASHBOARD_HIDDEN_COLUMNS;
  }

  const hiddenColumns: DashboardColumnKey[] = [];
  const seen = new Set<DashboardColumnKey>();
  for (const item of value) {
    if (
      typeof item !== "string" ||
      !isDashboardColumnKey(item) ||
      seen.has(item)
    ) {
      continue;
    }
    hiddenColumns.push(item);
    seen.add(item);
  }
  return hiddenColumns;
};

const DASHBOARD_SORT_FIELDS: DashboardSortField[] = [
  "scheduled_date",
  "published_date",
  "updated_at",
  "content_type",
  "status_display",
  "lifecycle_bucket",
  "owner_display",
  "title",
  "site",
  "id",
  "product",
  "associated_content",
];
type MetricFilterKey =
  | "open_work"
  | "scheduled_next_7_days"
  | "awaiting_review"
  | "ready_to_publish"
  | "awaiting_live_link"
  | "published_last_7_days";
type CrossContentWorkflowFilter =
  | "open_work"
  | "awaiting_review"
  | "ready_to_publish"
  | "awaiting_live_link"
  | "published_recent";
type CrossContentDeliveryFilter = "scheduled" | "unscheduled" | "overdue";
type DashboardContentTypeFilter = MixedContentFilterValue;
type DashboardLens =
  | "all_work"
  | "needs_my_action"
  | "awaiting_review"
  | "ready_to_publish"
  | "awaiting_live_link"
  | "published_recent";
const DASHBOARD_LENS_ORDER: DashboardLens[] = [
  "all_work",
  "needs_my_action",
  "awaiting_review",
  "ready_to_publish",
  "awaiting_live_link",
  "published_recent",
];
type DashboardOverviewMetricBreakdown = { blogs: number; social: number };
type DashboardOverviewMetrics = {
  openWork: number;
  scheduledNextSevenDays: number;
  awaitingReview: number;
  readyToPublish: number;
  awaitingLiveLink: number;
  publishedLastSevenDays: number;
  breakdown: {
    openWork: DashboardOverviewMetricBreakdown;
    scheduledNextSevenDays: DashboardOverviewMetricBreakdown;
    awaitingReview: DashboardOverviewMetricBreakdown;
    readyToPublish: DashboardOverviewMetricBreakdown;
    awaitingLiveLink: DashboardOverviewMetricBreakdown;
    publishedLastSevenDays: DashboardOverviewMetricBreakdown;
  };
};
const INITIAL_DASHBOARD_OVERVIEW_METRICS: DashboardOverviewMetrics = {
  openWork: 0,
  scheduledNextSevenDays: 0,
  awaitingReview: 0,
  readyToPublish: 0,
  awaitingLiveLink: 0,
  publishedLastSevenDays: 0,
  breakdown: {
    openWork: { blogs: 0, social: 0 },
    scheduledNextSevenDays: { blogs: 0, social: 0 },
    awaitingReview: { blogs: 0, social: 0 },
    readyToPublish: { blogs: 0, social: 0 },
    awaitingLiveLink: { blogs: 0, social: 0 },
    publishedLastSevenDays: { blogs: 0, social: 0 },
  },
};
const METRIC_FILTER_LABELS: Record<MetricFilterKey, string> = {
  open_work: "Open Work",
  scheduled_next_7_days: "Scheduled Next 7 Days",
  awaiting_review: "Awaiting Review",
  ready_to_publish: "Ready to Publish",
  awaiting_live_link: "Awaiting Live Link",
  published_last_7_days: "Published Last 7 Days",
};
const METRIC_TOOLTIPS: Record<MetricFilterKey, string> = {
  open_work:
    "All non-published blogs and social posts currently in progress.",
  scheduled_next_7_days:
    "Non-published items with scheduled dates between today and the next 6 days.",
  awaiting_review:
    "Items waiting for review now. Blog: writing/publishing pending review. Social: in review.",
  ready_to_publish:
    "Items approved and ready for publish execution.",
  awaiting_live_link:
    "Social posts in Awaiting Live Link with no saved live link yet.",
  published_last_7_days:
    "Items published in the last 7 days. Blogs use published timestamp; social uses status transition to Published.",
};
const INFORMATIONAL_METRIC_KEYS: MetricFilterKey[] = [
  "open_work",
  "scheduled_next_7_days",
  "published_last_7_days",
];
const ACTIONABLE_METRIC_KEYS: MetricFilterKey[] = [
  "awaiting_review",
  "ready_to_publish",
  "awaiting_live_link",
];
const CROSS_CONTENT_WORKFLOW_FILTER_LABELS: Record<
  CrossContentWorkflowFilter,
  string
> = {
  open_work: "Open Work",
  awaiting_review: "Awaiting Review",
  ready_to_publish: "Ready to Publish",
  awaiting_live_link: "Awaiting Live Link",
  published_recent: "Published Last 7 Days",
};
const DASHBOARD_LENS_LABELS: Record<DashboardLens, string> = {
  all_work: "All Work",
  needs_my_action: "Needs My Action",
  awaiting_review: "Awaiting Review",
  ready_to_publish: "Ready to Publish",
  awaiting_live_link: "Awaiting Live Link",
  published_recent: "Published Last 7 Days",
};
const CROSS_CONTENT_DELIVERY_FILTER_LABELS: Record<
  CrossContentDeliveryFilter,
  string
> = {
  scheduled: "Scheduled",
  unscheduled: "Unscheduled",
  overdue: "Overdue",
};

type DashboardFilterState = {
  search: string;
  siteFilters: BlogSite[];
  contentTypeFilters: DashboardContentTypeFilter[];
  assignedToFilters: string[];
  lens: DashboardLens;
  statusFilters: OverallBlogStatus[];
  writerFilters: string[];
  publisherFilters: string[];
  writerStatusFilters: WriterStageStatus[];
  publisherStatusFilters: PublisherStageStatus[];
  socialStatusFilters: SocialPostStatus[];
  socialProductFilters: string[];
  crossWorkflowFilters: CrossContentWorkflowFilter[];
  crossDeliveryFilters: CrossContentDeliveryFilter[];
  sortField: DashboardSortField;
  sortDirection: SortDirection;
  rowDensity: "compact" | "comfortable";
  rowLimit: TableRowLimit;
};
type DashboardRowFilterOverrides = Partial<{
  search: string;
  siteFilters: BlogSite[];
  contentTypeFilters: DashboardContentTypeFilter[];
  assignedToFilters: string[];
  lens: DashboardLens;
  statusFilters: OverallBlogStatus[];
  writerFilters: string[];
  publisherFilters: string[];
  writerStatusFilters: WriterStageStatus[];
  publisherStatusFilters: PublisherStageStatus[];
  socialStatusFilters: SocialPostStatus[];
  socialProductFilters: string[];
  crossWorkflowFilters: CrossContentWorkflowFilter[];
  crossDeliveryFilters: CrossContentDeliveryFilter[];
  activeMetricFilter: MetricFilterKey | null;
}>;

type SavedDashboardView = {
  id: string;
  name: string;
  state: DashboardFilterState;
  columnOrder: DashboardColumnKey[];
  createdAt: string;
  updatedAt: string;
};
type SavedLensShortcut = {
  id: string;
  name: string;
  lens: DashboardLens;
  createdAt: string;
  updatedAt: string;
};

const DASHBOARD_FILTER_STATE_STORAGE_KEY = "dashboard-filter-state:v1";
const DASHBOARD_SAVED_VIEWS_STORAGE_KEY = "dashboard-saved-views:v1";
const DASHBOARD_ACTIVE_SAVED_VIEW_STORAGE_KEY = "dashboard-active-saved-view:v1";
const DASHBOARD_SAVED_LENS_SHORTCUTS_STORAGE_KEY =
  "dashboard-saved-lens-shortcuts:v1";
const buildUserScopedStorageKey = (baseKey: string, userId: string | null | undefined) =>
  `${baseKey}:${userId ?? "anonymous"}`;

const DASHBOARD_SORT_FIELD_SET = new Set<DashboardSortField>(DASHBOARD_SORT_FIELDS);
const CONTENT_TYPE_FILTER_SET = new Set<DashboardContentTypeFilter>(
  MIXED_CONTENT_FILTER_OPTIONS.map((option) => option.value)
);
const SITE_SET = new Set<BlogSite>(SITES);
const OVERALL_STATUS_SET = new Set<OverallBlogStatus>(OVERALL_STATUSES);
const WRITER_STATUS_SET = new Set<WriterStageStatus>(WRITER_STATUSES);
const PUBLISHER_STATUS_SET = new Set<PublisherStageStatus>(PUBLISHER_STATUSES);
const SOCIAL_STATUS_SET = new Set<SocialPostStatus>(SOCIAL_POST_STATUSES);
const CROSS_WORKFLOW_FILTER_SET = new Set<CrossContentWorkflowFilter>([
  "open_work",
  "awaiting_review",
  "ready_to_publish",
  "awaiting_live_link",
  "published_recent",
]);
const CROSS_DELIVERY_FILTER_SET = new Set<CrossContentDeliveryFilter>([
  "scheduled",
  "unscheduled",
  "overdue",
]);
const ROW_LIMIT_SET = new Set<TableRowLimit>(TABLE_ROW_LIMIT_OPTIONS);
const DASHBOARD_LENS_SET = new Set<DashboardLens>([
  ...DASHBOARD_LENS_ORDER,
]);

const DEFAULT_DASHBOARD_FILTER_STATE: DashboardFilterState = {
  search: "",
  siteFilters: [],
  contentTypeFilters: [],
  assignedToFilters: [],
  lens: "all_work",
  statusFilters: [],
  writerFilters: [],
  publisherFilters: [],
  writerStatusFilters: [],
  publisherStatusFilters: [],
  socialStatusFilters: [],
  socialProductFilters: [],
  crossWorkflowFilters: [],
  crossDeliveryFilters: [],
  sortField: "updated_at",
  sortDirection: "asc",
  rowDensity: "compact",
  rowLimit: DEFAULT_TABLE_ROW_LIMIT,
};

const isSortDirection = (value: unknown): value is SortDirection =>
  value === "asc" || value === "desc";
const isRowDensity = (value: unknown): value is "compact" | "comfortable" =>
  value === "compact" || value === "comfortable";

const normalizeStringArray = (value: unknown) => {
  if (!Array.isArray(value)) {
    return [];
  }
  return Array.from(
    new Set(value.filter((entry): entry is string => typeof entry === "string"))
  );
};

const normalizeDashboardFilterState = (value: unknown): DashboardFilterState => {
  if (!value || typeof value !== "object") {
    return DEFAULT_DASHBOARD_FILTER_STATE;
  }

  const state = value as Partial<DashboardFilterState>;
  const search = typeof state.search === "string" ? state.search : "";
  const siteFilters = normalizeStringArray(state.siteFilters).filter((site): site is BlogSite =>
    SITE_SET.has(site as BlogSite)
  );
  const contentTypeFilters = normalizeStringArray(state.contentTypeFilters).filter(
    (value): value is DashboardContentTypeFilter =>
      CONTENT_TYPE_FILTER_SET.has(value as DashboardContentTypeFilter)
  );
  const assignedToFilters = normalizeStringArray(state.assignedToFilters);
  const lens =
    typeof state.lens === "string" && DASHBOARD_LENS_SET.has(state.lens as DashboardLens)
      ? (state.lens as DashboardLens)
      : DEFAULT_DASHBOARD_FILTER_STATE.lens;
  const statusFilters = normalizeStringArray(state.statusFilters).filter(
    (status): status is OverallBlogStatus =>
      OVERALL_STATUS_SET.has(status as OverallBlogStatus)
  );
  const writerFilters = normalizeStringArray(state.writerFilters);
  const publisherFilters = normalizeStringArray(state.publisherFilters);
  const writerStatusFilters = normalizeStringArray(state.writerStatusFilters).filter(
    (status): status is WriterStageStatus =>
      WRITER_STATUS_SET.has(status as WriterStageStatus)
  );
  const publisherStatusFilters = normalizeStringArray(state.publisherStatusFilters).filter(
    (status): status is PublisherStageStatus =>
      PUBLISHER_STATUS_SET.has(status as PublisherStageStatus)
  );
  const socialStatusFilters = normalizeStringArray(state.socialStatusFilters).filter(
    (status): status is SocialPostStatus =>
      SOCIAL_STATUS_SET.has(status as SocialPostStatus)
  );
  const socialProductFilters = normalizeStringArray(state.socialProductFilters);
  const crossWorkflowFilters = normalizeStringArray(state.crossWorkflowFilters).filter(
    (value): value is CrossContentWorkflowFilter =>
      CROSS_WORKFLOW_FILTER_SET.has(value as CrossContentWorkflowFilter)
  );
  const crossDeliveryFilters = normalizeStringArray(state.crossDeliveryFilters).filter(
    (value): value is CrossContentDeliveryFilter =>
      CROSS_DELIVERY_FILTER_SET.has(value as CrossContentDeliveryFilter)
  );

  const sortField =
    typeof state.sortField === "string" &&
    DASHBOARD_SORT_FIELD_SET.has(state.sortField as DashboardSortField)
      ? (state.sortField as DashboardSortField)
      : DEFAULT_DASHBOARD_FILTER_STATE.sortField;

  const sortDirection = isSortDirection(state.sortDirection)
    ? state.sortDirection
    : DEFAULT_DASHBOARD_FILTER_STATE.sortDirection;
  const rowDensity = isRowDensity(state.rowDensity)
    ? state.rowDensity
    : DEFAULT_DASHBOARD_FILTER_STATE.rowDensity;

  const rowLimit = ROW_LIMIT_SET.has(state.rowLimit as TableRowLimit)
    ? (state.rowLimit as TableRowLimit)
    : DEFAULT_DASHBOARD_FILTER_STATE.rowLimit;

  return {
    search,
    siteFilters,
    contentTypeFilters,
    assignedToFilters,
    lens,
    statusFilters,
    writerFilters,
    publisherFilters,
    writerStatusFilters,
    publisherStatusFilters,
    socialStatusFilters,
    socialProductFilters,
    crossWorkflowFilters,
    crossDeliveryFilters,
    sortField,
    sortDirection,
    rowDensity,
    rowLimit,
  };
};

const normalizeSavedViews = (value: unknown): SavedDashboardView[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const seenIds = new Set<string>();
  const normalizedViews: SavedDashboardView[] = [];

  for (const entry of value) {
    if (!entry || typeof entry !== "object") {
      continue;
    }
    const candidate = entry as Partial<SavedDashboardView>;
    if (typeof candidate.id !== "string" || candidate.id.trim() === "") {
      continue;
    }
    if (seenIds.has(candidate.id)) {
      continue;
    }
    const name =
      typeof candidate.name === "string" && candidate.name.trim().length > 0
        ? candidate.name.trim()
        : "Untitled View";

    normalizedViews.push({
      id: candidate.id,
      name,
      state: normalizeDashboardFilterState(candidate.state),
      columnOrder: normalizeDashboardColumnOrder(candidate.columnOrder),
      createdAt:
        typeof candidate.createdAt === "string"
          ? candidate.createdAt
          : new Date().toISOString(),
      updatedAt:
        typeof candidate.updatedAt === "string"
          ? candidate.updatedAt
          : new Date().toISOString(),
    });
    seenIds.add(candidate.id);
  }

  return normalizedViews.slice(0, 50);
};
const normalizeSavedLensShortcuts = (value: unknown): SavedLensShortcut[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const seenIds = new Set<string>();
  const seenLens = new Set<DashboardLens>();
  const normalizedShortcuts: SavedLensShortcut[] = [];

  for (const entry of value) {
    if (!entry || typeof entry !== "object") {
      continue;
    }
    const candidate = entry as Partial<SavedLensShortcut>;
    if (typeof candidate.id !== "string" || candidate.id.trim() === "") {
      continue;
    }
    if (
      typeof candidate.lens !== "string" ||
      !DASHBOARD_LENS_SET.has(candidate.lens as DashboardLens)
    ) {
      continue;
    }
    const lensValue = candidate.lens as DashboardLens;
    if (seenIds.has(candidate.id) || seenLens.has(lensValue)) {
      continue;
    }
    const defaultName = DASHBOARD_LENS_LABELS[lensValue];
    const name =
      typeof candidate.name === "string" && candidate.name.trim().length > 0
        ? candidate.name.trim()
        : defaultName;

    normalizedShortcuts.push({
      id: candidate.id,
      name,
      lens: lensValue,
      createdAt:
        typeof candidate.createdAt === "string"
          ? candidate.createdAt
          : new Date().toISOString(),
      updatedAt:
        typeof candidate.updatedAt === "string"
          ? candidate.updatedAt
          : new Date().toISOString(),
    });
    seenIds.add(candidate.id);
    seenLens.add(lensValue);
  }

  return normalizedShortcuts.slice(0, DASHBOARD_LENS_ORDER.length);
};

export default function DashboardPage() {
  const router = useRouter();
  const { hasPermission, profile, session, user } = useAuth();
  const { showError, showSuccess, showWarning } = useAlerts();
  useEffect(() => {
    if (!user?.id) {
      return;
    }
    void logDashboardVisitEvent(user.id);
  }, [user?.id]);
  const permissionContract = useMemo(
    () => createUiPermissionContract(hasPermission),
    [hasPermission]
  );
  const canCreateBlog = permissionContract.canCreateBlog;
  const canManageSocialPosts =
    permissionContract.canViewDashboard || permissionContract.canOverrideWorkflow;
  const canRunDataImport = hasPermission("run_data_import");
  const canExportCsv = permissionContract.canExportCsv;
  const canExportSelectedCsv = permissionContract.canExportSelectedCsv;
  const canChangeWriterAssignment = permissionContract.canChangeWriterAssignment;
  const canChangePublisherAssignment = permissionContract.canChangePublisherAssignment;
  const canEditScheduledDate = permissionContract.canEditScheduledPublishDate;
  const canEditDisplayDate = permissionContract.canEditDisplayPublishDate;
  const canEditWritingStage = permissionContract.canEditWriterWorkflow;
  const canEditPublishingStage = permissionContract.canEditPublisherWorkflow;
  const canDeleteBlog = permissionContract.canDeleteBlog;
  const canCreateComments = permissionContract.canCreateComment;
  const canEditPanelDetails =
    canChangeWriterAssignment ||
    canChangePublisherAssignment ||
    canEditWritingStage ||
    canEditPublishingStage ||
    canEditScheduledDate ||
    canEditDisplayDate;
  const canRunBulkActions =
    canChangeWriterAssignment ||
    canChangePublisherAssignment ||
    canEditWritingStage ||
    canEditPublishingStage ||
    canDeleteBlog;
  const canSelectRows = canRunBulkActions || canExportSelectedCsv;
  const [blogs, setBlogs] = useState<BlogRecord[]>([]);
  const [socialPosts, setSocialPosts] = useState<DashboardSocialPostMetric[]>([]);
  const [assignableUsers, setAssignableUsers] = useState<
    Array<Pick<ProfileRecord, "id" | "full_name" | "email">>
  >([]);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 180);
  const [siteFilters, setSiteFilters] = useState<BlogSite[]>([]);
  const [contentTypeFilters, setContentTypeFilters] = useState<
    DashboardContentTypeFilter[]
  >([]);
  const [assignedToFilters, setAssignedToFilters] = useState<string[]>([]);
  const [lens, setLens] = useState<DashboardLens>(DEFAULT_DASHBOARD_FILTER_STATE.lens);
  const [statusFilters, setStatusFilters] = useState<OverallBlogStatus[]>([]);
  const [writerFilters, setWriterFilters] = useState<string[]>([]);
  const [publisherFilters, setPublisherFilters] = useState<string[]>([]);
  const [writerStatusFilters, setWriterStatusFilters] = useState<WriterStageStatus[]>([]);
  const [publisherStatusFilters, setPublisherStatusFilters] = useState<
    PublisherStageStatus[]
  >([]);
  const [socialStatusFilters, setSocialStatusFilters] = useState<SocialPostStatus[]>([]);
  const [socialProductFilters, setSocialProductFilters] = useState<string[]>([]);
  const [crossWorkflowFilters, setCrossWorkflowFilters] = useState<
    CrossContentWorkflowFilter[]
  >([]);
  const [crossDeliveryFilters, setCrossDeliveryFilters] = useState<
    CrossContentDeliveryFilter[]
  >([]);
  const [sortField, setSortField] = useState<DashboardSortField>("updated_at");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [rowDensity, setRowDensity] = useState<"compact" | "comfortable">("compact");
  const [columnOrder, setColumnOrder] = useState<DashboardColumnKey[]>(
    DEFAULT_DASHBOARD_COLUMN_ORDER
  );
  const [hiddenColumns, setHiddenColumns] = useState<DashboardColumnKey[]>(
    DEFAULT_DASHBOARD_HIDDEN_COLUMNS
  );
  const [savedViews, setSavedViews] = useState<SavedDashboardView[]>([]);
  const [activeSavedViewId, setActiveSavedViewId] = useState<string | null>(null);
  const [savedLensShortcuts, setSavedLensShortcuts] = useState<SavedLensShortcut[]>(
    []
  );
  const [rowLimit, setRowLimit] = useState<TableRowLimit>(DEFAULT_TABLE_ROW_LIMIT);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isOverviewLoading, setIsOverviewLoading] = useState(true);
  const [overviewMetrics, setOverviewMetrics] = useState<DashboardOverviewMetrics>(
    INITIAL_DASHBOARD_OVERVIEW_METRICS
  );
  const [isBulkSaving, setIsBulkSaving] = useState(false);
  const [selectedBlogIds, setSelectedBlogIds] = useState<string[]>([]);
  const [selectedSocialPostIds, setSelectedSocialPostIds] = useState<string[]>([]);
  const [bulkWriterId, setBulkWriterId] = useState("");
  const [bulkPublisherId, setBulkPublisherId] = useState("");
  const [bulkWriterStatus, setBulkWriterStatus] = useState<WriterStageStatus | "">("");
  const [bulkPublisherStatus, setBulkPublisherStatus] = useState<PublisherStageStatus | "">("");
  const [showBulkPreviewModal, setShowBulkPreviewModal] = useState(false);
  const [bulkPreviewChangesSummary, setBulkPreviewChangesSummary] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeBlogId, setActiveBlogId] = useState<string | null>(null);
  const [panelHistory, setPanelHistory] = useState<BlogHistoryRecord[]>([]);
  const [panelComments, setPanelComments] = useState<BlogCommentRecord[]>([]);
  const [panelCommentDraft, setPanelCommentDraft] = useState("");
  const [panelError, setPanelError] = useState<string | null>(null);
  const [isPanelLoading, setIsPanelLoading] = useState(false);
  const [isPanelCommentSaving, setIsPanelCommentSaving] = useState(false);
  const [isPanelEditMode, setIsPanelEditMode] = useState(false);
  const [activeMetricFilter, setActiveMetricFilter] = useState<MetricFilterKey | null>(null);
  const [isApplyingFilterFeedback, setIsApplyingFilterFeedback] = useState(false);
  const [isEditColumnsOpen, setIsEditColumnsOpen] = useState(false);
  const [isAdvancedFiltersOpen, setIsAdvancedFiltersOpen] = useState(false);
  const [hasLoadedLocalState, setHasLoadedLocalState] = useState(false);
  const [, setCompletionTimingsByBlog] = useState<
    Record<string, BlogCompletionTiming>
  >({});
  const columnEditorRef = useRef<HTMLDivElement | null>(null);
  const tableContainerRef = useRef<HTMLDivElement | null>(null);
  const hydratedStorageKeysRef = useRef<string | null>(null);
  const filterStateStorageKey = useMemo(
    () => buildUserScopedStorageKey(DASHBOARD_FILTER_STATE_STORAGE_KEY, profile?.id),
    [profile?.id]
  );
  const savedViewsStorageKey = useMemo(
    () => buildUserScopedStorageKey(DASHBOARD_SAVED_VIEWS_STORAGE_KEY, profile?.id),
    [profile?.id]
  );
  const activeSavedViewStorageKey = useMemo(
    () => buildUserScopedStorageKey(DASHBOARD_ACTIVE_SAVED_VIEW_STORAGE_KEY, profile?.id),
    [profile?.id]
  );
  const savedLensShortcutsStorageKey = useMemo(
    () =>
      buildUserScopedStorageKey(
        DASHBOARD_SAVED_LENS_SHORTCUTS_STORAGE_KEY,
        profile?.id
      ),
    [profile?.id]
  );
  const columnViewStorageKey = useMemo(
    () => buildUserScopedStorageKey(DASHBOARD_COLUMN_VIEW_STORAGE_KEY, profile?.id),
    [profile?.id]
  );
  const columnHiddenStorageKey = useMemo(
    () => buildUserScopedStorageKey(DASHBOARD_COLUMN_HIDDEN_STORAGE_KEY, profile?.id),
    [profile?.id]
  );
  const closeOpenDashboardMenus = useCallback(() => {
    document.querySelectorAll<HTMLDetailsElement>("details[open]").forEach((menu) => {
      menu.open = false;
    });
  }, []);

  useEffect(() => {
    if (!error) {
      return;
    }
    showError(error);
  }, [error, showError]);

  useEffect(() => {
    if (!successMessage) {
      return;
    }
    showSuccess(successMessage);
  }, [showSuccess, successMessage]);

  useEffect(() => {
    if (!panelError) {
      return;
    }
    showError(panelError);
  }, [panelError, showError]);

  const applyFilterState = useCallback((nextState: DashboardFilterState) => {
    setSearch(nextState.search);
    setSiteFilters(nextState.siteFilters);
    setContentTypeFilters(nextState.contentTypeFilters);
    setAssignedToFilters(nextState.assignedToFilters);
    setLens(nextState.lens);
    setStatusFilters(nextState.statusFilters);
    setWriterFilters(nextState.writerFilters);
    setPublisherFilters(nextState.publisherFilters);
    setWriterStatusFilters(nextState.writerStatusFilters);
    setPublisherStatusFilters(nextState.publisherStatusFilters);
    setSocialStatusFilters(nextState.socialStatusFilters);
    setSocialProductFilters(nextState.socialProductFilters);
    setCrossWorkflowFilters(nextState.crossWorkflowFilters);
    setCrossDeliveryFilters(nextState.crossDeliveryFilters);
    setSortField(nextState.sortField);
    setSortDirection(nextState.sortDirection);
    setRowDensity(nextState.rowDensity);
    setRowLimit(nextState.rowLimit);
    setCurrentPage(1);
  }, []);

  const buildCurrentFilterState = useCallback(
    (): DashboardFilterState => ({
      search,
      siteFilters,
      contentTypeFilters,
      assignedToFilters,
      lens,
      statusFilters,
      writerFilters,
      publisherFilters,
      writerStatusFilters,
      publisherStatusFilters,
      socialStatusFilters,
      socialProductFilters,
      crossWorkflowFilters,
      crossDeliveryFilters,
      sortField,
      sortDirection,
      rowDensity,
      rowLimit,
    }),
    [
      publisherFilters,
      publisherStatusFilters,
      rowLimit,
      assignedToFilters,
      lens,
      search,
      socialProductFilters,
      socialStatusFilters,
      siteFilters,
      sortDirection,
      sortField,
      statusFilters,
      writerFilters,
      writerStatusFilters,
      contentTypeFilters,
      crossDeliveryFilters,
      crossWorkflowFilters,
      rowDensity,
    ]
  );
  const hasActiveDashboardFilters =
    lens !== DEFAULT_DASHBOARD_FILTER_STATE.lens ||
    search.trim().length > 0 ||
    siteFilters.length > 0 ||
    contentTypeFilters.length > 0 ||
    assignedToFilters.length > 0 ||
    statusFilters.length > 0 ||
    writerFilters.length > 0 ||
    publisherFilters.length > 0 ||
    writerStatusFilters.length > 0 ||
    publisherStatusFilters.length > 0 ||
    socialStatusFilters.length > 0 ||
    socialProductFilters.length > 0 ||
    crossWorkflowFilters.length > 0 ||
    crossDeliveryFilters.length > 0 ||
    activeMetricFilter !== null;
  const hasBlogFilterScope =
    contentTypeFilters.length === 0 || contentTypeFilters.includes("blog");
  const hasSocialFilterScope =
    contentTypeFilters.length === 0 ||
    contentTypeFilters.some((filterValue) => filterValue !== "blog");
  const activeAdvancedFilterCount =
    crossDeliveryFilters.length +
    statusFilters.length +
    writerFilters.length +
    publisherFilters.length +
    writerStatusFilters.length +
    publisherStatusFilters.length +
    socialStatusFilters.length +
    socialProductFilters.length;

  const loadData = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    setIsLoading(true);
    setError(null);
    const fetchBlogs = async () => {
      let { data, error } = await supabase
        .from("blogs")
        .select(BLOG_SELECT_WITH_DATES_WITH_RELATIONS)
        .eq("is_archived", false)
        .order("scheduled_publish_date", { ascending: true, nullsFirst: false })
        .order("updated_at", { ascending: false });
      if (isMissingBlogDateColumnsError(error)) {
        const fallback = await supabase
          .from("blogs")
          .select(BLOG_SELECT_LEGACY_WITH_RELATIONS)
          .eq("is_archived", false)
          .order("target_publish_date", { ascending: true, nullsFirst: false })
          .order("updated_at", { ascending: false });
        data = fallback.data as typeof data;
        error = fallback.error;
      }

      return { data, error };
    };
    const fetchSocialPosts = async () => {
      const selectWithOwnership =
        "id,title,product,type,status,scheduled_date,created_at,updated_at,created_by,worker_user_id,reviewer_user_id,associated_blog:associated_blog_id(site),creator:created_by(full_name),assigned_to_user_id,worker:worker_user_id(full_name),reviewer:reviewer_user_id(full_name)";
      const selectLegacy =
        "id,title,product,type,status,scheduled_date,created_at,updated_at,created_by,worker_user_id,reviewer_user_id,associated_blog:associated_blog_id(site),creator:created_by(full_name),worker:worker_user_id(full_name),reviewer:reviewer_user_id(full_name)";

      let { data, error } = await supabase
        .from("social_posts")
        .select(selectWithOwnership);

      if (isMissingSocialOwnershipColumnsError(error)) {
        const fallback = await supabase.from("social_posts").select(selectLegacy);
        data = fallback.data as typeof data;
        error = fallback.error;
      }

      return { data, error };
    };

    const [
      { data: blogsData, error: blogsError },
      { data: socialPostsData, error: socialPostsError },
    ] = await Promise.all([fetchBlogs(), fetchSocialPosts()]);

    if (blogsError) {
      setError("Couldn't load dashboard. Please refresh and try again.");
      setIsLoading(false);
      return;
    }

    const nextBlogs = normalizeBlogRows(
      (blogsData ?? []) as Array<Record<string, unknown>>
    ) as BlogRecord[];
    setBlogs(nextBlogs);
    if (socialPostsError) {
      setSocialPosts([]);
    } else {
      const socialPostStatusSet = new Set<SocialPostStatus>(SOCIAL_POST_STATUSES);
      const nextSocialPosts = ((socialPostsData ?? []) as Array<Record<string, unknown>>)
        .map((row) => {
          const associatedBlog = normalizeRelationObject<{ site?: unknown }>(
            row.associated_blog
          );
          const creator = normalizeRelationObject<{ full_name?: unknown }>(row.creator);
          const worker = normalizeRelationObject<{ full_name?: unknown }>(row.worker);
          const reviewer = normalizeRelationObject<{ full_name?: unknown }>(
            row.reviewer
          );
          if (
            typeof row.status !== "string" ||
            !socialPostStatusSet.has(row.status as SocialPostStatus)
          ) {
            return null;
          }
          const normalizedSocialType =
            row.type === "image" ||
            row.type === "carousel" ||
            row.type === "video" ||
            row.type === "link"
              ? (row.type as SocialPostType)
              : null;
          return {
            id: typeof row.id === "string" ? row.id : "",
            title: typeof row.title === "string" ? row.title : "Untitled social post",
            product: typeof row.product === "string" ? row.product : null,
            type: normalizedSocialType,
            status: row.status as SocialPostStatus,
            scheduled_date:
              typeof row.scheduled_date === "string" ? row.scheduled_date : null,
            created_at:
              typeof row.created_at === "string"
                ? row.created_at
                : new Date().toISOString(),
            updated_at:
              typeof row.updated_at === "string"
                ? row.updated_at
                : new Date().toISOString(),
            associated_blog_site:
              (associatedBlog?.site as string | undefined) ?? null,
            creator_name:
              (creator?.full_name as string | undefined) ?? null,
            created_by_user_id:
              typeof row.created_by === "string" ? row.created_by : null,
            assigned_to_user_id:
              typeof row.assigned_to_user_id === "string"
                ? row.assigned_to_user_id
                : null,
            worker_name:
              (worker?.full_name as string | undefined) ?? null,
            worker_user_id:
              typeof row.worker_user_id === "string" ? row.worker_user_id : null,
            reviewer_name:
              (reviewer?.full_name as string | undefined) ?? null,
            reviewer_user_id:
              typeof row.reviewer_user_id === "string"
                ? row.reviewer_user_id
                : null,
            has_live_link: false,
            published_transition_at: null,
          } satisfies DashboardSocialPostMetric;
        })
        .filter((row): row is DashboardSocialPostMetric => row !== null);
      if (nextSocialPosts.length === 0) {
        setSocialPosts(nextSocialPosts);
      } else {
        const socialPostIds = nextSocialPosts.map((post) => post.id);
        const [liveLinkResult, publishedTransitionResult] = await Promise.all([
          supabase
            .from("social_post_links")
            .select("social_post_id")
            .in("social_post_id", socialPostIds),
          supabase
            .from("social_post_activity_history")
            .select("social_post_id,changed_at")
            .eq("field_name", "status")
            .eq("new_value", "published")
            .in("social_post_id", socialPostIds),
        ]);

        const postsWithLiveLinks = new Set<string>();
        if (!liveLinkResult.error) {
          for (const row of (liveLinkResult.data ?? []) as Array<Record<string, unknown>>) {
            const socialPostId =
              typeof row.social_post_id === "string" ? row.social_post_id : null;
            if (socialPostId) {
              postsWithLiveLinks.add(socialPostId);
            }
          }
        }

        const publishedTransitionByPostId = new Map<string, string>();
        if (!publishedTransitionResult.error) {
          for (const row of (publishedTransitionResult.data ?? []) as Array<Record<string, unknown>>) {
            const socialPostId =
              typeof row.social_post_id === "string" ? row.social_post_id : null;
            const changedAt = typeof row.changed_at === "string" ? row.changed_at : null;
            if (!socialPostId || !changedAt) {
              continue;
            }
            const existingTransition = publishedTransitionByPostId.get(socialPostId);
            if (!existingTransition || changedAt > existingTransition) {
              publishedTransitionByPostId.set(socialPostId, changedAt);
            }
          }
        }

        const enrichedSocialPosts = nextSocialPosts.map((post) => ({
          ...post,
          has_live_link: postsWithLiveLinks.has(post.id),
          published_transition_at: publishedTransitionByPostId.get(post.id) ?? null,
        }));
        setSocialPosts(enrichedSocialPosts);
      }
    }

    const nextBlogIds = nextBlogs.map((blog) => blog.id);
    if (nextBlogIds.length > 0) {
      const { data: completionEvents, error: completionEventsError } = await supabase
        .from("blog_assignment_history")
        .select("blog_id,field_name,new_value,changed_at")
        .in("blog_id", nextBlogIds)
        .in("field_name", ["writer_status", "publisher_status"])
        .eq("new_value", "completed");

      if (!completionEventsError) {
        const completionMap: Record<string, BlogCompletionTiming> = {};
        for (const row of (completionEvents ?? []) as Array<Record<string, unknown>>) {
          const blogId = typeof row.blog_id === "string" ? row.blog_id : null;
          const fieldName = typeof row.field_name === "string" ? row.field_name : null;
          const changedAt = typeof row.changed_at === "string" ? row.changed_at : null;
          if (!blogId || !fieldName || !changedAt) {
            continue;
          }

          const existing = completionMap[blogId] ?? {
            writerCompletedAt: null,
            publisherCompletedAt: null,
          };
          if (
            fieldName === "writer_status" &&
            (!existing.writerCompletedAt || changedAt < existing.writerCompletedAt)
          ) {
            existing.writerCompletedAt = changedAt;
          }
          if (
            fieldName === "publisher_status" &&
            (!existing.publisherCompletedAt || changedAt < existing.publisherCompletedAt)
          ) {
            existing.publisherCompletedAt = changedAt;
          }
          completionMap[blogId] = existing;
        }
        setCompletionTimingsByBlog(completionMap);
      } else {
        setCompletionTimingsByBlog({});
      }
    } else {
      setCompletionTimingsByBlog({});
    }
    setIsLoading(false);
  }, []);

  const loadOverviewMetrics = useCallback(async () => {
    if (!session?.access_token) {
      setOverviewMetrics(INITIAL_DASHBOARD_OVERVIEW_METRICS);
      setIsOverviewLoading(false);
      return;
    }
    setIsOverviewLoading(true);
    const response = await fetch("/api/dashboard/overview-metrics", {
      headers: {
        authorization: `Bearer ${session.access_token}`,
      },
    }).catch(() => null);
    if (!response) {
      setOverviewMetrics(INITIAL_DASHBOARD_OVERVIEW_METRICS);
      setIsOverviewLoading(false);
      showWarning("Dashboard overview is temporarily unavailable.");
      return;
    }

    const payload = await parseApiResponseJson<DashboardOverviewMetrics>(response);
    if (isApiFailure(response, payload)) {
      setOverviewMetrics(INITIAL_DASHBOARD_OVERVIEW_METRICS);
      setIsOverviewLoading(false);
      showWarning(getApiErrorMessage(payload, "Dashboard overview is temporarily unavailable."));
      return;
    }

    setOverviewMetrics(payload);
    setIsOverviewLoading(false);
  }, [session?.access_token, showWarning]);

  useEffect(() => {
    void loadData();
  }, [loadData]);
  useEffect(() => {
    void loadOverviewMetrics();
  }, [loadOverviewMetrics]);

  useEffect(() => {
    const loadUsers = async () => {
      const supabase = getSupabaseBrowserClient();
      const { data, error: usersError } = await supabase
        .from("profiles")
        .select("id,full_name,email")
        .eq("is_active", true)
        .order("full_name", { ascending: true });

      if (usersError) {
        console.error("Load users failed:", usersError);
        setError("Couldn't load team members. Please try again.");
        return;
      }
      setAssignableUsers((data ?? []) as Array<Pick<ProfileRecord, "id" | "full_name" | "email">>);
    };

    void loadUsers();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const savedColumnView = window.localStorage.getItem(columnViewStorageKey);
    if (savedColumnView) {
      try {
        const parsedColumnOrder = JSON.parse(savedColumnView) as unknown;
        setColumnOrder(normalizeDashboardColumnOrder(parsedColumnOrder));
      } catch {
        setColumnOrder(DEFAULT_DASHBOARD_COLUMN_ORDER);
      }
    }
    const savedHiddenColumns = window.localStorage.getItem(columnHiddenStorageKey);
    if (savedHiddenColumns) {
      try {
        const parsedHiddenColumns = JSON.parse(savedHiddenColumns) as unknown;
        setHiddenColumns(normalizeDashboardHiddenColumns(parsedHiddenColumns));
      } catch {
        setHiddenColumns(DEFAULT_DASHBOARD_HIDDEN_COLUMNS);
      }
    }
  }, [columnHiddenStorageKey, columnViewStorageKey]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const storageKeySignature = `${filterStateStorageKey}|${savedViewsStorageKey}|${activeSavedViewStorageKey}|${savedLensShortcutsStorageKey}`;
    if (hydratedStorageKeysRef.current === storageKeySignature) {
      return;
    }
    hydratedStorageKeysRef.current = storageKeySignature;

    const savedFilterState = window.localStorage.getItem(filterStateStorageKey);
    if (savedFilterState) {
      try {
        const parsedFilterState = JSON.parse(savedFilterState) as unknown;
        applyFilterState(normalizeDashboardFilterState(parsedFilterState));
      } catch {
        applyFilterState(DEFAULT_DASHBOARD_FILTER_STATE);
      }
    }

    const savedViewsRaw = window.localStorage.getItem(savedViewsStorageKey);
    if (savedViewsRaw) {
      try {
        const parsedSavedViews = JSON.parse(savedViewsRaw) as unknown;
        setSavedViews(normalizeSavedViews(parsedSavedViews));
      } catch {
        setSavedViews([]);
      }
    }

    const activeSavedViewIdRaw = window.localStorage.getItem(activeSavedViewStorageKey);
    if (activeSavedViewIdRaw) {
      setActiveSavedViewId(activeSavedViewIdRaw);
    }

    const savedLensShortcutsRaw = window.localStorage.getItem(
      savedLensShortcutsStorageKey
    );
    if (savedLensShortcutsRaw) {
      try {
        const parsedLensShortcuts = JSON.parse(savedLensShortcutsRaw) as unknown;
        setSavedLensShortcuts(normalizeSavedLensShortcuts(parsedLensShortcuts));
      } catch {
        setSavedLensShortcuts([]);
      }
    } else {
      setSavedLensShortcuts([]);
    }
    setHasLoadedLocalState(true);
  }, [
    activeSavedViewStorageKey,
    applyFilterState,
    filterStateStorageKey,
    savedLensShortcutsStorageKey,
    savedViewsStorageKey,
  ]);

  useEffect(() => {
    if (!hasLoadedLocalState) {
      return;
    }
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(
      filterStateStorageKey,
      JSON.stringify(buildCurrentFilterState())
    );
  }, [buildCurrentFilterState, filterStateStorageKey, hasLoadedLocalState]);

  useEffect(() => {
    if (!hasLoadedLocalState) {
      return;
    }
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(
      savedViewsStorageKey,
      JSON.stringify(savedViews)
    );
  }, [hasLoadedLocalState, savedViews, savedViewsStorageKey]);
  useEffect(() => {
    if (!hasLoadedLocalState) {
      return;
    }
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(
      savedLensShortcutsStorageKey,
      JSON.stringify(savedLensShortcuts)
    );
  }, [hasLoadedLocalState, savedLensShortcuts, savedLensShortcutsStorageKey]);

  useEffect(() => {
    if (!hasLoadedLocalState) {
      return;
    }
    if (typeof window === "undefined") {
      return;
    }
    if (!activeSavedViewId) {
      window.localStorage.removeItem(activeSavedViewStorageKey);
      return;
    }
    window.localStorage.setItem(
      activeSavedViewStorageKey,
      activeSavedViewId
    );
  }, [activeSavedViewStorageKey, activeSavedViewId, hasLoadedLocalState]);

  useEffect(() => {
    if (!activeSavedViewId) {
      return;
    }
    if (!savedViews.some((view) => view.id === activeSavedViewId)) {
      setActiveSavedViewId(null);
    }
  }, [activeSavedViewId, savedViews]);

  useEffect(() => {
    const existingIds = new Set(blogs.map((blog) => blog.id));
    setSelectedBlogIds((previous) => previous.filter((id) => existingIds.has(id)));
  }, [blogs]);


  useEffect(() => {
    if (!activeBlogId) {
      return;
    }
    if (!blogs.some((blog) => blog.id === activeBlogId)) {
      setActiveBlogId(null);
      setPanelHistory([]);
      setPanelComments([]);
      setPanelCommentDraft("");
      setPanelError(null);
      setIsPanelEditMode(false);
    }
  }, [activeBlogId, blogs]);


  useEffect(() => {
    if (!isEditColumnsOpen) {
      return;
    }

    const handleOutsideClick = (event: MouseEvent) => {
      if (!columnEditorRef.current?.contains(event.target as Node)) {
        setIsEditColumnsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isEditColumnsOpen]);

  useEffect(() => {
    const handleGlobalPopoverClose = () => {
      setIsEditColumnsOpen(false);
    };
    window.addEventListener(
      "app:close-popovers",
      handleGlobalPopoverClose as EventListener
    );
    return () => {
      window.removeEventListener(
        "app:close-popovers",
        handleGlobalPopoverClose as EventListener
      );
    };
  }, []);

  useEffect(() => {

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsEditColumnsOpen(false);
        setIsAdvancedFiltersOpen(false);
        if (activeBlogId) {
          setActiveBlogId(null);
          setPanelError(null);
          setPanelCommentDraft("");
          setIsPanelEditMode(false);
        }
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [activeBlogId]);

  const writerOptions = useMemo(
    () =>
      Array.from(
        new Map(
          blogs
            .filter((blog) => blog.writer)
            .map((blog) => [blog.writer!.id, blog.writer!])
        ).values()
      ),
    [blogs]
  );
  const publisherOptions = useMemo(
    () =>
      Array.from(
        new Map(
          blogs
            .filter((blog) => blog.publisher)
            .map((blog) => [blog.publisher!.id, blog.publisher!])
        ).values()
      ),
    [blogs]
  );

  const siteFilterOptions = useMemo(
    () =>
      SITES.map((site) => ({
        value: site,
        label: `${getSiteLabel(site)} (${getSiteShortLabel(site)})`,
      })),
    []
  );

  const overallStatusFilterOptions = useMemo(
    () =>
      OVERALL_STATUSES.map((status) => ({
        value: status,
        label: STATUS_LABELS[status],
      })),
    []
  );

  const filterUserOptions = useMemo(
    () =>
      Array.from(
        new Map(
          (assignableUsers.length > 0
            ? assignableUsers
            : [...writerOptions, ...publisherOptions]
          ).map((userOption) => [userOption.id, userOption.full_name])
        ).entries()
      ).map(([id, fullName]) => ({
        value: id,
        label: fullName,
      })),
    [assignableUsers, publisherOptions, writerOptions]
  );

  const writerFilterOptions = useMemo(() => filterUserOptions, [filterUserOptions]);

  const publisherFilterOptions = useMemo(
    () => filterUserOptions,
    [filterUserOptions]
  );

  const writerStatusFilterOptions = useMemo(
    () =>
      WRITER_STATUSES.map((status) => ({
        value: status,
        label: WRITER_STATUS_LABELS[status],
      })),
    []
  );

  const publisherStatusFilterOptions = useMemo(
    () =>
      PUBLISHER_STATUSES.map((status) => ({
        value: status,
        label: PUBLISHER_STATUS_LABELS[status],
      })),
    []
  );
  const contentTypeFilterOptions = useMemo(
    () =>
      MIXED_CONTENT_FILTER_OPTIONS.map((option) => ({
        value: option.value,
        label: option.label,
      })),
    []
  );
  const socialStatusFilterOptions = useMemo(
    () =>
      SOCIAL_POST_STATUSES.map((status) => ({
        value: status,
        label: status.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase()),
      })),
    []
  );
  const socialProductFilterOptions = useMemo(
    () =>
      Array.from(
        new Set(
          socialPosts
            .map((post) => post.product?.trim() ?? "")
            .filter((value) => value.length > 0)
        )
      )
        .sort((left, right) => left.localeCompare(right))
        .map((value) => ({ value, label: value })),
    [socialPosts]
  );
  useEffect(() => {
    const validUserIds = new Set(filterUserOptions.map((option) => option.value));
    const validSocialProducts = new Set(
      socialProductFilterOptions.map((option) => option.value)
    );
    setWriterFilters((previous) =>
      previous.filter((value) => validUserIds.has(value))
    );
    setPublisherFilters((previous) =>
      previous.filter((value) => validUserIds.has(value))
    );
    setSocialProductFilters((previous) =>
      previous.filter((value) => validSocialProducts.has(value))
    );
  }, [filterUserOptions, socialProductFilterOptions]);
  const crossWorkflowFilterOptions = useMemo(
    () =>
      (
        Object.keys(
          CROSS_CONTENT_WORKFLOW_FILTER_LABELS
        ) as CrossContentWorkflowFilter[]
      ).map((value) => ({
        value,
        label: CROSS_CONTENT_WORKFLOW_FILTER_LABELS[value],
      })),
    []
  );
  const crossDeliveryFilterOptions = useMemo(
    () =>
      (
        Object.keys(
          CROSS_CONTENT_DELIVERY_FILTER_LABELS
        ) as CrossContentDeliveryFilter[]
      ).map((value) => ({
        value,
        label: CROSS_CONTENT_DELIVERY_FILTER_LABELS[value],
      })),
    []
  );
  const lensOptions = useMemo(
    () =>
      DASHBOARD_LENS_ORDER.map((value) => ({
        value,
        label: DASHBOARD_LENS_LABELS[value],
      })),
    []
  );
  const dashboardRows = useMemo<DashboardContentRow[]>(() => {
    const deriveBlogLifecycleBucket = (blog: BlogRecord): DashboardLifecycleBucket => {
      if (blog.overall_status === "published") {
        return "published";
      }
      if (
        blog.writer_status === "pending_review" ||
        blog.publisher_status === "pending_review"
      ) {
        return "awaiting_review";
      }
      if (blog.overall_status === "ready_to_publish") {
        return "ready_to_publish";
      }
      return "open_work";
    };
    const deriveSocialLifecycleBucket = (
      status: SocialPostStatus
    ): DashboardLifecycleBucket => {
      if (status === "published") {
        return "published";
      }
      if (status === "in_review") {
        return "awaiting_review";
      }
      if (status === "ready_to_publish") {
        return "ready_to_publish";
      }
      if (status === "awaiting_live_link") {
        return "awaiting_live_link";
      }
      return "open_work";
    };
    const blogRows = blogs.map((blog) => {
      const lifecycleBucket = deriveBlogLifecycleBucket(blog);
      const ownerUserId =
        lifecycleBucket === "published"
          ? blog.publisher_id ?? blog.writer_id ?? null
          : blog.writer_status !== "completed"
            ? blog.writer_id ?? null
            : blog.publisher_id ?? null;
      const ownerDisplay =
        lifecycleBucket === "published"
          ? blog.publisher?.full_name ?? blog.writer?.full_name ?? "Unassigned"
          : blog.writer_status !== "completed"
            ? blog.writer?.full_name ?? "Unassigned"
            : blog.publisher?.full_name ?? "Unassigned";
      return {
        content_type: "blog",
        content_label: getMixedContentLabel({ contentType: "blog" }),
        site: getSiteShortLabel(blog.site),
        site_key: blog.site,
        id: blog.id,
        title: blog.title,
        status_display: STATUS_LABELS[blog.overall_status],
        lifecycle_bucket: lifecycleBucket,
        scheduled_date: getBlogScheduledDate(blog),
        published_date:
          blog.actual_published_at?.slice(0, 10) ??
          blog.published_at?.slice(0, 10) ??
          null,
        owner_display: ownerDisplay,
        owner_user_id: ownerUserId,
        updated_at: blog.updated_at,
        product: null,
        blog,
      } satisfies DashboardContentRow;
    });
    const socialRows = socialPosts.map((post) => {
      const lifecycleBucket = deriveSocialLifecycleBucket(post.status);
      const socialSite = (post.associated_blog_site as BlogSite | null) ?? "sighthound.com";
      const ownerUserId =
        post.status === "in_review" || post.status === "creative_approved"
          ? post.assigned_to_user_id ??
            post.reviewer_user_id ??
            post.worker_user_id ??
            post.created_by_user_id
          : post.assigned_to_user_id ??
            post.worker_user_id ??
            post.created_by_user_id ??
            post.reviewer_user_id;
      const assignedToName =
        post.assigned_to_user_id
          ? assignableUsers.find((candidate) => candidate.id === post.assigned_to_user_id)
              ?.full_name ?? null
          : null;
      const ownerDisplay =
        post.status === "in_review" || post.status === "creative_approved"
          ? assignedToName ??
            post.reviewer_name ??
            post.worker_name ??
            post.creator_name ??
            "Unassigned"
          : assignedToName ??
            post.worker_name ??
            post.creator_name ??
            post.reviewer_name ??
            "Unassigned";
      return {
        content_type: "social_post",
        content_label: getMixedContentLabel({
          contentType: "social_post",
          socialType: post.type,
        }),
        site: getSiteShortLabel(socialSite),
        site_key: socialSite,
        id: post.id,
        title: post.title,
        status_display: post.status.replaceAll("_", " ").replace(/\b\w/g, (char) =>
          char.toUpperCase()
        ),
        lifecycle_bucket: lifecycleBucket,
        scheduled_date: post.scheduled_date,
        published_date:
          post.status === "published" ? post.published_transition_at : null,
        owner_display: ownerDisplay,
        owner_user_id: ownerUserId,
        updated_at: post.updated_at,
        product: post.product,
        social_post: post,
      } satisfies DashboardContentRow;
    });
    return [...blogRows, ...socialRows];
  }, [assignableUsers, blogs, socialPosts]);
  const assignedToFilterOptions = useMemo(
    () =>
      Array.from(
        new Set(
          dashboardRows
            .map((row) => row.owner_display.trim())
            .filter((value) => value.length > 0)
        )
      )
        .sort((left, right) => left.localeCompare(right))
        .map((value) => ({ value, label: value })),
    [dashboardRows]
  );
  useEffect(() => {
    const validAssignedToValues = new Set(
      assignedToFilterOptions.map((option) => option.value)
    );
    setAssignedToFilters((previous) =>
      previous.filter((value) => validAssignedToValues.has(value))
    );
  }, [assignedToFilterOptions]);
  const matchesDashboardRow = useCallback(
    (
      row: DashboardContentRow,
      overrides: DashboardRowFilterOverrides = {}
    ) => {
      const now = new Date();
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);
      const nextSevenDaysEnd = new Date(todayStart);
      nextSevenDaysEnd.setDate(todayStart.getDate() + 6);
      nextSevenDaysEnd.setHours(23, 59, 59, 999);
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(now.getDate() - 7);
      const effectiveSearch = (overrides.search ?? debouncedSearch).toLowerCase().trim();
      const effectiveSiteFilters = overrides.siteFilters ?? siteFilters;
      const effectiveContentTypeFilters =
        overrides.contentTypeFilters ?? contentTypeFilters;
      const effectiveAssignedToFilters =
        overrides.assignedToFilters ?? assignedToFilters;
      const effectiveLens = overrides.lens ?? lens;
      const effectiveStatusFilters = overrides.statusFilters ?? statusFilters;
      const effectiveWriterFilters = overrides.writerFilters ?? writerFilters;
      const effectivePublisherFilters =
        overrides.publisherFilters ?? publisherFilters;
      const effectiveWriterStatusFilters =
        overrides.writerStatusFilters ?? writerStatusFilters;
      const effectivePublisherStatusFilters =
        overrides.publisherStatusFilters ?? publisherStatusFilters;
      const effectiveSocialStatusFilters =
        overrides.socialStatusFilters ?? socialStatusFilters;
      const effectiveSocialProductFilters =
        overrides.socialProductFilters ?? socialProductFilters;
      const effectiveCrossWorkflowFilters =
        overrides.crossWorkflowFilters ?? crossWorkflowFilters;
      const effectiveCrossDeliveryFilters =
        overrides.crossDeliveryFilters ?? crossDeliveryFilters;
      const effectiveMetricFilter =
        overrides.activeMetricFilter === undefined
          ? activeMetricFilter
          : overrides.activeMetricFilter;

      const isInNextSevenDays = (dateValue: string | null) => {
        if (!dateValue) {
          return false;
        }
        const dateTime = new Date(`${dateValue}T00:00:00`).getTime();
        return (
          dateTime >= todayStart.getTime() && dateTime <= nextSevenDaysEnd.getTime()
        );
      };
      const isPublishedInLastSevenDays = () => {
        if (row.lifecycle_bucket !== "published") {
          return false;
        }
        let timestamp: string | null = null;
        if (row.blog) {
          timestamp = row.blog.actual_published_at ?? row.blog.published_at ?? null;
        } else if (row.social_post) {
          timestamp =
            row.social_post.status === "published"
              ? row.social_post.published_transition_at
              : null;
        }
        if (!timestamp) {
          return false;
        }
        const publishedAt = new Date(timestamp).getTime();
        return publishedAt >= sevenDaysAgo.getTime() && publishedAt <= now.getTime();
      };
      const scheduledDate = row.scheduled_date;
      const scheduledTimestamp = scheduledDate
        ? new Date(`${scheduledDate}T00:00:00`).getTime()
        : null;
      const isScheduledInNextSevenDays = isInNextSevenDays(scheduledDate);
      const isPublishedRecent = isPublishedInLastSevenDays();
      const searchHaystack = [
        row.title,
        row.site,
        row.content_label,
        row.owner_display,
        row.status_display,
        row.id,
        row.product ?? "",
      ]
        .join(" ")
        .toLowerCase();

      const matchesMetricFilter = (() => {
        if (!effectiveMetricFilter) {
          return true;
        }
        if (effectiveMetricFilter === "open_work") {
          return row.lifecycle_bucket !== "published";
        }
        if (effectiveMetricFilter === "scheduled_next_7_days") {
          return row.lifecycle_bucket !== "published" && isScheduledInNextSevenDays;
        }
        if (effectiveMetricFilter === "awaiting_review") {
          return row.lifecycle_bucket === "awaiting_review";
        }
        if (effectiveMetricFilter === "ready_to_publish") {
          return row.lifecycle_bucket === "ready_to_publish";
        }
        if (effectiveMetricFilter === "awaiting_live_link") {
          if (row.content_type !== "social_post" || !row.social_post) {
            return false;
          }
          return row.social_post.status === "awaiting_live_link" && !row.social_post.has_live_link;
        }
        return isPublishedRecent;
      })();
      const matchesLensFilter = (() => {
        if (effectiveLens === "all_work") {
          return true;
        }
        if (effectiveLens === "needs_my_action") {
          if (!user?.id) {
            return false;
          }
          return row.lifecycle_bucket !== "published" && row.owner_user_id === user.id;
        }
        if (effectiveLens === "awaiting_review") {
          return row.lifecycle_bucket === "awaiting_review";
        }
        if (effectiveLens === "ready_to_publish") {
          return row.lifecycle_bucket === "ready_to_publish";
        }
        if (effectiveLens === "awaiting_live_link") {
          return row.lifecycle_bucket === "awaiting_live_link";
        }
        return isPublishedRecent;
      })();
      const matchesCrossWorkflowFilters =
        effectiveCrossWorkflowFilters.length === 0 ||
        effectiveCrossWorkflowFilters.some((filterValue) => {
          if (filterValue === "open_work") {
            return row.lifecycle_bucket !== "published";
          }
          if (filterValue === "awaiting_review") {
            return row.lifecycle_bucket === "awaiting_review";
          }
          if (filterValue === "ready_to_publish") {
            return row.lifecycle_bucket === "ready_to_publish";
          }
          if (filterValue === "awaiting_live_link") {
            return row.lifecycle_bucket === "awaiting_live_link";
          }
          return isPublishedRecent;
        });
      const matchesCrossDeliveryFilters =
        effectiveCrossDeliveryFilters.length === 0 ||
        effectiveCrossDeliveryFilters.some((filterValue) => {
          if (filterValue === "scheduled") {
            return scheduledDate !== null;
          }
          if (filterValue === "unscheduled") {
            return scheduledDate === null;
          }
          return (
            scheduledTimestamp !== null &&
            scheduledTimestamp < todayStart.getTime() &&
            row.lifecycle_bucket !== "published"
          );
        });
      const matchesSearch =
        effectiveSearch.length === 0 || searchHaystack.includes(effectiveSearch);
      const matchesContentType =
        effectiveContentTypeFilters.length === 0 ||
        matchesMixedContentFilters({
          selectedFilters: effectiveContentTypeFilters,
          contentType: row.content_type,
          socialType: row.social_post?.type ?? null,
        });
      const matchesAssignedTo =
        effectiveAssignedToFilters.length === 0 ||
        effectiveAssignedToFilters.includes(row.owner_display);
      const matchesSite =
        effectiveSiteFilters.length === 0 ||
        effectiveSiteFilters.includes(row.site_key);
      const matchesStatus =
        effectiveStatusFilters.length === 0 ||
        (row.content_type === "social_post" ||
          (row.blog ? effectiveStatusFilters.includes(row.blog.overall_status) : false));
      const matchesWriter =
        effectiveWriterFilters.length === 0 ||
        (row.content_type === "social_post" ||
          (row.blog?.writer_id !== null &&
            row.blog?.writer_id !== undefined &&
            effectiveWriterFilters.includes(row.blog.writer_id)));
      const matchesPublisher =
        effectivePublisherFilters.length === 0 ||
        (row.content_type === "social_post" ||
          (row.blog?.publisher_id !== null &&
            row.blog?.publisher_id !== undefined &&
            effectivePublisherFilters.includes(row.blog.publisher_id)));
      const matchesWriterStatus =
        effectiveWriterStatusFilters.length === 0 ||
        (row.content_type === "social_post" ||
          (row.blog
            ? effectiveWriterStatusFilters.includes(row.blog.writer_status)
            : false));
      const matchesPublisherStatus =
        effectivePublisherStatusFilters.length === 0 ||
        (row.content_type === "social_post" ||
          (row.blog
            ? effectivePublisherStatusFilters.includes(row.blog.publisher_status)
            : false));
      const matchesSocialStatus =
        effectiveSocialStatusFilters.length === 0 ||
        (row.content_type === "blog" ||
          (row.social_post
            ? effectiveSocialStatusFilters.includes(row.social_post.status)
            : false));
      const matchesSocialProduct =
        effectiveSocialProductFilters.length === 0 ||
        (row.content_type === "blog" ||
          (row.social_post?.product !== null &&
            row.social_post?.product !== undefined &&
            effectiveSocialProductFilters.includes(row.social_post.product)));
      return (
        matchesLensFilter &&
        matchesMetricFilter &&
        matchesCrossWorkflowFilters &&
        matchesCrossDeliveryFilters &&
        matchesSearch &&
        matchesContentType &&
        matchesAssignedTo &&
        matchesSite &&
        matchesStatus &&
        matchesWriter &&
        matchesPublisher &&
        matchesWriterStatus &&
        matchesPublisherStatus &&
        matchesSocialStatus &&
        matchesSocialProduct
      );
    },
    [
      activeMetricFilter,
      assignedToFilters,
      contentTypeFilters,
      crossDeliveryFilters,
      crossWorkflowFilters,
      debouncedSearch,
      lens,
      publisherFilters,
      publisherStatusFilters,
      siteFilters,
      socialProductFilters,
      socialStatusFilters,
      statusFilters,
      user?.id,
      writerFilters,
      writerStatusFilters,
    ]
  );
  const filteredRows = useMemo(
    () => dashboardRows.filter((row) => matchesDashboardRow(row)),
    [dashboardRows, matchesDashboardRow]
  );
  const facetFilterOptionCounts = useMemo(() => {
    const countRowsForFacet = (
      overrides: DashboardRowFilterOverrides,
      rowPredicate?: (row: DashboardContentRow) => boolean
    ) =>
      dashboardRows.reduce((count, row) => {
        if (rowPredicate && !rowPredicate(row)) {
          return count;
        }
        return matchesDashboardRow(row, overrides) ? count + 1 : count;
      }, 0);

    return {
      contentType: Object.fromEntries(
        contentTypeFilterOptions.map((option) => [
          option.value,
          countRowsForFacet({ contentTypeFilters: [option.value] }),
        ])
      ) as Record<string, number>,
      crossWorkflow: Object.fromEntries(
        crossWorkflowFilterOptions.map((option) => [
          option.value,
          countRowsForFacet({ crossWorkflowFilters: [option.value] }),
        ])
      ) as Record<string, number>,
      assignedTo: Object.fromEntries(
        assignedToFilterOptions.map((option) => [
          option.value,
          countRowsForFacet({ assignedToFilters: [option.value] }),
        ])
      ) as Record<string, number>,
      site: Object.fromEntries(
        siteFilterOptions.map((option) => [
          option.value,
          countRowsForFacet({ siteFilters: [option.value as BlogSite] }),
        ])
      ) as Record<string, number>,
      crossDelivery: Object.fromEntries(
        crossDeliveryFilterOptions.map((option) => [
          option.value,
          countRowsForFacet({ crossDeliveryFilters: [option.value] }),
        ])
      ) as Record<string, number>,
      status: Object.fromEntries(
        overallStatusFilterOptions.map((option) => [
          option.value,
          countRowsForFacet(
            { statusFilters: [option.value] },
            (row) => row.content_type === "blog"
          ),
        ])
      ) as Record<string, number>,
      writer: Object.fromEntries(
        writerFilterOptions.map((option) => [
          option.value,
          countRowsForFacet(
            { writerFilters: [option.value] },
            (row) => row.content_type === "blog"
          ),
        ])
      ) as Record<string, number>,
      publisher: Object.fromEntries(
        publisherFilterOptions.map((option) => [
          option.value,
          countRowsForFacet(
            { publisherFilters: [option.value] },
            (row) => row.content_type === "blog"
          ),
        ])
      ) as Record<string, number>,
      writerStatus: Object.fromEntries(
        writerStatusFilterOptions.map((option) => [
          option.value,
          countRowsForFacet(
            { writerStatusFilters: [option.value] },
            (row) => row.content_type === "blog"
          ),
        ])
      ) as Record<string, number>,
      publisherStatus: Object.fromEntries(
        publisherStatusFilterOptions.map((option) => [
          option.value,
          countRowsForFacet(
            { publisherStatusFilters: [option.value] },
            (row) => row.content_type === "blog"
          ),
        ])
      ) as Record<string, number>,
      socialStatus: Object.fromEntries(
        socialStatusFilterOptions.map((option) => [
          option.value,
          countRowsForFacet(
            { socialStatusFilters: [option.value] },
            (row) => row.content_type === "social_post"
          ),
        ])
      ) as Record<string, number>,
      socialProduct: Object.fromEntries(
        socialProductFilterOptions.map((option) => [
          option.value,
          countRowsForFacet(
            { socialProductFilters: [option.value] },
            (row) => row.content_type === "social_post"
          ),
        ])
      ) as Record<string, number>,
    };
  }, [
    assignedToFilterOptions,
    contentTypeFilterOptions,
    crossDeliveryFilterOptions,
    crossWorkflowFilterOptions,
    dashboardRows,
    matchesDashboardRow,
    overallStatusFilterOptions,
    publisherFilterOptions,
    publisherStatusFilterOptions,
    siteFilterOptions,
    socialProductFilterOptions,
    socialStatusFilterOptions,
    writerFilterOptions,
    writerStatusFilterOptions,
  ]);
  const withFacetCountLabel = useCallback(
    (label: string, value: string, counts: Record<string, number>) =>
      `${label} (${counts[value] ?? 0})`,
    []
  );
  const contentTypeFilterOptionsWithCounts = useMemo(
    () =>
      contentTypeFilterOptions.map((option) => ({
        ...option,
        label: withFacetCountLabel(
          option.label,
          option.value,
          facetFilterOptionCounts.contentType
        ),
        selectedLabel: option.label,
      })),
    [contentTypeFilterOptions, facetFilterOptionCounts.contentType, withFacetCountLabel]
  );
  const crossWorkflowFilterOptionsWithCounts = useMemo(
    () =>
      crossWorkflowFilterOptions.map((option) => ({
        ...option,
        label: withFacetCountLabel(
          option.label,
          option.value,
          facetFilterOptionCounts.crossWorkflow
        ),
        selectedLabel: option.label,
      })),
    [
      crossWorkflowFilterOptions,
      facetFilterOptionCounts.crossWorkflow,
      withFacetCountLabel,
    ]
  );
  const assignedToFilterOptionsWithCounts = useMemo(
    () =>
      assignedToFilterOptions.map((option) => ({
        ...option,
        label: withFacetCountLabel(
          option.label,
          option.value,
          facetFilterOptionCounts.assignedTo
        ),
        selectedLabel: option.label,
      })),
    [assignedToFilterOptions, facetFilterOptionCounts.assignedTo, withFacetCountLabel]
  );
  const siteFilterOptionsWithCounts = useMemo(
    () =>
      siteFilterOptions.map((option) => ({
        ...option,
        label: withFacetCountLabel(
          option.label,
          option.value,
          facetFilterOptionCounts.site
        ),
        selectedLabel: option.label,
      })),
    [facetFilterOptionCounts.site, siteFilterOptions, withFacetCountLabel]
  );
  const crossDeliveryFilterOptionsWithCounts = useMemo(
    () =>
      crossDeliveryFilterOptions.map((option) => ({
        ...option,
        label: withFacetCountLabel(
          option.label,
          option.value,
          facetFilterOptionCounts.crossDelivery
        ),
        selectedLabel: option.label,
      })),
    [
      crossDeliveryFilterOptions,
      facetFilterOptionCounts.crossDelivery,
      withFacetCountLabel,
    ]
  );
  const overallStatusFilterOptionsWithCounts = useMemo(
    () =>
      overallStatusFilterOptions.map((option) => ({
        ...option,
        label: withFacetCountLabel(
          option.label,
          option.value,
          facetFilterOptionCounts.status
        ),
        selectedLabel: option.label,
      })),
    [facetFilterOptionCounts.status, overallStatusFilterOptions, withFacetCountLabel]
  );
  const writerFilterOptionsWithCounts = useMemo(
    () =>
      writerFilterOptions.map((option) => ({
        ...option,
        label: withFacetCountLabel(
          option.label,
          option.value,
          facetFilterOptionCounts.writer
        ),
        selectedLabel: option.label,
      })),
    [facetFilterOptionCounts.writer, withFacetCountLabel, writerFilterOptions]
  );
  const publisherFilterOptionsWithCounts = useMemo(
    () =>
      publisherFilterOptions.map((option) => ({
        ...option,
        label: withFacetCountLabel(
          option.label,
          option.value,
          facetFilterOptionCounts.publisher
        ),
        selectedLabel: option.label,
      })),
    [facetFilterOptionCounts.publisher, publisherFilterOptions, withFacetCountLabel]
  );
  const writerStatusFilterOptionsWithCounts = useMemo(
    () =>
      writerStatusFilterOptions.map((option) => ({
        ...option,
        label: withFacetCountLabel(
          option.label,
          option.value,
          facetFilterOptionCounts.writerStatus
        ),
        selectedLabel: option.label,
      })),
    [
      facetFilterOptionCounts.writerStatus,
      withFacetCountLabel,
      writerStatusFilterOptions,
    ]
  );
  const publisherStatusFilterOptionsWithCounts = useMemo(
    () =>
      publisherStatusFilterOptions.map((option) => ({
        ...option,
        label: withFacetCountLabel(
          option.label,
          option.value,
          facetFilterOptionCounts.publisherStatus
        ),
        selectedLabel: option.label,
      })),
    [
      facetFilterOptionCounts.publisherStatus,
      publisherStatusFilterOptions,
      withFacetCountLabel,
    ]
  );
  const socialStatusFilterOptionsWithCounts = useMemo(
    () =>
      socialStatusFilterOptions.map((option) => ({
        ...option,
        label: withFacetCountLabel(
          option.label,
          option.value,
          facetFilterOptionCounts.socialStatus
        ),
        selectedLabel: option.label,
      })),
    [
      facetFilterOptionCounts.socialStatus,
      socialStatusFilterOptions,
      withFacetCountLabel,
    ]
  );
  const socialProductFilterOptionsWithCounts = useMemo(
    () =>
      socialProductFilterOptions.map((option) => ({
        ...option,
        label: withFacetCountLabel(
          option.label,
          option.value,
          facetFilterOptionCounts.socialProduct
        ),
        selectedLabel: option.label,
      })),
    [
      facetFilterOptionCounts.socialProduct,
      socialProductFilterOptions,
      withFacetCountLabel,
    ]
  );

  const sortedRows = useMemo(() => {
    const collator = new Intl.Collator(undefined, { sensitivity: "base" });
    const directionMultiplier = sortDirection === "asc" ? 1 : -1;
    const compareDateValues = (leftDate: string | null, rightDate: string | null) => {
      if (!leftDate && !rightDate) {
        return 0;
      }
      if (!leftDate) {
        return 1;
      }
      if (!rightDate) {
        return -1;
      }
      return leftDate.localeCompare(rightDate);
    };
    return [...filteredRows].sort((left, right) => {
      let compareResult = 0;
      if (sortField === "scheduled_date") {
        compareResult = compareDateValues(left.scheduled_date, right.scheduled_date);
      } else if (sortField === "published_date") {
        compareResult = compareDateValues(left.published_date, right.published_date);
      } else if (sortField === "updated_at") {
        compareResult = compareDateValues(left.updated_at, right.updated_at);
      } else if (sortField === "title") {
        compareResult = collator.compare(left.title, right.title);
      } else if (sortField === "site") {
        compareResult = collator.compare(left.site, right.site);
      } else if (sortField === "content_type") {
        compareResult = collator.compare(left.content_label, right.content_label);
      } else if (sortField === "id") {
        compareResult = collator.compare(left.id, right.id);
      } else if (sortField === "status_display") {
        compareResult = collator.compare(left.status_display, right.status_display);
      } else if (sortField === "lifecycle_bucket") {
        compareResult = collator.compare(left.lifecycle_bucket, right.lifecycle_bucket);
      } else if (sortField === "owner_display") {
        compareResult = collator.compare(left.owner_display, right.owner_display);
      } else if (sortField === "product") {
        compareResult = collator.compare(left.product ?? "", right.product ?? "");
      }

      return compareResult * directionMultiplier;
    });
  }, [filteredRows, sortDirection, sortField]);

  const pageCount = useMemo(
    () => getTablePageCount(sortedRows.length, rowLimit),
    [rowLimit, sortedRows.length]
  );

  useEffect(() => {
    setCurrentPage((previous) => Math.min(previous, pageCount));
  }, [pageCount]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    activeMetricFilter,
    assignedToFilters,
    contentTypeFilters,
    crossDeliveryFilters,
    crossWorkflowFilters,
    lens,
    publisherFilters,
    publisherStatusFilters,
    rowLimit,
    search,
    siteFilters,
    socialProductFilters,
    socialStatusFilters,
    sortDirection,
    sortField,
    statusFilters,
    writerFilters,
    writerStatusFilters,
  ]);
  useEffect(() => {
    if (!tableContainerRef.current) {
      return;
    }
    tableContainerRef.current.scrollTop = 0;
  }, [
    activeMetricFilter,
    assignedToFilters,
    contentTypeFilters,
    crossDeliveryFilters,
    crossWorkflowFilters,
    lens,
    publisherFilters,
    publisherStatusFilters,
    rowLimit,
    search,
    siteFilters,
    socialProductFilters,
    socialStatusFilters,
    sortDirection,
    sortField,
    statusFilters,
    writerFilters,
    writerStatusFilters,
  ]);
  useEffect(() => {
    if (isLoading) {
      return;
    }
    setIsApplyingFilterFeedback(true);
    const timeoutId = window.setTimeout(() => {
      setIsApplyingFilterFeedback(false);
    }, 180);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    activeMetricFilter,
    assignedToFilters,
    currentPage,
    contentTypeFilters,
    crossDeliveryFilters,
    crossWorkflowFilters,
    isLoading,
    lens,
    publisherFilters,
    publisherStatusFilters,
    rowLimit,
    search,
    siteFilters,
    socialProductFilters,
    socialStatusFilters,
    sortDirection,
    sortField,
    statusFilters,
    writerFilters,
    writerStatusFilters,
  ]);

  const pagedRows = useMemo(
    () => getTablePageRows(sortedRows, currentPage, rowLimit),
    [currentPage, rowLimit, sortedRows]
  );

  const assignmentOptions = useMemo(
    () =>
      assignableUsers.length > 0
        ? assignableUsers
        : Array.from(
            new Map(
              [...writerOptions, ...publisherOptions].map((user) => [
                user.id,
                {
                  id: user.id,
                  full_name: user.full_name,
                  email: user.email,
                },
              ])
            ).values()
          ),
    [assignableUsers, publisherOptions, writerOptions]
  );


  const focusStripMetrics = overviewMetrics;

  const visibleBlogIds = useMemo(
    () =>
      pagedRows
        .filter((row) => row.content_type === "blog")
        .map((row) => row.id),
    [pagedRows]
  );
  const visibleSocialPostIds = useMemo(
    () =>
      pagedRows
        .filter((row) => row.content_type === "social_post")
        .map((row) => row.id),
    [pagedRows]
  );
  const sortedBlogRows = useMemo(
    () => sortedRows.filter((row) => row.content_type === "blog"),
    [sortedRows]
  );
  const activeBlogIndex = useMemo(
    () => sortedBlogRows.findIndex((blog) => blog.id === activeBlogId),
    [activeBlogId, sortedBlogRows]
  );
  const hiddenColumnSet = useMemo(() => new Set(hiddenColumns), [hiddenColumns]);
  const visibleColumnOrder = useMemo(
    () => {
      const visibleColumns = columnOrder.filter((column) => !hiddenColumnSet.has(column));
      const missingRequiredColumns = REQUIRED_DASHBOARD_COLUMNS.filter(
        (column) => !visibleColumns.includes(column)
      );
      const nextVisibleColumns = [...visibleColumns, ...missingRequiredColumns];
      return nextVisibleColumns.length > 0
        ? nextVisibleColumns
        : [...REQUIRED_DASHBOARD_COLUMNS];
    },
    [columnOrder, hiddenColumnSet]
  );
  const selectedBlogIdSet = useMemo(() => new Set(selectedBlogIds), [selectedBlogIds]);
  const selectedSocialPostIdSet = useMemo(
    () => new Set(selectedSocialPostIds),
    [selectedSocialPostIds]
  );
  const selectedRowKeySet = useMemo(
    () =>
      new Set([
        ...selectedBlogIds.map((id) => `blog:${id}`),
        ...selectedSocialPostIds.map((id) => `social_post:${id}`),
      ]),
    [selectedBlogIds, selectedSocialPostIds]
  );
  const selectedExportRows = useMemo(
    () =>
      sortedRows.filter(
        (row) =>
          (row.content_type === "blog" && selectedBlogIdSet.has(row.id)) ||
          (row.content_type === "social_post" && selectedSocialPostIdSet.has(row.id))
      ),
    [selectedBlogIdSet, selectedSocialPostIdSet, sortedRows]
  );
  const selectedBlogs = useMemo(
    () => blogs.filter((blog) => selectedBlogIdSet.has(blog.id)),
    [blogs, selectedBlogIdSet]
  );
  const selectedRowCount = selectedBlogIds.length + selectedSocialPostIds.length;
  const hasSocialSelection = selectedSocialPostIds.length > 0;
  const hasBlogSelection = selectedBlogIds.length > 0;
  const hasOnlyBlogSelection = hasBlogSelection && !hasSocialSelection;
  const hasOnlySocialSelection = !hasBlogSelection && hasSocialSelection;
  const hasPendingBulkChanges =
    Boolean(bulkWriterId) ||
    Boolean(bulkPublisherId) ||
    Boolean(bulkWriterStatus) ||
    Boolean(bulkPublisherStatus);

  // Validation: Check if required fields are filled based on what's being changed
  // If changing writer status but no writer assigned/selected, it's invalid
  const getBulkActionValidationError = (): string | null => {
    if (!hasPendingBulkChanges) {
      return null;
    }

    // If trying to set writer status but no writer is assigned
    if (bulkWriterStatus && bulkWriterStatus !== "not_started") {
      const selectedWithoutWriter = selectedBlogs.filter(
        (blog) => !blog.writer_id && !bulkWriterId
      );
      if (selectedWithoutWriter.length > 0) {
        return "Select a writer to apply writer status changes.";
      }
    }

    // If trying to set publisher status but no publisher is assigned
    if (bulkPublisherStatus && bulkPublisherStatus !== "not_started") {
      const selectedWithoutPublisher = selectedBlogs.filter(
        (blog) => !blog.publisher_id && !bulkPublisherId
      );
      if (selectedWithoutPublisher.length > 0) {
        return "Select a publisher to apply publisher status changes.";
      }
    }

    return null;
  };

  const bulkValidationError = getBulkActionValidationError();

  const handleToggleAllVisible = (checked: boolean) => {
    if (!canSelectRows) {
      return;
    }
    if (!checked) {
      setSelectedBlogIds((previous) =>
        previous.filter((id) => !visibleBlogIds.includes(id))
      );
      setSelectedSocialPostIds((previous) =>
        previous.filter((id) => !visibleSocialPostIds.includes(id))
      );
      return;
    }

    setSelectedBlogIds((previous) =>
      Array.from(new Set([...previous, ...visibleBlogIds]))
    );
    setSelectedSocialPostIds((previous) =>
      Array.from(new Set([...previous, ...visibleSocialPostIds]))
    );
  };

  const handleToggleSingle = (
    row: Pick<DashboardContentRow, "content_type" | "id">,
    checked: boolean
  ) => {
    if (!canSelectRows) {
      return;
    }
    if (row.content_type === "blog") {
      if (checked) {
        setSelectedBlogIds((previous) => Array.from(new Set([...previous, row.id])));
        return;
      }
      setSelectedBlogIds((previous) => previous.filter((id) => id !== row.id));
      return;
    }
    if (checked) {
      setSelectedSocialPostIds((previous) =>
        Array.from(new Set([...previous, row.id]))
      );
      return;
    }
    setSelectedSocialPostIds((previous) =>
      previous.filter((id) => id !== row.id)
    );
  };
  const handleSortByColumn = (column: DashboardColumnKey) => {
    if (sortField === column) {
      setSortDirection((previous) => (previous === "asc" ? "desc" : "asc"));
      return;
    }
    setSortField(column);
    setSortDirection("asc");
  };

  const clearBulkUiState = () => {
    setSelectedBlogIds([]);
    setSelectedSocialPostIds([]);
    setBulkWriterId("");
    setBulkPublisherId("");
    setBulkWriterStatus("");
    setBulkPublisherStatus("");
  };
  const toggleColumnVisibility = (column: DashboardColumnKey) => {
    setHiddenColumns((previous) => {
      if (previous.includes(column)) {
        return previous.filter((hiddenColumn) => hiddenColumn !== column);
      }
      const currentlyVisibleColumns = columnOrder.filter(
        (columnKey) => !previous.includes(columnKey)
      );
      if (currentlyVisibleColumns.length <= 1) {
        return previous;
      }
      return [...previous, column];
    });
  };


  const resetColumnView = () => {
    setColumnOrder(DEFAULT_DASHBOARD_COLUMN_ORDER);
    setHiddenColumns(DEFAULT_DASHBOARD_HIDDEN_COLUMNS);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(columnViewStorageKey);
      window.localStorage.removeItem(columnHiddenStorageKey);
    }
    setError(null);
    setSuccessMessage("Column view reset to default.");
  };

  const applySavedView = useCallback(
    (view: SavedDashboardView) => {
      applyFilterState(view.state);
      setColumnOrder(view.columnOrder);
      setActiveSavedViewId(view.id);
      setError(null);
      setSuccessMessage(`Applied saved view "${view.name}".`);
    },
    [applyFilterState]
  );

  const resetDashboardFilters = useCallback(() => {
    applyFilterState(DEFAULT_DASHBOARD_FILTER_STATE);
    setActiveMetricFilter(null);
    setActiveSavedViewId(null);
    setIsAdvancedFiltersOpen(false);
    setError(null);
    setSuccessMessage("Dashboard filters reset.");
  }, [applyFilterState]);
  const clearAllFilters = useCallback(() => {
    resetDashboardFilters();
    setSuccessMessage("All filters cleared.");
  }, [resetDashboardFilters]);
  const clearAdvancedFilters = useCallback(() => {
    setCrossDeliveryFilters([]);
    setStatusFilters([]);
    setWriterFilters([]);
    setPublisherFilters([]);
    setWriterStatusFilters([]);
    setPublisherStatusFilters([]);
    setSocialStatusFilters([]);
    setSocialProductFilters([]);
    setSuccessMessage("Advanced filters cleared.");
  }, []);
  const saveCurrentLensShortcut = useCallback(() => {
    const existingShortcut = savedLensShortcuts.find(
      (shortcut) => shortcut.lens === lens
    );
    if (existingShortcut) {
      setSuccessMessage(`Lens shortcut "${existingShortcut.name}" is already saved.`);
      return;
    }
    const nowIso = new Date().toISOString();
    const nextId =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}`;
    const shortcutName = DASHBOARD_LENS_LABELS[lens];
    setSavedLensShortcuts((previous) => [
      ...previous,
      {
        id: nextId,
        name: shortcutName,
        lens,
        createdAt: nowIso,
        updatedAt: nowIso,
      },
    ]);
    setSuccessMessage(`Saved lens shortcut "${shortcutName}".`);
  }, [lens, savedLensShortcuts]);
  const applyLensShortcut = useCallback((shortcut: SavedLensShortcut) => {
    setLens(shortcut.lens);
    setSuccessMessage(`Applied lens shortcut "${shortcut.name}".`);
  }, []);
  const removeLensShortcut = useCallback((shortcut: SavedLensShortcut) => {
    setSavedLensShortcuts((previous) =>
      previous.filter((entry) => entry.id !== shortcut.id)
    );
    setSuccessMessage(`Removed lens shortcut "${shortcut.name}".`);
  }, []);
  const sortedSavedLensShortcuts = useMemo(
    () =>
      [...savedLensShortcuts].sort(
        (left, right) =>
          DASHBOARD_LENS_ORDER.indexOf(left.lens) -
          DASHBOARD_LENS_ORDER.indexOf(right.lens)
      ),
    [savedLensShortcuts]
  );

  const activeFilterPills = useMemo(
    () =>
      [
        lens !== DEFAULT_DASHBOARD_FILTER_STATE.lens
          ? {
              id: "lens",
              label: `Lens: ${DASHBOARD_LENS_LABELS[lens]}`,
              onRemove: () => {
                setLens(DEFAULT_DASHBOARD_FILTER_STATE.lens);
              },
            }
          : null,
        search.trim()
          ? {
              id: "search",
              label: `Search: ${search.trim()}`,
              onRemove: () => {
                setSearch("");
              },
            }
          : null,
        ...siteFilters.map((site) => ({
          id: `site-${site}`,
          label: `Site: ${getSiteShortLabel(site)}`,
          onRemove: () => {
            setSiteFilters((previous) => previous.filter((value) => value !== site));
          },
        })),
        ...contentTypeFilters.map((value) => ({
          id: `content-type-${value}`,
          label: `Type: ${MIXED_CONTENT_FILTER_LABELS[value]}`,
          onRemove: () => {
            setContentTypeFilters((previous) =>
              previous.filter((entry) => entry !== value)
            );
          },
        })),
        ...assignedToFilters.map((value) => ({
          id: `assigned-to-${value}`,
          label: `Assigned to: ${value}`,
          onRemove: () => {
            setAssignedToFilters((previous) =>
              previous.filter((entry) => entry !== value)
            );
          },
        })),
        ...writerFilters.map((writerId) => ({
          id: `writer-${writerId}`,
          label: `Writing Assignee: ${
            filterUserOptions.find((writer) => writer.value === writerId)?.label ?? writerId
          }`,
          onRemove: () => {
            setWriterFilters((previous) => previous.filter((value) => value !== writerId));
          },
        })),
        ...publisherFilters.map((publisherId) => ({
          id: `publisher-${publisherId}`,
          label: `Publishing Assignee: ${
            filterUserOptions.find((publisher) => publisher.value === publisherId)?.label ??
            publisherId
          }`,
          onRemove: () => {
            setPublisherFilters((previous) => previous.filter((value) => value !== publisherId));
          },
        })),
        ...writerStatusFilters.map((status) => ({
          id: `writer-status-${status}`,
          label: `Writing Status: ${WRITER_STATUS_LABELS[status]}`,
          onRemove: () => {
            setWriterStatusFilters((previous) => previous.filter((value) => value !== status));
          },
        })),
        ...publisherStatusFilters.map((status) => ({
          id: `publisher-status-${status}`,
          label: `Publishing Status: ${PUBLISHER_STATUS_LABELS[status]}`,
          onRemove: () => {
            setPublisherStatusFilters((previous) => previous.filter((value) => value !== status));
          },
        })),
        ...socialStatusFilters.map((status) => ({
          id: `social-status-${status}`,
          label: `Social Status: ${status
            .replaceAll("_", " ")
            .replace(/\b\w/g, (char) => char.toUpperCase())}`,
          onRemove: () => {
            setSocialStatusFilters((previous) =>
              previous.filter((value) => value !== status)
            );
          },
        })),
        ...socialProductFilters.map((product) => ({
          id: `social-product-${product}`,
          label: `Social Product: ${product}`,
          onRemove: () => {
            setSocialProductFilters((previous) =>
              previous.filter((value) => value !== product)
            );
          },
        })),
        ...crossWorkflowFilters.map((filterValue) => ({
          id: `cross-workflow-${filterValue}`,
          label: `Status: ${CROSS_CONTENT_WORKFLOW_FILTER_LABELS[filterValue]}`,
          onRemove: () => {
            setCrossWorkflowFilters((previous) =>
              previous.filter((value) => value !== filterValue)
            );
          },
        })),
        ...crossDeliveryFilters.map((filterValue) => ({
          id: `cross-delivery-${filterValue}`,
          label: `Delivery: ${CROSS_CONTENT_DELIVERY_FILTER_LABELS[filterValue]}`,
          onRemove: () => {
            setCrossDeliveryFilters((previous) =>
              previous.filter((value) => value !== filterValue)
            );
          },
        })),
        ...statusFilters.map((status) => ({
          id: `overall-status-${status}`,
          label: `Blog Stage: ${STATUS_LABELS[status]}`,
          onRemove: () => {
            setStatusFilters((previous) => previous.filter((value) => value !== status));
          },
        })),
        activeMetricFilter
          ? {
              id: "metric",
              label: `Metric: ${METRIC_FILTER_LABELS[activeMetricFilter]}`,
              onRemove: () => {
                setActiveMetricFilter(null);
              },
            }
          : null,
      ].filter((pill) => pill !== null),
    [
      activeMetricFilter,
      assignedToFilters,
      contentTypeFilters,
      filterUserOptions,
      lens,
      publisherFilters,
      publisherStatusFilters,
      search,
      siteFilters,
      socialProductFilters,
      socialStatusFilters,
      statusFilters,
      writerFilters,
      writerStatusFilters,
      crossDeliveryFilters,
      crossWorkflowFilters,
    ]
  );

  const saveCurrentFiltersAsView = useCallback(() => {
    const baseName = `View ${formatDateInTimezone(new Date().toISOString(), profile?.timezone, "MMM d yyyy, h:mm a")}`;
    const existingNames = new Set(savedViews.map((view) => view.name.toLowerCase()));
    let trimmedName = baseName;
    if (existingNames.has(trimmedName.toLowerCase())) {
      let suffix = 2;
      while (existingNames.has(`${baseName} (${suffix})`.toLowerCase())) {
        suffix += 1;
      }
      trimmedName = `${baseName} (${suffix})`;
    }

    const snapshot = buildCurrentFilterState();
    const snapshotColumnOrder = [...columnOrder];
    const nowIso = new Date().toISOString();
    const nextId =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}`;
    setSavedViews((previous) => [
      ...previous,
      {
        id: nextId,
        name: trimmedName,
        state: snapshot,
        columnOrder: snapshotColumnOrder,
        createdAt: nowIso,
        updatedAt: nowIso,
      },
    ]);
    setActiveSavedViewId(nextId);
    setError(null);
    setSuccessMessage(`Saved new view "${trimmedName}".`);
  }, [buildCurrentFilterState, columnOrder, profile?.timezone, savedViews]);


  const getExportCellValue = useCallback(
    (row: DashboardContentRow, column: DashboardColumnKey) => {
      if (column === "content_type") {
        return row.content_label;
      }
      if (column === "site") {
        return row.site;
      }
      if (column === "id") {
        return row.id;
      }
      if (column === "title") {
        return row.title;
      }
      if (column === "status_display") {
        return row.status_display;
      }
      if (column === "lifecycle_bucket") {
        return row.lifecycle_bucket.replaceAll("_", " ");
      }
      if (column === "scheduled_date") {
        return formatDateOnly(row.scheduled_date) || "—";
      }
      if (column === "published_date") {
        return formatDateOnly(row.published_date) || "—";
      }
      if (column === "owner_display") {
        return row.owner_display;
      }
      if (column === "updated_at") {
        return formatDateInTimezone(row.updated_at, profile?.timezone);
      }
      return row.product ?? "—";
    },
    [profile?.timezone]
  );

  const buildCsvContent = useCallback(
    (rows: DashboardContentRow[]) => {
      const headers = visibleColumnOrder.map((column) =>
        escapeCsvValue(DASHBOARD_COLUMN_LABELS[column])
      );
      const csvRows = rows.map((row) =>
        visibleColumnOrder
          .map((column) => escapeCsvValue(getExportCellValue(row, column)))
          .join(",")
      );
      return [headers.join(","), ...csvRows].join("\n");
    },
    [getExportCellValue, visibleColumnOrder]
  );

  const triggerCsvDownload = useCallback((csvContent: string, filename: string) => {
    const blob = new Blob([`\uFEFF${csvContent}`], {
      type: "text/csv;charset=utf-8;",
    });
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(downloadUrl);
  }, []);

  const getSmartExportScope = (): "selected" | "view" => {
    return selectedRowCount === 0 ? "view" : "selected";
  };
  const handleCopyValues = useCallback(async (field: "title" | "url") => {
    const values =
      field === "title"
        ? sortedRows.map((row) => row.title)
        : sortedRows
            .map((row) =>
              row.content_type === "blog" ? row.blog?.live_url ?? "" : ""
            )
            .filter((value) => value.length > 0);
    if (values.length === 0) {
      setError(field === "title" ? "No titles to copy." : "No URLs to copy.");
      setSuccessMessage(null);
      return;
    }
    try {
      await navigator.clipboard.writeText(values.join("\n"));
      setError(null);
      setSuccessMessage(field === "title" ? "Copied all titles." : "Copied all URLs.");
    } catch {
      setError("Could not copy to clipboard.");
      setSuccessMessage(null);
    }
  }, [sortedRows]);

  const handleExportCsv = useCallback((scope: "selected" | "view") => {
    if (scope === "selected" && !canExportSelectedCsv) {
      setError("You do not have permission to export selected CSV.");
      setSuccessMessage(null);
      return;
    }
    if (scope === "view" && !canExportCsv) {
      setError("You do not have permission to export CSV.");
      setSuccessMessage(null);
      return;
    }
    const rowsToExport = scope === "selected" ? selectedExportRows : sortedRows;
    if (rowsToExport.length === 0) {
      setError(
        scope === "selected"
          ? "Select at least one row before exporting CSV."
          : "No rows available in the current view to export."
      );
      setSuccessMessage(null);
      return;
    }

    const csvContent = buildCsvContent(rowsToExport);
    const timestamp = new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-");
    const filename = `dashboard-${scope}-${timestamp}.csv`;
    triggerCsvDownload(csvContent, filename);
    setError(null);
    setSuccessMessage(`Exported ${rowsToExport.length} row(s) as CSV.`);
  }, [
    buildCsvContent,
    canExportCsv,
    canExportSelectedCsv,
    selectedExportRows,
    sortedRows,
    triggerCsvDownload,
  ]);

  const handleExportPdf = useCallback(
    (scope: "selected" | "view") => {
      if (scope === "selected" && !canExportSelectedCsv) {
        setError("You do not have permission to export selected PDF.");
        setSuccessMessage(null);
        return;
      }
      if (scope === "view" && !canExportCsv) {
        setError("You do not have permission to export PDF.");
        setSuccessMessage(null);
        return;
      }

      const rowsToExport = scope === "selected" ? selectedExportRows : sortedRows;
      if (rowsToExport.length === 0) {
        setError(
          scope === "selected"
            ? "Select at least one row before exporting PDF."
            : "No rows available in the current view to export."
        );
        setSuccessMessage(null);
        return;
      }

      const popup = window.open("", "_blank", "width=1100,height=800");
      if (!popup) {
        setError("Popup blocked. Allow popups to export PDF.");
        setSuccessMessage(null);
        return;
      }

      const generatedAt = formatDateInTimezone(new Date().toISOString(), profile?.timezone, "MMM d yyyy, h:mm a");
      const headerMarkup = visibleColumnOrder
        .map((column) => `<th>${escapeHtmlValue(DASHBOARD_COLUMN_LABELS[column])}</th>`)
        .join("");
      const rowsMarkup = rowsToExport
        .map((row) => {
          const cells = visibleColumnOrder
            .map((column) => `<td>${escapeHtmlValue(getExportCellValue(row, column))}</td>`)
            .join("");
          return `<tr>${cells}</tr>`;
        })
        .join("");

      popup.document.open();
      popup.document.write(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Dashboard Export</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #0f172a; padding: 24px; }
    h1 { margin: 0 0 12px 0; font-size: 20px; }
    p { margin: 0 0 18px 0; color: #475569; font-size: 13px; }
    table { border-collapse: collapse; width: 100%; font-size: 12px; }
    th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; vertical-align: top; word-break: break-word; }
    th { background: #f8fafc; font-weight: 600; }
  </style>
</head>
<body>
  <h1>Dashboard Export</h1>
  <p>Generated ${escapeHtmlValue(generatedAt)}</p>
  <table>
    <thead><tr>${headerMarkup}</tr></thead>
    <tbody>${rowsMarkup}</tbody>
  </table>
</body>
</html>`);
      popup.document.close();

      const triggerPrintWhenReady = () => {
        if (popup.closed) {
          return;
        }
        const isReady = popup.document.readyState === "complete";
        const hasBody = Boolean(popup.document.body?.childElementCount);
        if (!isReady || !hasBody) {
          window.setTimeout(triggerPrintWhenReady, 120);
          return;
        }
        popup.focus();
        popup.print();
      };

      window.setTimeout(triggerPrintWhenReady, 180);
      setError(null);
      setSuccessMessage(
        `PDF ready for ${rowsToExport.length} row(s). Use the print dialog to save.`
      );
    },
    [
      canExportCsv,
      canExportSelectedCsv,
      getExportCellValue,
      profile?.timezone,
      selectedExportRows,
      sortedRows,
      visibleColumnOrder,
    ]
  );
  useEffect(() => {
    const handlePaletteAction = (event: Event) => {
      const actionId = (event as CustomEvent<{ actionId?: string }>).detail?.actionId;
      if (actionId === "clear_all_filters") {
        clearAllFilters();
        return;
      }
      if (actionId === "export_current_view") {
        handleExportCsv("view");
      }
    };
    window.addEventListener("command-palette-action", handlePaletteAction as EventListener);
    return () => {
      window.removeEventListener(
        "command-palette-action",
        handlePaletteAction as EventListener
      );
    };
  }, [clearAllFilters, handleExportCsv]);

  const ensureBulkSelection = () => {
    if (selectedBlogIds.length === 0) {
      setError("Select at least one blog for bulk actions.");
      return false;
    }
    if (!hasOnlyBlogSelection) {
      setError("Bulk updates only work with blog selections. Deselect social posts first.");
      return false;
    }
    return true;
  };

  const runBulkMutation = async (run: () => Promise<string>) => {
    setIsBulkSaving(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const successText = await run();
      clearBulkUiState();
      await loadData();
      setSuccessMessage(successText);
    } catch (mutationError) {
      const message =
        mutationError instanceof Error ? mutationError.message : "We couldn't apply bulk changes.";
      setError(message);
    } finally {
      setIsBulkSaving(false);
    }
  };

  const handleBulkApplyChanges = () => {
    if (!ensureBulkSelection()) {
      return;
    }
    if (!hasPendingBulkChanges) {
      setError("Choose at least one bulk change before applying.");
      return;
    }

    const isSettingWriter = Boolean(bulkWriterId);
    const isSettingPublisher = Boolean(bulkPublisherId);

    if (isSettingWriter && !canChangeWriterAssignment) {
      setError("You do not have permission to change writing assignments.");
      return;
    }
    if (isSettingPublisher && !canChangePublisherAssignment) {
      setError("You do not have permission to change publishing assignments.");
      return;
    }
    if (
      bulkWriterStatus &&
      selectedBlogs.some((blog) =>
        !canTransitionWriterStatus(blog.writer_status, bulkWriterStatus, hasPermission)
      )
    ) {
      setError("You do not have permission to apply that writing status change.");
      return;
    }
    if (
      bulkPublisherStatus &&
      selectedBlogs.some((blog) =>
        !canTransitionPublisherStatus(
          blog.publisher_status,
          bulkPublisherStatus,
          hasPermission
        )
      )
    ) {
      setError("You do not have permission to apply that publishing status change.");
      return;
    }

    if (bulkWriterStatus && bulkWriterStatus !== "not_started") {
      const missingWriter = selectedBlogs.filter(
        (blog) => !blog.writer_id && !isSettingWriter
      );
      if (missingWriter.length > 0) {
        setError("Assign writing team first for all selected blogs before changing writing status.");
        return;
      }
    }

    if (bulkPublisherStatus && bulkPublisherStatus !== "not_started") {
      const missingPublisher = selectedBlogs.filter(
        (blog) => !blog.publisher_id && !isSettingPublisher
      );
      if (missingPublisher.length > 0) {
        setError("Assign publishing team first for all selected blogs before changing publishing status.");
        return;
      }
    }

    if (
      bulkWriterStatus &&
      bulkWriterStatus !== "completed" &&
      selectedBlogs.some((blog) => {
        const nextPublisherStatus = bulkPublisherStatus || blog.publisher_status;
        return nextPublisherStatus === "completed";
      })
    ) {
      setError("Writing status cannot be set below completed for already published blogs.");
      return;
    }

    if (
      bulkPublisherStatus === "completed" &&
      selectedBlogs.some((blog) => {
        const nextWriterStatus = bulkWriterStatus || blog.writer_status;
        return nextWriterStatus !== "completed";
      })
    ) {
      setError("Publishing cannot be marked completed unless writing is completed for all selected blogs.");
      return;
    }

    // Build changes summary for preview modal
    const changeLabels: string[] = [];
    if (isSettingWriter) {
      changeLabels.push("writing assignment");
    }
    if (isSettingPublisher) {
      changeLabels.push("publishing assignment");
    }
    if (bulkWriterStatus !== "") {
      changeLabels.push("writing status");
    }
    if (bulkPublisherStatus !== "") {
      changeLabels.push("publishing status");
    }
    const summary = `Apply ${changeLabels.join(", ")} to ${selectedBlogIds.length} blog${selectedBlogIds.length !== 1 ? "s" : ""}.`;

    // Show preview modal instead of immediate execution
    setBulkPreviewChangesSummary(summary);
    setShowBulkPreviewModal(true);
  };

  const handleConfirmBulkChanges = async () => {
    const isSettingWriter = Boolean(bulkWriterId);
    const isSettingPublisher = Boolean(bulkPublisherId);

    const updatePayload: Partial<
      Pick<BlogRecord, "writer_id" | "publisher_id" | "writer_status" | "publisher_status">
    > = {};

    if (isSettingWriter) {
      updatePayload.writer_id = bulkWriterId;
    }
    if (isSettingPublisher) {
      updatePayload.publisher_id = bulkPublisherId;
    }
    if (bulkWriterStatus !== "") {
      updatePayload.writer_status = bulkWriterStatus;
    }
    if (bulkPublisherStatus !== "") {
      updatePayload.publisher_status = bulkPublisherStatus;
    }

    await runBulkMutation(async () => {
      const supabase = getSupabaseBrowserClient();
      const { error: updateError } = await supabase
        .from("blogs")
        .update(updatePayload)
        .in("id", selectedBlogIds);
      if (updateError) {
        throw new Error(updateError.message);
      }

      const appliedChangeLabels: string[] = [];
      if (isSettingWriter) {
        appliedChangeLabels.push("writing assignment");
      }
      if (isSettingPublisher) {
        appliedChangeLabels.push("publishing assignment");
      }
      if (bulkWriterStatus !== "") {
        appliedChangeLabels.push("writing status");
      }
      if (bulkPublisherStatus !== "") {
        appliedChangeLabels.push("publishing status");
      }

      return `Applied ${appliedChangeLabels.join(", ")} to ${selectedBlogIds.length} blog(s).`;
    });

    // Close modal after mutation completes
    setShowBulkPreviewModal(false);
  };

  const handleBulkDelete = async () => {
    if (!canDeleteBlog) {
      setError("You do not have permission to delete blogs.");
      return;
    }
    if (!ensureBulkSelection()) {
      return;
    }
    const selectedIdsSnapshot = [...selectedBlogIds];
    const selectedCount = selectedIdsSnapshot.length;
    setError(null);
    setSuccessMessage(null);
    showWarning(`Delete ${selectedCount} selected blog(s)? This cannot be undone.`, {
      actionLabel: "Delete",
      durationMs: 7000,
      onAction: () => {
        void runBulkMutation(async () => {
          const supabase = getSupabaseBrowserClient();
          const { error: deleteError } = await supabase
            .from("blogs")
            .delete()
            .in("id", selectedIdsSnapshot);
          if (deleteError) {
            throw new Error(deleteError.message);
          }
          return `Deleted ${selectedCount} blog(s).`;
        });
      },
    });
  };


  const updateBlogInline = useCallback(
    async (
      blog: BlogRecord,
      updates: Partial<
        Pick<
          BlogRecord,
          | "writer_id"
          | "publisher_id"
          | "writer_status"
          | "publisher_status"
          | "scheduled_publish_date"
          | "display_published_date"
          | "target_publish_date"
        >
      >,
      message: string
    ) => {
      const nextWriterId =
        updates.writer_id !== undefined ? updates.writer_id : blog.writer_id;
      const nextPublisherId =
        updates.publisher_id !== undefined ? updates.publisher_id : blog.publisher_id;
      const nextWriterStatus =
        updates.writer_status !== undefined ? updates.writer_status : blog.writer_status;
      const nextPublisherStatus =
        updates.publisher_status !== undefined
          ? updates.publisher_status
          : blog.publisher_status;
      const requestedWriterAssignmentChange =
        updates.writer_id !== undefined && updates.writer_id !== blog.writer_id;
      const requestedPublisherAssignmentChange =
        updates.publisher_id !== undefined && updates.publisher_id !== blog.publisher_id;
      const requestedScheduledDateChange =
        updates.scheduled_publish_date !== undefined ||
        updates.target_publish_date !== undefined;
      const requestedDisplayDateChange =
        updates.display_published_date !== undefined;

      if (requestedWriterAssignmentChange && !canChangeWriterAssignment) {
        setError("You do not have permission to change writing assignments.");
        setSuccessMessage(null);
        return;
      }
      if (requestedPublisherAssignmentChange && !canChangePublisherAssignment) {
        setError("You do not have permission to change publishing assignments.");
        setSuccessMessage(null);
        return;
      }
      if (
        updates.writer_status !== undefined &&
        !canTransitionWriterStatus(blog.writer_status, updates.writer_status, hasPermission)
      ) {
        setError("You do not have permission to apply that writing status change.");
        setSuccessMessage(null);
        return;
      }
      if (
        updates.publisher_status !== undefined &&
        !canTransitionPublisherStatus(
          blog.publisher_status,
          updates.publisher_status,
          hasPermission
        )
      ) {
        setError("You do not have permission to apply that publishing status change.");
        setSuccessMessage(null);
        return;
      }
      if (requestedScheduledDateChange && !canEditScheduledDate) {
        setError("You do not have permission to edit the scheduled publish date.");
        setSuccessMessage(null);
        return;
      }
      if (requestedDisplayDateChange && !canEditDisplayDate) {
        setError("You do not have permission to edit the display publish date.");
        setSuccessMessage(null);
        return;
      }

      if (nextWriterStatus !== "not_started" && !nextWriterId) {
        setError("Assign writing team before changing writing status.");
        setSuccessMessage(null);
        return;
      }
      if (nextPublisherStatus !== "not_started" && !nextPublisherId) {
        setError("Assign publishing team before changing publishing status.");
        setSuccessMessage(null);
        return;
      }
      if (nextPublisherStatus === "completed" && nextWriterStatus !== "completed") {
        setError("Writer status must be completed before publisher status can be completed.");
        setSuccessMessage(null);
        return;
      }
      if (nextWriterStatus !== "completed" && nextPublisherStatus === "completed") {
        setError("Writer status cannot be moved below completed after publishing is complete.");
        setSuccessMessage(null);
        return;
      }

      setError(null);
      setSuccessMessage(null);

      const supabase = getSupabaseBrowserClient();
      let { data, error: updateError } = await supabase
        .from("blogs")
        .update(updates)
        .eq("id", blog.id)
        .select(BLOG_SELECT_WITH_DATES_WITH_RELATIONS)
        .single();

      if (isMissingBlogDateColumnsError(updateError)) {
        const legacyUpdates = {
          ...updates,
        };
        delete (legacyUpdates as { scheduled_publish_date?: string | null })
          .scheduled_publish_date;
        delete (legacyUpdates as { display_published_date?: string | null })
          .display_published_date;
        delete (legacyUpdates as { target_publish_date?: string | null }).target_publish_date;

        const fallback = await supabase
          .from("blogs")
          .update(legacyUpdates)
          .eq("id", blog.id)
          .select(BLOG_SELECT_LEGACY_WITH_RELATIONS)
          .single();
        data = fallback.data as typeof data;
        updateError = fallback.error;
      }

      if (updateError) {
        console.error("Blog update failed:", updateError);
        setError("Couldn't save changes. Please try again.");
        setSuccessMessage(null);
        return;
      }

      const nextBlog = normalizeBlogRow(
        (data ?? {}) as Record<string, unknown>
      ) as BlogRecord;
      setBlogs((previous) =>
        previous.map((previousBlog) =>
          previousBlog.id === blog.id ? nextBlog : previousBlog
        )
      );
      
      // Warn if advancing writer status without Google Doc link
      if (
        updates.writer_status !== undefined &&
        updates.writer_status !== "not_started" &&
        updates.writer_status !== "in_progress" &&
        !nextBlog.google_doc_url
      ) {
        setSuccessMessage(
          `${message} (Note: Please add a Google Doc link when available)`
        );
      } else {
        setSuccessMessage(message);
      }
    },
    [
      canChangePublisherAssignment,
      canChangeWriterAssignment,
      canEditDisplayDate,
      canEditScheduledDate,
      hasPermission,
    ]
  );

  const loadPanelData = useCallback(async (blogId: string) => {
    setIsPanelLoading(true);
    setPanelError(null);

    const supabase = getSupabaseBrowserClient();
    const fetchComments = async () => {
      let { data, error } = await supabase
        .schema("public")
        .from("blog_comments")
        .select("id,blog_id,comment,user_id,created_at,author:user_id(id,full_name,email)")
        .eq("blog_id", blogId)
        .order("created_at", { ascending: false });

      if (isMissingBlogCommentUserIdColumnError(error)) {
        const fallback = await supabase
          .schema("public")
          .from("blog_comments")
          .select("id,blog_id,comment,created_by,created_at,author:created_by(id,full_name,email)")
          .eq("blog_id", blogId)
          .order("created_at", { ascending: false });
        data = fallback.data as typeof data;
        error = fallback.error;
      }

      return { data, error };
    };
    const [{ data: historyData, error: historyError }, { data: commentsData, error: commentsError }] =
      await Promise.all([
        supabase
          .from("blog_assignment_history")
          .select("*")
          .eq("blog_id", blogId)
          .order("changed_at", { ascending: false })
          .limit(100),
        fetchComments(),
      ]);

    if (historyError) {
      setPanelError(historyError.message);
      setPanelHistory([]);
      setPanelComments([]);
      setIsPanelLoading(false);
      return;
    }

    setPanelHistory((historyData ?? []) as BlogHistoryRecord[]);
    if (commentsError) {
      if (isMissingBlogCommentsTableError(commentsError)) {
        setPanelComments([]);
        setPanelError(
          "Comments are temporarily unavailable right now. Please try again in a moment."
        );
      } else {
        setPanelComments([]);
        setPanelError(commentsError.message);
      }
    } else {
      setPanelComments(normalizeCommentRows((commentsData ?? []) as Array<Record<string, unknown>>));
    }

    setIsPanelLoading(false);
  }, []);
  const closePanel = useCallback(() => {
    setActiveBlogId(null);
    setPanelError(null);
    setPanelCommentDraft("");
    setIsPanelEditMode(false);
  }, []);

  const openPanel = useCallback((blogId: string) => {
    setActiveBlogId(blogId);
    setIsPanelEditMode(false);
    setPanelError(null);
    setPanelCommentDraft("");
    void loadPanelData(blogId);
  }, [loadPanelData]);

  const activeBlog = useMemo(
    () => blogs.find((blog) => blog.id === activeBlogId) ?? null,
    [activeBlogId, blogs]
  );
  const panelHistoryUserNameById = useMemo(() => {
    const entries: Array<[string, string]> = [];
    for (const nextUser of assignmentOptions) {
      if (nextUser.id && nextUser.full_name) {
        entries.push([nextUser.id, nextUser.full_name]);
      }
    }
    if (activeBlog?.writer?.id && activeBlog.writer.full_name) {
      entries.push([activeBlog.writer.id, activeBlog.writer.full_name]);
    }
    if (activeBlog?.publisher?.id && activeBlog.publisher.full_name) {
      entries.push([activeBlog.publisher.id, activeBlog.publisher.full_name]);
    }
    return Object.fromEntries(entries);
  }, [activeBlog?.publisher, activeBlog?.writer, assignmentOptions]);
  useEffect(() => {
    if (!activeBlogId || sortedBlogRows.length === 0 || activeBlogIndex < 0) {
      return;
    }

    const isFormElement = (eventTarget: EventTarget | null) => {
      if (!(eventTarget instanceof HTMLElement)) {
        return false;
      }
      const tagName = eventTarget.tagName.toLowerCase();
      return (
        eventTarget.isContentEditable ||
        tagName === "input" ||
        tagName === "textarea" ||
        tagName === "select"
      );
    };

    const handlePanelKeyboardNavigation = (event: KeyboardEvent) => {
      if (isFormElement(event.target)) {
        return;
      }
      if (event.key !== "j" && event.key !== "k") {
        return;
      }

      event.preventDefault();
      const direction = event.key === "j" ? 1 : -1;
      const nextIndex =
        (activeBlogIndex + direction + sortedBlogRows.length) %
        sortedBlogRows.length;
      const nextBlog = sortedBlogRows[nextIndex];
      if (!nextBlog) {
        return;
      }
      openPanel(nextBlog.id);
    };

    window.addEventListener("keydown", handlePanelKeyboardNavigation);
    return () => {
      window.removeEventListener("keydown", handlePanelKeyboardNavigation);
    };
  }, [activeBlogId, activeBlogIndex, openPanel, sortedBlogRows]);

  const handlePanelAddComment = async () => {
    if (!activeBlog || !user?.id) {
      return;
    }
    if (!session?.access_token) {
      setPanelError("Your session expired. Please sign in again.");
      return;
    }
    if (!canCreateComments) {
      setPanelError("You do not have permission to add comments.");
      return;
    }

    const trimmedComment = panelCommentDraft.trim();
    if (!trimmedComment) {
      setPanelError("Comment cannot be empty.");
      return;
    }

    setIsPanelCommentSaving(true);
    setPanelError(null);
    const createResponse = await fetch(`/api/blogs/${activeBlog.id}/comments`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${session.access_token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ comment: trimmedComment }),
    }).catch(() => null);
    if (!createResponse) {
      setPanelError("Couldn't add comment. Please try again.");
      setIsPanelCommentSaving(false);
      return;
    }
    const createPayload = await parseApiResponseJson<Record<string, unknown>>(createResponse);
    if (isApiFailure(createResponse, createPayload)) {
      setPanelError(getApiErrorMessage(createPayload, "Couldn't add comment. Please try again."));
      setIsPanelCommentSaving(false);
      return;
    }

    setPanelCommentDraft("");
    await loadPanelData(activeBlog.id);
    setIsPanelCommentSaving(false);
  };
  const sortedSavedViews = useMemo(
    () => [...savedViews].sort((left, right) => left.name.localeCompare(right.name)),
    [savedViews]
  );
  const getOverviewMetricCardClass = (isActive: boolean) =>
    `rounded-lg border px-3 py-3 text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-1 ${
      isActive
        ? "border-slate-900 bg-slate-900 text-white shadow-sm"
        : "border-slate-300 bg-white text-slate-900 hover:border-slate-400 hover:bg-slate-100"
    }`;
  const getOverviewMetricTitleClass = (isActive: boolean) =>
    isActive ? "text-xs font-semibold text-white" : "text-xs font-semibold text-slate-800";
  const getOverviewMetricBreakdownClass = (isActive: boolean) =>
    isActive ? "mt-1 text-[11px] text-slate-200" : "mt-1 text-[11px] text-slate-600";
  const getOverviewMetricValueClass = (isActive: boolean) =>
    isActive
      ? "mt-2 text-2xl font-semibold tabular-nums text-white"
      : "mt-2 text-2xl font-semibold tabular-nums text-slate-900";
  const renderOverviewMetricCard = (metricKey: MetricFilterKey) => {
    const isActive = activeMetricFilter === metricKey;
    const metricLabel = METRIC_FILTER_LABELS[metricKey];
    const breakdownByMetric: Record<MetricFilterKey, DashboardOverviewMetricBreakdown> = {
      open_work: focusStripMetrics.breakdown.openWork,
      scheduled_next_7_days: focusStripMetrics.breakdown.scheduledNextSevenDays,
      awaiting_review: focusStripMetrics.breakdown.awaitingReview,
      ready_to_publish: focusStripMetrics.breakdown.readyToPublish,
      awaiting_live_link: focusStripMetrics.breakdown.awaitingLiveLink,
      published_last_7_days: focusStripMetrics.breakdown.publishedLastSevenDays,
    };
    const totalByMetric: Record<MetricFilterKey, number> = {
      open_work: focusStripMetrics.openWork,
      scheduled_next_7_days: focusStripMetrics.scheduledNextSevenDays,
      awaiting_review: focusStripMetrics.awaitingReview,
      ready_to_publish: focusStripMetrics.readyToPublish,
      awaiting_live_link: focusStripMetrics.awaitingLiveLink,
      published_last_7_days: focusStripMetrics.publishedLastSevenDays,
    };
    const metricBreakdown = breakdownByMetric[metricKey];
    const metricTotal = totalByMetric[metricKey];
    const tooltipContent = METRIC_TOOLTIPS[metricKey];

    return (
      <button
        key={metricKey}
        type="button"
        className={getOverviewMetricCardClass(isActive)}
        onClick={() => {
          setActiveMetricFilter((previous) => (previous === metricKey ? null : metricKey));
        }}
      >
        <div className="flex items-center gap-1.5">
          <p className={getOverviewMetricTitleClass(isActive)}>{metricLabel}</p>
          <Tooltip content={tooltipContent} delay={100}>
            <span
              role="img"
              aria-label={`${metricLabel} logic`}
              className={isActive ? "text-slate-200" : "text-slate-500"}
            >
              <AppIcon
                name="info"
                size={14}
                boxClassName="h-4 w-4"
                className={isActive ? "text-slate-200" : "text-slate-500"}
              />
            </span>
          </Tooltip>
        </div>
        <p className={getOverviewMetricBreakdownClass(isActive)}>
          Blogs: {metricBreakdown.blogs} · Social: {metricBreakdown.social}
        </p>
        <p className={getOverviewMetricValueClass(isActive)}>{metricTotal}</p>
      </button>
    );
  };

  return (
    <ProtectedPage requiredPermissions={["view_dashboard"]}>
      <AppShell>
        <div className={`${DATA_PAGE_STACK_CLASS} transition-opacity duration-200`}>
          <DataPageHeader
            title="Dashboard"
            description="Track blog and social post pipeline health across draft, scheduled, and published work."
            primaryAction={
              <div className="flex flex-wrap items-center gap-2">
                {canCreateBlog || canManageSocialPosts ? (
                  <details className="relative">
                    <summary className="cursor-pointer list-none rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors duration-150 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-1">
                      Add Content
                    </summary>
                    <div className="absolute right-0 z-30 mt-1 w-48 rounded-md border border-slate-200 bg-white p-1 shadow-lg">
                      {canCreateBlog ? (
                        <>
                          <button
                            type="button"
                            className="block w-full rounded px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
                            onClick={() => {
                              closeOpenDashboardMenus();
                              router.push("/ideas");
                            }}
                          >
                            <span className="flex items-center justify-between gap-3">
                              <span>New Idea</span>
                              <KbdShortcut className="border-slate-200 bg-slate-50 text-slate-500">
                                {MAIN_CREATE_SHORTCUTS.newIdea}
                              </KbdShortcut>
                            </span>
                          </button>
                          <button
                            type="button"
                            className="block w-full rounded px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
                            onClick={() => {
                              closeOpenDashboardMenus();
                              router.push("/blogs/new");
                            }}
                          >
                            <span className="flex items-center justify-between gap-3">
                              <span>New Blog</span>
                              <KbdShortcut className="border-slate-200 bg-slate-50 text-slate-500">
                                {MAIN_CREATE_SHORTCUTS.newBlog}
                              </KbdShortcut>
                            </span>
                          </button>
                        </>
                      ) : null}
                      {canManageSocialPosts ? (
                        <button
                          type="button"
                          className="block w-full rounded px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
                          onClick={() => {
                            closeOpenDashboardMenus();
                            router.push("/social-posts?create=1");
                          }}
                        >
                          <span className="flex items-center justify-between gap-3">
                            <span>New Social Post</span>
                            <KbdShortcut className="border-slate-200 bg-slate-50 text-slate-500">
                              {MAIN_CREATE_SHORTCUTS.newSocialPost}
                            </KbdShortcut>
                          </span>
                        </button>
                      ) : null}
                    </div>
                  </details>
                ) : null}
              </div>
            }
          />
          {isOverviewLoading ? (
            <section className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <h2 className="text-sm font-semibold text-slate-900">Overview</h2>
              <div className="mt-3 grid gap-2 text-sm md:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={`overview-skeleton-${i}`}
                    className="skeleton h-24 w-full rounded-lg"
                  />
                ))}
              </div>
            </section>
          ) : (
            <section className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <h2 className="text-sm font-semibold text-slate-900">Overview</h2>
              <div className="mt-3 space-y-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Informational
                  </p>
                  <div className="mt-1 grid gap-2 text-sm md:grid-cols-3">
                    {INFORMATIONAL_METRIC_KEYS.map((metricKey) =>
                      renderOverviewMetricCard(metricKey)
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Actionable Now
                  </p>
                  <div className="mt-1 grid gap-2 text-sm md:grid-cols-3">
                    {ACTIONABLE_METRIC_KEYS.map((metricKey) =>
                      renderOverviewMetricCard(metricKey)
                    )}
                  </div>
                </div>
            </div>
            </section>
          )}
          {isLoading ? (
            <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 sm:p-5">
              <div className="skeleton h-8 w-32" />
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={`filter-skeleton-${i}`} className="skeleton h-10 w-full" />
              ))}
            </div>
          ) : (
            <>
              <DataPageToolbar
                searchValue={search}
                onSearchChange={setSearch}
                searchPlaceholder="Search title, ID, owner, product, status, or site"
                actions={
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={clearAllFilters}
                  >
                    Clear all filters
                  </Button>
                }
                filters={
                  <div className="md:col-span-2 xl:col-span-4 grid gap-3">
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                      <label className="block">
                        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Lens
                        </span>
                        <select
                          value={lens}
                          onChange={(event) => {
                            setLens(event.target.value as DashboardLens);
                          }}
                          className="focus-field w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
                        >
                          {lensOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <CheckboxMultiSelect
                        label="Content Type"
                        options={contentTypeFilterOptionsWithCounts}
                        selectedValues={contentTypeFilters}
                        onChange={(nextValues) => {
                          setContentTypeFilters(nextValues as DashboardContentTypeFilter[]);
                        }}
                      />
                      <CheckboxMultiSelect
                        label="Status"
                        options={crossWorkflowFilterOptionsWithCounts}
                        selectedValues={crossWorkflowFilters}
                        onChange={(nextValues) => {
                          setCrossWorkflowFilters(nextValues as CrossContentWorkflowFilter[]);
                        }}
                      />
                      <CheckboxMultiSelect
                        label="Assigned to"
                        options={assignedToFilterOptionsWithCounts}
                        selectedValues={assignedToFilters}
                        onChange={setAssignedToFilters}
                      />
                      <CheckboxMultiSelect
                        label="Site"
                        options={siteFilterOptionsWithCounts}
                        selectedValues={siteFilters}
                        onChange={(nextValues) => {
                          setSiteFilters(nextValues as BlogSite[]);
                        }}
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setIsAdvancedFiltersOpen((previous) => !previous);
                        }}
                      >
                        {isAdvancedFiltersOpen
                          ? "Hide more filters"
                          : `More filters${activeAdvancedFilterCount > 0 ? ` (${activeAdvancedFilterCount} active)` : ""}`}
                      </Button>
                      {activeAdvancedFilterCount > 0 ? (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={clearAdvancedFilters}
                        >
                          Clear advanced
                        </Button>
                      ) : null}
                    </div>
                    {isAdvancedFiltersOpen ? (
                      <div className="space-y-3 rounded-md border border-slate-200 bg-slate-50 p-3">
                        <div className="flex flex-wrap items-center gap-2 rounded-md border border-slate-200 bg-white p-2">
                          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Lens shortcuts
                          </span>
                          <Button
                            type="button"
                            variant="secondary"
                            size="xs"
                            disabled={sortedSavedLensShortcuts.some(
                              (shortcut) => shortcut.lens === lens
                            )}
                            onClick={saveCurrentLensShortcut}
                          >
                            Save current lens
                          </Button>
                          {sortedSavedLensShortcuts.map((shortcut) => (
                            <div
                              key={shortcut.id}
                              className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white p-1"
                            >
                              <button
                                type="button"
                                className={`rounded px-2 py-1 text-xs font-medium ${
                                  shortcut.lens === lens
                                    ? "bg-slate-900 text-white"
                                    : "text-slate-700 hover:bg-slate-100"
                                }`}
                                onClick={() => {
                                  applyLensShortcut(shortcut);
                                }}
                              >
                                {shortcut.name}
                              </button>
                              <button
                                type="button"
                                className="rounded px-2 py-1 text-[11px] font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                                onClick={() => {
                                  removeLensShortcut(shortcut);
                                }}
                              >
                                Remove
                              </button>
                            </div>
                          ))}
                        </div>
                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                          <CheckboxMultiSelect
                            label="Delivery"
                            options={crossDeliveryFilterOptionsWithCounts}
                            selectedValues={crossDeliveryFilters}
                            onChange={(nextValues) => {
                              setCrossDeliveryFilters(
                                nextValues as CrossContentDeliveryFilter[]
                              );
                            }}
                          />
                          {hasBlogFilterScope ? (
                            <CheckboxMultiSelect
                              label="Blog Stage"
                              options={overallStatusFilterOptionsWithCounts}
                              selectedValues={statusFilters}
                              onChange={(nextValues) => {
                                setStatusFilters(nextValues as OverallBlogStatus[]);
                              }}
                            />
                          ) : null}
                          {hasSocialFilterScope ? (
                            <CheckboxMultiSelect
                              label="Social Status"
                              options={socialStatusFilterOptionsWithCounts}
                              selectedValues={socialStatusFilters}
                              onChange={(nextValues) => {
                                setSocialStatusFilters(nextValues as SocialPostStatus[]);
                              }}
                            />
                          ) : null}
                          {hasSocialFilterScope ? (
                            <CheckboxMultiSelect
                              label="Social Product"
                              options={socialProductFilterOptionsWithCounts}
                              selectedValues={socialProductFilters}
                              onChange={setSocialProductFilters}
                            />
                          ) : null}
                        </div>
                        {hasBlogFilterScope ? (
                          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                            <CheckboxMultiSelect
                              label="Writing Assignees"
                              options={writerFilterOptionsWithCounts}
                              selectedValues={writerFilters}
                              onChange={setWriterFilters}
                            />
                            <CheckboxMultiSelect
                              label="Publishing Assignees"
                              options={publisherFilterOptionsWithCounts}
                              selectedValues={publisherFilters}
                              onChange={setPublisherFilters}
                            />
                            <CheckboxMultiSelect
                              label="Writing Status"
                              options={writerStatusFilterOptionsWithCounts}
                              selectedValues={writerStatusFilters}
                              onChange={(nextValues) => {
                                setWriterStatusFilters(nextValues as WriterStageStatus[]);
                              }}
                            />
                            <CheckboxMultiSelect
                              label="Publishing Status"
                              options={publisherStatusFilterOptionsWithCounts}
                              selectedValues={publisherStatusFilters}
                              onChange={(nextValues) => {
                                setPublisherStatusFilters(nextValues as PublisherStageStatus[]);
                              }}
                            />
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                }
              />
              <DataPageFilterPills pills={activeFilterPills} />
            </>
          )}

          {selectedRowCount > 0 ? (
            <section className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">Bulk Actions</p>
                  <p className="text-xs text-slate-600">
                    {selectedRowCount} selected · Blogs: {selectedBlogIds.length} · Social:{" "}
                    {selectedSocialPostIds.length}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={isBulkSaving}
                  className="rounded border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={() => {
                    clearBulkUiState();
                  }}
                >
                  Clear Selection
                </button>
              </div>
              {hasOnlySocialSelection ? (
                <p className="text-xs text-slate-600">
                  Social posts are selected. Bulk updates for social posts are not available yet.
                </p>
              ) : null}
              {hasSocialSelection && hasBlogSelection ? (
                <p className="text-xs text-slate-600">
                  Blog bulk updates are available only when social posts are not selected.
                  Deselect social posts to continue.
                </p>
              ) : null}

              <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                <select
                  value={bulkWriterId}
                  onChange={(event) => {
                    setBulkWriterId(event.target.value);
                  }}
                  disabled={
                    !canChangeWriterAssignment || isBulkSaving || !hasOnlyBlogSelection
                  }
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                >
                  <option value="">No writing assignment change</option>
                  {assignmentOptions.map((user) => (
                    <option key={user.id} value={user.id}>
                      Writing: {user.full_name}
                    </option>
                  ))}
                </select>

                <select
                  value={bulkPublisherId}
                  onChange={(event) => {
                    setBulkPublisherId(event.target.value);
                  }}
                  disabled={
                    !canChangePublisherAssignment || isBulkSaving || !hasOnlyBlogSelection
                  }
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                >
                  <option value="">No publishing assignment change</option>
                  {assignmentOptions.map((user) => (
                    <option key={user.id} value={user.id}>
                      Publishing: {user.full_name}
                    </option>
                  ))}
                </select>

                <select
                  value={bulkWriterStatus}
                  onChange={(event) => {
                    setBulkWriterStatus(event.target.value as WriterStageStatus | "");
                  }}
                  disabled={!canEditWritingStage || isBulkSaving || !hasOnlyBlogSelection}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                >
                  <option value="">No writing status change</option>
                  {WRITER_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      Writing Status: {toTitleCase(status)}
                    </option>
                  ))}
                </select>

                <select
                  value={bulkPublisherStatus}
                  onChange={(event) => {
                    setBulkPublisherStatus(event.target.value as PublisherStageStatus | "");
                  }}
                  disabled={!canEditPublishingStage || isBulkSaving || !hasOnlyBlogSelection}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                >
                  <option value="">No publishing status change</option>
                  {PUBLISHER_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      Publishing Status: {toTitleCase(status)}
                    </option>
                  ))}
                </select>
              </div>
              {!canRunBulkActions ? (
                <p className="text-xs text-slate-500">
                  Bulk updates are unavailable with your current permissions.
                </p>
              ) : null}

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={
                    !canRunBulkActions ||
                    isBulkSaving ||
                    !hasOnlyBlogSelection ||
                    !hasPendingBulkChanges ||
                    Boolean(bulkValidationError)
                  }
                  className="rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={() => {
                    void handleBulkApplyChanges();
                  }}
                >
                  Apply Changes
                </button>
                {bulkValidationError && (
                  <p className="text-xs text-rose-600 font-medium">{bulkValidationError}</p>
                )}
                {canDeleteBlog ? (
                  <button
                    type="button"
                    disabled={isBulkSaving || !hasOnlyBlogSelection}
                    className="rounded-md border border-rose-300 bg-white px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={() => {
                      void handleBulkDelete();
                    }}
                  >
                    Delete Selected
                  </button>
                ) : null}
              </div>
            </section>
          ) : null}

          {isLoading ? (
            <div className="space-y-3 rounded-lg border border-slate-200 p-4 sm:p-5">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={`skeleton-row-${i}`} className="skeleton h-12 w-full" />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <section className={`${DATA_PAGE_CONTROL_STRIP_CLASS} relative`} ref={columnEditorRef}>
                <div className={DATA_PAGE_CONTROL_ROW_CLASS}>
                  <div className="flex flex-wrap items-center gap-3">
                    <TableResultsSummary
                      totalRows={sortedRows.length}
                      currentPage={currentPage}
                      rowLimit={rowLimit}
                      noun="items"
                    />
                  </div>
                  <div className={DATA_PAGE_CONTROL_ACTIONS_CLASS}>
                    <details className="relative">
                      <summary
                        className={`${DATA_PAGE_CONTROL_ACTION_BUTTON_CLASS} cursor-pointer list-none border border-slate-300 bg-white text-slate-700 hover:bg-slate-100`}
                      >
                        Copy
                      </summary>
                      <div className="absolute right-0 z-30 mt-1 w-40 rounded-md border border-slate-200 bg-white p-1 shadow-md">
                        <button
                          type="button"
                          disabled={sortedRows.length === 0}
                          className="block w-full rounded px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                          onClick={() => {
                            closeOpenDashboardMenus();
                            void handleCopyValues("title");
                          }}
                        >
                          All titles
                        </button>
                        <button
                          type="button"
                          disabled={sortedRows.length === 0}
                          className="block w-full rounded px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                          onClick={() => {
                            closeOpenDashboardMenus();
                            void handleCopyValues("url");
                          }}
                        >
                          All URLs
                        </button>
                      </div>
                    </details>
                    <button
                      type="button"
                      className={`${DATA_PAGE_CONTROL_ACTION_BUTTON_CLASS} border border-slate-300 bg-white text-slate-700 hover:bg-slate-100`}
                      onClick={() => {
                        setIsEditColumnsOpen((previous) => {
                          const nextIsOpen = !previous;
                          if (nextIsOpen) {
                            window.dispatchEvent(
                              new CustomEvent("app:dropdown-opened", {
                                detail: { id: "dashboard-customize-columns" },
                              })
                            );
                          }
                          return nextIsOpen;
                        });
                      }}
                    >
                      Customize
                    </button>
                    {canRunDataImport ? (
                      <BlogImportModal
                        triggerLabel="Import"
                        triggerVariant="primary"
                        triggerSize="sm"
                        triggerClassName={DATA_PAGE_CONTROL_ACTION_BUTTON_CLASS}
                        onImported={async (summary) => {
                          await loadData();
                          showSuccess(
                            `Import complete: ${summary.created} created, ${summary.updated} updated, ${summary.failed} failed.`
                          );
                        }}
                      />
                    ) : null}
                    {canExportCsv || canExportSelectedCsv ? (
                      <details className="relative">
                        <summary
                          className={`${DATA_PAGE_CONTROL_ACTION_BUTTON_CLASS} cursor-pointer list-none border border-slate-900 bg-slate-900 text-white hover:bg-slate-700`}
                        >
                          Export
                        </summary>
                        <div className="absolute right-0 z-30 mt-1 w-40 rounded-md border border-slate-200 bg-white p-1 shadow-md">
                          <button
                            type="button"
                            disabled={sortedRows.length === 0}
                            className="block w-full rounded px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                            onClick={() => {
                              handleExportCsv(getSmartExportScope());
                              closeOpenDashboardMenus();
                            }}
                          >
                            As .CSV file
                          </button>
                          <button
                            type="button"
                            disabled={sortedRows.length === 0}
                            className="block w-full rounded px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                            onClick={() => {
                              handleExportPdf(getSmartExportScope());
                              closeOpenDashboardMenus();
                            }}
                          >
                            As .PDF file
                          </button>
                        </div>
                      </details>
                    ) : null}
                  </div>
                </div>
                {isEditColumnsOpen ? (
                  <div className="absolute right-0 z-30 mt-2 w-full max-w-2xl rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Column View
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                          onClick={saveCurrentFiltersAsView}
                        >
                          Save View
                        </button>
                        <details className="relative">
                          <summary className="cursor-pointer list-none rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100">
                            Load View ▼
                          </summary>
                          <div className="absolute right-0 z-40 mt-1 w-56 rounded-md border border-slate-200 bg-white p-1 shadow-lg">
                            {sortedSavedViews.length === 0 ? (
                              <p className="px-3 py-2 text-xs text-slate-500">No saved views yet.</p>
                            ) : (
                              sortedSavedViews.map((view) => (
                                <button
                                  key={view.id}
                                  type="button"
                                  className={`block w-full rounded px-3 py-2 text-left text-sm transition ${
                                    activeSavedViewId === view.id
                                      ? "bg-slate-900 text-white"
                                      : "text-slate-700 hover:bg-slate-100"
                                  }`}
                                  onClick={() => {
                                    closeOpenDashboardMenus();
                                    applySavedView(view);
                                  }}
                                >
                                  <p className="font-medium">{view.name}</p>
                                  <p className="text-[11px] opacity-75">
                                    {activeSavedViewId === view.id ? "Active" : "Click to apply"}
                                  </p>
                                </button>
                              ))
                            )}
                          </div>
                        </details>
                        <button
                          type="button"
                          className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                          onClick={resetColumnView}
                        >
                          Reset Defaults
                        </button>
                      </div>
                    </div>
                    <div className="mt-2 space-y-3">
                      <div className="flex items-center justify-between rounded border border-slate-200 bg-slate-50 px-2 py-1.5">
                        <span className="text-xs font-medium text-slate-600">Density</span>
                        <div className={`${SEGMENTED_CONTROL_CLASS} text-xs`}>
                          <button
                            type="button"
                            className={segmentedControlItemClass({
                              isActive: rowDensity === "compact",
                              className: "px-2 py-1 text-xs",
                            })}
                            onClick={() => {
                              setRowDensity("compact");
                            }}
                          >
                            Compact
                          </button>
                          <button
                            type="button"
                            className={segmentedControlItemClass({
                              isActive: rowDensity === "comfortable",
                              className: "px-2 py-1 text-xs",
                            })}
                            onClick={() => {
                              setRowDensity("comfortable");
                            }}
                          >
                            Comfortable
                          </button>
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-500">Drag columns to reorder, or use checkboxes to show/hide</p>
                      <ColumnEditor
                        columns={columnOrder.map((column) => ({
                          id: column,
                          label: DASHBOARD_COLUMN_LABELS[column],
                          isVisible: !hiddenColumnSet.has(column),
                        }))}
                        onReorder={(reorderedColumns) => {
                          setColumnOrder(reorderedColumns.map((col) => col.id as DashboardColumnKey));
                        }}
                        onToggleVisibility={(columnId) => {
                          toggleColumnVisibility(columnId as DashboardColumnKey);
                        }}
                        minVisibleColumns={1}
                      />
                    </div>
                  </div>
                ) : null}
              </section>
              {sortedRows.length === 0 && hasActiveDashboardFilters ? (
                <DataPageEmptyState
                  title="No content matches your filters."
                  description="Clear filters to return to the full view."
                  action={
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={clearAllFilters}
                      >
                        Clear all filters
                      </Button>
                      {canRunDataImport ? (
                        <Button
                          type="button"
                          variant="primary"
                          size="sm"
                          onClick={() => {
                            router.push("/blogs?import=1");
                          }}
                        >
                          Open import
                        </Button>
                      ) : null}
                    </div>
                  }
                />
              ) : null}
              {sortedRows.length === 0 && !hasActiveDashboardFilters ? (
                <DataPageEmptyState
                  title="No content yet."
                  description="Create your first content item or import existing records to get started."
                  action={
                    <div className="flex flex-wrap items-center gap-2">
                      {canCreateBlog ? (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            router.push("/blogs/new");
                          }}
                        >
                          Add new blog
                        </Button>
                      ) : null}
                      {canRunDataImport ? (
                        <Button
                          type="button"
                          variant="primary"
                          size="sm"
                          onClick={() => {
                            router.push("/blogs?import=1");
                          }}
                        >
                          Open import
                        </Button>
                      ) : null}
                    </div>
                  }
                />
              ) : null}

              <div
                ref={tableContainerRef}
                className="overflow-hidden rounded-lg border border-slate-200"
              >
                <DashboardTable
                  rows={pagedRows}
                  visibleColumns={visibleColumnOrder}
                  activeRowId={activeBlogId}
                  selectedRowKeys={selectedRowKeySet}
                  rowDensity={rowDensity}
                  canSelectRows={canSelectRows}
                  sortField={sortField}
                  sortDirection={sortDirection}
                  timezone={profile?.timezone}
                  onRowClick={(row) => {
                    if (row.content_type === "blog") {
                      openPanel(row.id);
                      return;
                    }
                    router.push(`/social-posts/${row.id}`);
                  }}
                  onSortChange={handleSortByColumn}
                  onToggleAll={handleToggleAllVisible}
                  onToggleSingle={(row, checked) => {
                    handleToggleSingle(row, checked);
                  }}
                  onAssociatedContentClick={(row) => {
                    if (row.content_type === "blog" && row.social_post_count) {
                      // Navigate to social posts filtered by this blog
                      router.push(`/social-posts?associated_blog=${row.id}`);
                    } else if (row.content_type === "social_post" && row.associated_blog_id) {
                      // Navigate to blogs page with this blog in focus
                      router.push(`/blogs?filter=${row.associated_blog_id}`);
                    }
                  }}
                />
              </div>
              <div className={DATA_PAGE_CONTROL_STRIP_CLASS}>
                <div className="flex flex-wrap items-center gap-3">
                  <TableRowLimitSelect
                    value={rowLimit}
                    onChange={(value) => {
                      setRowLimit(value);
                      setActiveSavedViewId(null);
                    }}
                  />
                  <TablePaginationControls
                    currentPage={currentPage}
                    pageCount={pageCount}
                    onPageChange={setCurrentPage}
                  />
                </div>
                <button
                  type="button"
                  className="rounded border border-slate-300 bg-white px-3 py-1 text-sm text-slate-700 hover:bg-slate-100"
                  onClick={() => {
                    tableContainerRef.current?.scrollIntoView({
                      behavior: "smooth",
                      block: "start",
                    });
                  }}
                >
                  ↑ Move to top
                </button>
              </div>
              <DataPageTableFeedback isVisible={isApplyingFilterFeedback} />
            </div>
          )}

          <BlogDetailsDrawer
            blog={activeBlog}
            isOpen={Boolean(activeBlog)}
            onClose={closePanel}
            subtitle={activeBlog ? getSiteLabel(activeBlog.site) : undefined}
            commentsCount={panelComments.length}
            timelineCount={panelHistory.length}
            siteBadge={
              activeBlog ? (
                <span
                  className={`inline-flex items-center justify-center rounded-full border px-2 py-0.5 text-xs font-medium ${getSiteBadgeClasses(
                    activeBlog.site
                  )}`}
                >
                  {getSiteShortLabel(activeBlog.site)}
                </span>
              ) : null
            }
            statusBadges={
              activeBlog ? (
                <>
                  <WorkflowStageBadge
                    stage={getWorkflowStage({
                      writerStatus: activeBlog.writer_status,
                      publisherStatus: activeBlog.publisher_status,
                    })}
                  />
                  <StatusBadge status={activeBlog.overall_status} />
                  <WriterStatusBadge status={activeBlog.writer_status} />
                  <PublisherStatusBadge status={activeBlog.publisher_status} />
                </>
              ) : null
            }
            overviewFields={
              activeBlog
                ? [
                    {
                      label: "Workflow stage",
                      value: toTitleCase(
                        getWorkflowStage({
                          writerStatus: activeBlog.writer_status,
                          publisherStatus: activeBlog.publisher_status,
                        })
                      ),
                    },
                    {
                      label: "Overall status",
                      value: STATUS_LABELS[activeBlog.overall_status],
                    },
                  ]
                : []
            }
            workflowContent={
              activeBlog ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {isPanelEditMode && canChangeWriterAssignment ? (
                    <label className="block space-y-1">
                      <span className="text-xs text-slate-500">Writer</span>
                      <select
                        className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                        value={activeBlog.writer_id ?? ""}
                        onChange={(event) => {
                          const nextWriterId = event.target.value || null;
                          void updateBlogInline(
                            activeBlog,
                            { writer_id: nextWriterId },
                            `Writer updated for \"${activeBlog.title}\".`
                          );
                        }}
                      >
                        <option value="">Unassigned</option>
                        {assignmentOptions.map((userOption) => (
                          <option key={userOption.id} value={userOption.id}>
                            {userOption.full_name}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : (
                    <DetailDrawerField
                      label="Writer"
                      value={activeBlog.writer?.full_name ?? "Unassigned"}
                    />
                  )}

                  {isPanelEditMode && canChangePublisherAssignment ? (
                    <label className="block space-y-1">
                      <span className="text-xs text-slate-500">Publisher</span>
                      <select
                        className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                        value={activeBlog.publisher_id ?? ""}
                        onChange={(event) => {
                          const nextPublisherId = event.target.value || null;
                          void updateBlogInline(
                            activeBlog,
                            { publisher_id: nextPublisherId },
                            `Publisher updated for \"${activeBlog.title}\".`
                          );
                        }}
                      >
                        <option value="">Unassigned</option>
                        {assignmentOptions.map((userOption) => (
                          <option key={userOption.id} value={userOption.id}>
                            {userOption.full_name}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : (
                    <DetailDrawerField
                      label="Publisher"
                      value={activeBlog.publisher?.full_name ?? "Unassigned"}
                    />
                  )}

                  {isPanelEditMode && canEditWritingStage ? (
                    <label className="block space-y-1">
                      <span className="text-xs text-slate-500">Writer status</span>
                      <select
                        className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                        value={activeBlog.writer_status}
                        onChange={(event) => {
                          void updateBlogInline(
                            activeBlog,
                            { writer_status: event.target.value as WriterStageStatus },
                            `Writer status updated for \"${activeBlog.title}\".`
                          );
                        }}
                      >
                        {WRITER_STATUSES.map((status) => {
                          const isTransitionAllowed = canTransitionWriterStatus(
                            activeBlog.writer_status,
                            status,
                            hasPermission
                          );
                          const needsGoogleDoc =
                            status !== "not_started" &&
                            status !== "in_progress" &&
                            !activeBlog.google_doc_url;
                          return (
                            <option
                              key={status}
                              value={status}
                              disabled={!isTransitionAllowed || needsGoogleDoc}
                            >
                              {WRITER_STATUS_LABELS[status]}
                            </option>
                          );
                        })}
                      </select>
                    </label>
                  ) : (
                    <DetailDrawerField
                      label="Writer status"
                      value={WRITER_STATUS_LABELS[activeBlog.writer_status]}
                    />
                  )}

                  {isPanelEditMode && canEditPublishingStage ? (
                    <label className="block space-y-1">
                      <span className="text-xs text-slate-500">Publisher status</span>
                      <select
                        className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                        value={activeBlog.publisher_status}
                        onChange={(event) => {
                          void updateBlogInline(
                            activeBlog,
                            { publisher_status: event.target.value as PublisherStageStatus },
                            `Publisher status updated for \"${activeBlog.title}\".`
                          );
                        }}
                      >
                        {PUBLISHER_STATUSES.map((status) => {
                          const isTransitionAllowed = canTransitionPublisherStatus(
                            activeBlog.publisher_status,
                            status,
                            hasPermission
                          );
                          const needsGoogleDoc =
                            status !== "not_started" && !activeBlog.google_doc_url;
                          return (
                            <option
                              key={status}
                              value={status}
                              disabled={!isTransitionAllowed || needsGoogleDoc}
                            >
                              {PUBLISHER_STATUS_LABELS[status]}
                            </option>
                          );
                        })}
                      </select>
                    </label>
                  ) : (
                    <DetailDrawerField
                      label="Publisher status"
                      value={PUBLISHER_STATUS_LABELS[activeBlog.publisher_status]}
                    />
                  )}
                </div>
              ) : null
            }
            datesContent={
              activeBlog ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {isPanelEditMode && canEditScheduledDate ? (
                    <label className="block space-y-1">
                      <span className="text-xs text-slate-500">Scheduled date</span>
                      <input
                        type="date"
                        className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                        value={formatDateInput(getBlogScheduledDate(activeBlog))}
                        onChange={(event) => {
                          const nextDate = event.target.value || null;
                          void updateBlogInline(
                            activeBlog,
                            {
                              scheduled_publish_date: nextDate,
                              target_publish_date: nextDate,
                            },
                            `Scheduled date updated for \"${activeBlog.title}\".`
                          );
                        }}
                      />
                    </label>
                  ) : (
                    <DetailDrawerField
                      label="Scheduled date"
                      value={formatDateOnly(getBlogScheduledDate(activeBlog)) || "—"}
                    />
                  )}

                  {isPanelEditMode && canEditDisplayDate ? (
                    <label className="block space-y-1">
                      <span className="text-xs text-slate-500">Display date</span>
                      <input
                        type="date"
                        className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                        value={formatDateInput(activeBlog.display_published_date)}
                        onChange={(event) => {
                          const nextDisplayDate = event.target.value || null;
                          void updateBlogInline(
                            activeBlog,
                            { display_published_date: nextDisplayDate },
                            `Display date updated for \"${activeBlog.title}\".`
                          );
                        }}
                      />
                    </label>
                  ) : (
                    <DetailDrawerField
                      label="Display date"
                      value={formatDateOnly(activeBlog.display_published_date) || "—"}
                    />
                  )}

                  <DetailDrawerField
                    label="Published date"
                    value={formatDateOnly(getBlogPublishDate(activeBlog)) || "—"}
                  />
                </div>
              ) : null
            }
            linksContent={
              activeBlog ? (
                <div className="space-y-3 text-sm text-slate-700">
                  <div className="space-y-1">
                    <p className="text-xs text-slate-500">Google Doc</p>
                    <LinkQuickActions
                      href={activeBlog.google_doc_url}
                      label="Google Doc URL"
                      size="xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-slate-500">Live URL</p>
                    <LinkQuickActions
                      href={activeBlog.live_url}
                      label="Live URL"
                      size="xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-slate-500">Blog Page</p>
                    <LinkQuickActions
                      href={`/blogs/${activeBlog.id}`}
                      label="Blog page URL"
                      size="xs"
                    />
                  </div>
                </div>
              ) : undefined
            }
            associatedContentSection={
              activeBlog ? (
                <AssociatedSocialPostsSection blogId={activeBlog.id} />
              ) : undefined
            }
            commentsContent={
              activeBlog ? (
                <div className="space-y-2">
                  {canCreateComments ? (
                    <>
                      <textarea
                        value={panelCommentDraft}
                        onChange={(event) => {
                          setPanelCommentDraft(event.target.value);
                        }}
                        className="min-h-20 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                        placeholder="Add a comment..."
                        maxLength={2000}
                      />
                      <div className="flex justify-end">
                        <button
                          type="button"
                          disabled={isPanelCommentSaving}
                          className="rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:cursor-not-allowed disabled:opacity-60"
                          onClick={() => {
                            void handlePanelAddComment();
                          }}
                        >
                          {isPanelCommentSaving ? "Adding..." : "Add Comment"}
                        </button>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-slate-500">
                      You do not have permission to add comments.
                    </p>
                  )}
                  {panelComments.length === 0 ? (
                    <p className="text-sm text-slate-500">No comments yet.</p>
                  ) : (
                    <ul className="space-y-2">
                      {panelComments.map((comment) => (
                        <li key={comment.id} className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                          <div className="flex items-start gap-2">
                            <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-[10px] font-semibold text-slate-700">
                              {(comment.author?.full_name ?? "U").slice(0, 1).toUpperCase()}
                            </span>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-slate-600">
                                {comment.author?.full_name ?? "Unknown"} —{" "}
                                {formatDistanceToNow(new Date(comment.created_at), {
                                  addSuffix: true,
                                })}
                              </p>
                              <p className="mt-1 text-sm text-slate-800">{comment.comment}</p>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : undefined
            }
            timelineContent={
              activeBlog ? (
                isPanelLoading ? (
                  <p className="text-sm text-slate-500">Loading timeline…</p>
                ) : panelHistory.length === 0 ? (
                  <p className="text-sm text-slate-500">No activity history yet.</p>
                ) : (
                  <ol className="space-y-2">
                    {panelHistory.map((entry) => (
                      <li
                        key={entry.id}
                        className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2"
                      >
                        <p className="text-sm font-medium text-slate-800">
                          {formatActivityEventTitle(entry)}
                        </p>
                        {(() => {
                          const detail = formatActivityChangeDescription(entry, {
                            userNameById: panelHistoryUserNameById,
                          });
                          return detail ? (
                            <p className="text-xs text-slate-600">{detail}</p>
                          ) : null;
                        })()}
                        <p className="text-xs text-slate-400">
                          {formatDateInTimezone(entry.changed_at, profile?.timezone)}
                        </p>
                      </li>
                    ))}
                  </ol>
                )
              ) : undefined
            }
            canEdit={canEditPanelDetails}
            isEditMode={isPanelEditMode}
            onToggleEditMode={() => {
              setIsPanelEditMode((previous) => !previous);
            }}
          />

        <BulkActionPreviewModal
          isOpen={showBulkPreviewModal}
          blogs={selectedBlogs}
          changesSummary={bulkPreviewChangesSummary}
          onConfirm={() => {
            void handleConfirmBulkChanges();
          }}
          onCancel={() => {
            setShowBulkPreviewModal(false);
          }}
          isLoading={isBulkSaving}
        />
        </div>
      </AppShell>
    </ProtectedPage>
  );
}
