import type { ReactNode } from "react";

import { SuccessIcon, WarningIcon } from "@/lib/icons";
import { cn } from "@/lib/utils";

export type DetailTone = "neutral" | "success" | "warning" | "danger";

const detailToneTextClass: Record<DetailTone, string> = {
  neutral: "text-navy-500",
  success: "text-emerald-700",
  warning: "text-amber-700",
  danger: "text-rose-700",
};

const detailToneSurfaceClass: Record<DetailTone, string> = {
  neutral: "border-[color:var(--sh-gray-200)] bg-[color:var(--sh-gray)]",
  success: "border-emerald-200 bg-emerald-50",
  warning: "border-amber-200 bg-amber-50",
  danger: "border-rose-200 bg-rose-50",
};

export type DetailChecklistItem = {
  id: string;
  label: ReactNode;
  isComplete: boolean;
  helper?: ReactNode;
  action?: ReactNode;
};

export type DetailSnapshotRow = {
  id: string;
  label: ReactNode;
  value: ReactNode;
  tone?: DetailTone;
};

export type DetailCommentItem = {
  id: string;
  authorName: ReactNode;
  createdAtLabel: ReactNode;
  createdAtDateTime?: string;
  body: ReactNode;
  avatarLabel?: string;
};

function getCommentAvatarLabel(comment: DetailCommentItem) {
  if (comment.avatarLabel) {
    return comment.avatarLabel.slice(0, 2);
  }
  if (typeof comment.authorName === "string" || typeof comment.authorName === "number") {
    return String(comment.authorName || "U").slice(0, 1);
  }
  return "U";
}

export type AssignmentChangesTimelineEntry = {
  id: string;
  title: ReactNode;
  detail?: ReactNode;
  actorLabel?: ReactNode;
  timestampLabel?: ReactNode;
};

export type AssignmentChangesTimelineGroup = {
  id: string;
  label: ReactNode;
  entries: AssignmentChangesTimelineEntry[];
};

function MetadataDot() {
  return (
    <span
      aria-hidden="true"
      className="mx-1.5 inline-block h-1 w-1 rounded-full bg-navy-500/40 align-middle"
    />
  );
}

export function DetailPageShell({
  children,
  rightRail,
  className,
  mainClassName,
  rightRailClassName,
}: {
  children: ReactNode;
  rightRail?: ReactNode;
  className?: string;
  mainClassName?: string;
  rightRailClassName?: string;
}) {
  if (!rightRail) {
    return <div className={cn("space-y-5", mainClassName, className)}>{children}</div>;
  }

  return (
    <div
      className={cn(
        "grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]",
        className
      )}
    >
      <div className={cn("min-w-0 space-y-5", mainClassName)}>{children}</div>
      <DetailRightRail className={rightRailClassName}>{rightRail}</DetailRightRail>
    </div>
  );
}

export function DetailNextActionPanel({
  title,
  helper,
  eyebrow = "Next Action",
  meta,
  metaTone = "neutral",
  actions,
  children,
  className,
}: {
  title: ReactNode;
  helper?: ReactNode;
  eyebrow?: ReactNode;
  meta?: ReactNode;
  metaTone?: DetailTone;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "space-y-3 rounded-lg border border-[color:var(--sh-gray-200)] bg-[color:var(--sh-gray)] p-4",
        className
      )}
    >
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-navy-500">
            {eyebrow}
          </p>
          <h3 className="text-sm font-semibold leading-5 text-ink">{title}</h3>
          {helper ? <p className="text-sm leading-5 text-navy-500">{helper}</p> : null}
          {meta ? (
            <p className={cn("text-xs leading-4", detailToneTextClass[metaTone])}>
              {meta}
            </p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex max-w-full flex-wrap items-center justify-end gap-2">
            {actions}
          </div>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export function DetailSection({
  id,
  title,
  description,
  actions,
  children,
  className,
  bodyClassName,
}: {
  id?: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section
      id={id}
      className={cn(
        "space-y-4 rounded-lg border border-[color:var(--sh-gray-200)] bg-white p-4",
        className
      )}
    >
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-semibold leading-6 text-ink">{title}</h3>
          {description ? (
            <p className="mt-1 text-sm leading-5 text-navy-500">{description}</p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex max-w-full flex-wrap items-center justify-end gap-2">
            {actions}
          </div>
        ) : null}
      </div>
      <div className={cn("min-w-0", bodyClassName)}>{children}</div>
    </section>
  );
}

export function DetailRightRail({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <aside className={cn("min-w-0 space-y-3 xl:sticky xl:top-20", className)}>
      {children}
    </aside>
  );
}

export function DetailSnapshotCard({
  title = "Current Snapshot",
  rows,
  children,
  footer,
  className,
}: {
  title?: ReactNode;
  rows?: DetailSnapshotRow[];
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "space-y-3 rounded-lg border border-[color:var(--sh-gray-200)] bg-white p-3",
        className
      )}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-navy-500">
        {title}
      </p>
      {rows && rows.length > 0 ? (
        <dl className="space-y-2 border-b border-[color:var(--sh-gray-200)] pb-3">
          {rows.map((row) => (
            <div
              key={row.id}
              className="flex min-w-0 items-start justify-between gap-3 text-xs"
            >
              <dt className="shrink-0 text-navy-500">{row.label}</dt>
              <dd
                className={cn(
                  "min-w-0 text-right font-medium text-ink",
                  row.tone ? detailToneTextClass[row.tone] : null
                )}
              >
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
      {children}
      {footer ? <div className="border-t border-[color:var(--sh-gray-200)] pt-3">{footer}</div> : null}
    </section>
  );
}

export function DetailChecklistCard({
  title = "Checklist",
  description,
  items,
  footer,
  className,
}: {
  title?: ReactNode;
  description?: ReactNode;
  items: DetailChecklistItem[];
  footer?: ReactNode;
  className?: string;
}) {
  const completedCount = items.filter((item) => item.isComplete).length;

  return (
    <section
      className={cn(
        "space-y-3 rounded-lg border border-[color:var(--sh-gray-200)] bg-white p-3",
        className
      )}
    >
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-navy-500">
            {title}
          </p>
          <p className="text-xs font-medium tabular-nums text-navy-500">
            {completedCount}/{items.length}
          </p>
        </div>
        {description ? <p className="text-xs leading-4 text-navy-500">{description}</p> : null}
      </div>
      <ul className="space-y-1">
        {items.map((item) => (
          <li
            key={item.id}
            className={cn(
              "rounded-md border px-2 py-2",
              item.isComplete
                ? "border-emerald-200 bg-emerald-50/70"
                : "border-[color:var(--sh-gray-200)] bg-[color:var(--sh-gray)]"
            )}
          >
            <div className="flex min-w-0 items-start gap-2">
              {item.isComplete ? (
                <SuccessIcon
                  boxClassName="mt-0.5 h-4 w-4"
                  size={13}
                  className="text-emerald-700"
                />
              ) : (
                <WarningIcon
                  boxClassName="mt-0.5 h-4 w-4"
                  size={13}
                  className="text-amber-700"
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium leading-4 text-ink">{item.label}</p>
                {item.helper ? (
                  <p className="mt-0.5 text-xs leading-4 text-navy-500">{item.helper}</p>
                ) : null}
              </div>
              {item.action ? <div className="shrink-0">{item.action}</div> : null}
            </div>
          </li>
        ))}
      </ul>
      {footer ? <div className="border-t border-[color:var(--sh-gray-200)] pt-3">{footer}</div> : null}
    </section>
  );
}

export function CommentsSection({
  id,
  title = "Comments",
  description = "Leave context, handoff notes, or feedback for teammates.",
  composer,
  comments,
  emptyMessage = "No comments yet. Add context to keep handoffs clear.",
  unavailableMessage,
  permissionMessage,
  className,
}: {
  id?: string;
  title?: ReactNode;
  description?: ReactNode;
  composer?: ReactNode;
  comments: DetailCommentItem[];
  emptyMessage?: ReactNode;
  unavailableMessage?: ReactNode;
  permissionMessage?: ReactNode;
  className?: string;
}) {
  return (
    <DetailSection
      id={id}
      title={title}
      description={description}
      className={className}
      bodyClassName="space-y-4"
    >
      {unavailableMessage ? (
        <div
          className={cn(
            "rounded-md border px-3 py-2 text-sm leading-5",
            detailToneSurfaceClass.warning,
            detailToneTextClass.warning
          )}
        >
          {unavailableMessage}
        </div>
      ) : null}
      {composer}
      {permissionMessage ? (
        <p className="text-xs leading-4 text-navy-500">{permissionMessage}</p>
      ) : null}
      {comments.length === 0 ? (
        <p className="text-sm leading-5 text-navy-500">{emptyMessage}</p>
      ) : (
        <ul className="divide-y divide-[color:var(--sh-gray-200)] rounded-lg border border-[color:var(--sh-gray-200)] bg-white">
          {comments.map((comment) => (
            <li
              key={comment.id}
              className="overflow-hidden px-4 py-3 first:rounded-t-lg last:rounded-b-lg"
            >
              <div className="flex min-w-0 items-start gap-3">
                <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink text-[11px] font-semibold uppercase text-white">
                  {getCommentAvatarLabel(comment)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold leading-4 text-navy-500">
                    {comment.authorName}
                    <MetadataDot />
                    <time
                      dateTime={comment.createdAtDateTime}
                      className="font-normal text-navy-500/60"
                    >
                      {comment.createdAtLabel}
                    </time>
                  </p>
                  <div className="mt-2 text-sm leading-5 text-navy-500">
                    {comment.body}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </DetailSection>
  );
}

export function AssignmentChangesTimeline({
  id,
  title = "Assignment & Changes",
  description = "Audit trail of assignment, status, and key field changes.",
  groups,
  emptyMessage = "No assignment or status changes yet. Workflow updates will appear here.",
  className,
}: {
  id?: string;
  title?: ReactNode;
  description?: ReactNode;
  groups: AssignmentChangesTimelineGroup[];
  emptyMessage?: ReactNode;
  className?: string;
}) {
  return (
    <DetailSection
      id={id}
      title={title}
      description={description}
      className={className}
      bodyClassName="space-y-3"
    >
      {groups.length === 0 ? (
        <p className="text-sm leading-5 text-navy-500">{emptyMessage}</p>
      ) : (
        groups.map((group) => (
          <section key={group.id} className="space-y-2">
            <h4 className="text-sm font-semibold text-navy-500">
              {group.label}
            </h4>
            <ul className="divide-y divide-[color:var(--sh-gray-200)] rounded-lg border border-[color:var(--sh-gray-200)] bg-white">
              {group.entries.map((entry) => (
                <li
                  key={entry.id}
                  className="px-3 py-2 first:rounded-t-lg last:rounded-b-lg"
                >
                  <p className="text-sm font-medium leading-5 text-ink">{entry.title}</p>
                  {entry.detail ? (
                    <p className="text-xs leading-4 text-navy-500">{entry.detail}</p>
                  ) : null}
                  {entry.actorLabel || entry.timestampLabel ? (
                    <p className="flex flex-wrap items-center text-xs leading-4 text-navy-500/60">
                      <span>{entry.actorLabel ?? "System"}</span>
                      {entry.timestampLabel ? <MetadataDot /> : null}
                      {entry.timestampLabel}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </DetailSection>
  );
}
