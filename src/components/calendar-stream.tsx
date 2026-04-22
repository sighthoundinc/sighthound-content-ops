"use client";

import {
  addWeeks,
  eachDayOfInterval,
  endOfWeek,
  format,
  startOfWeek,
  subWeeks,
} from "date-fns";
import {
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { getWeekdayLabels } from "@/lib/calendar";
import { SOCIAL_POST_TYPE_LABELS } from "@/lib/status";
import type { BlogRecord, SocialPostRecord, SocialPostStatus, SocialPostType } from "@/lib/types";
import { cn } from "@/lib/utils";

type WeekStart = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type CalendarStreamSocialPost = Pick<
  SocialPostRecord,
  "id" | "title" | "type" | "status" | "scheduled_date"
> & {
  associated_blog?: Pick<BlogRecord, "id" | "title" | "site"> | null;
};

export type CalendarStreamItem =
  | { type: "blog"; key: string; blog: BlogRecord }
  | { type: "social"; key: string; social: CalendarStreamSocialPost };

export type CalendarStreamLegend = {
  shBlog: boolean;
  redBlog: boolean;
  shSocial: boolean;
  redSocial: boolean;
};

const DEFAULT_INITIAL_PAST_WEEKS = 26;
const DEFAULT_INITIAL_FUTURE_WEEKS = 26;
const LOAD_MORE_CHUNK_WEEKS = 13;

type CalendarStreamViewProps = {
  itemsByDate: Record<string, CalendarStreamItem[]>;
  weekStart: WeekStart;
  todayDateKey: string;
  cursorDate: Date;
  legend: CalendarStreamLegend;
  onOpenBlog: (blogId: string) => void;
  onOpenSocial: (postId: string) => void;
};

type RowKind = "sh_blog" | "red_blog" | "sh_social" | "red_social";

const ROW_META: Record<
  RowKind,
  { label: string; dotClassName: string; legendKey: keyof CalendarStreamLegend }
> = {
  sh_blog: {
    label: "SH",
    dotClassName: "bg-brand",
    legendKey: "shBlog",
  },
  red_blog: {
    label: "RED",
    dotClassName: "bg-purple-500",
    legendKey: "redBlog",
  },
  sh_social: {
    label: "SH SOC",
    dotClassName: "border-2 border-brand bg-white",
    legendKey: "shSocial",
  },
  red_social: {
    label: "RED SOC",
    dotClassName: "border-2 border-purple-500 bg-white",
    legendKey: "redSocial",
  },
};

function getBlogRowKind(site: BlogRecord["site"]): RowKind {
  return site === "redactor.com" ? "red_blog" : "sh_blog";
}

function getSocialRowKind(post: CalendarStreamSocialPost): RowKind {
  return post.associated_blog?.site === "redactor.com" ? "red_social" : "sh_social";
}

function getSocialStatusLabel(status: SocialPostStatus) {
  // Lightweight, non-UI-critical status badge for hover tooltip; full labels live in src/lib/status.ts
  return status.replace(/_/g, " ");
}

function getSocialTypeLabel(type: SocialPostType) {
  return SOCIAL_POST_TYPE_LABELS[type];
}

export function CalendarStreamView({
  itemsByDate,
  weekStart,
  todayDateKey,
  cursorDate,
  legend,
  onOpenBlog,
  onOpenSocial,
}: CalendarStreamViewProps) {
  const todayWeekRef = useRef<HTMLDivElement | null>(null);
  const prependDistanceFromBottomRef = useRef<number | null>(null);
  const hasInitiallyScrolledRef = useRef(false);
  const [pastWeeks, setPastWeeks] = useState(DEFAULT_INITIAL_PAST_WEEKS);
  const [futureWeeks, setFutureWeeks] = useState(DEFAULT_INITIAL_FUTURE_WEEKS);

  const anchorWeekStart = useMemo(
    () => startOfWeek(cursorDate, { weekStartsOn: weekStart }),
    [cursorDate, weekStart]
  );

  const weekdayLabels = useMemo(() => getWeekdayLabels(weekStart), [weekStart]);

  const weeks = useMemo(() => {
    const firstWeekStart = subWeeks(anchorWeekStart, pastWeeks);
    return Array.from({ length: pastWeeks + futureWeeks + 1 }, (_, index) => {
      const start = addWeeks(firstWeekStart, index);
      return {
        start,
        end: endOfWeek(start, { weekStartsOn: weekStart }),
        days: eachDayOfInterval({
          start,
          end: endOfWeek(start, { weekStartsOn: weekStart }),
        }),
      };
    });
  }, [anchorWeekStart, futureWeeks, pastWeeks, weekStart]);

  const todayColumnIndex = useMemo(() => {
    const todayDate = new Date(`${todayDateKey}T00:00:00`);
    return (todayDate.getDay() - weekStart + 7) % 7;
  }, [todayDateKey, weekStart]);

  const visibleRowKinds = useMemo<RowKind[]>(() => {
    const rows: RowKind[] = [];
    if (legend.shBlog) rows.push("sh_blog");
    if (legend.redBlog) rows.push("red_blog");
    if (legend.shSocial) rows.push("sh_social");
    if (legend.redSocial) rows.push("red_social");
    return rows;
  }, [legend.redBlog, legend.redSocial, legend.shBlog, legend.shSocial]);

  const scrollTodayIntoView = useCallback(() => {
    if (!todayWeekRef.current) {
      return;
    }
    const shouldReduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    todayWeekRef.current.scrollIntoView({
      behavior: shouldReduceMotion ? "auto" : "smooth",
      block: "center",
    });
  }, []);

  // Scroll to today on first mount, and whenever the cursor is (re)set to today
  // (e.g. user clicks the "Today" button in the nav cluster).
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const cursorDateKey = format(cursorDate, "yyyy-MM-dd");
    if (hasInitiallyScrolledRef.current && cursorDateKey !== todayDateKey) {
      return;
    }
    const id = window.requestAnimationFrame(() => {
      scrollTodayIntoView();
      hasInitiallyScrolledRef.current = true;
    });
    return () => {
      window.cancelAnimationFrame(id);
    };
  }, [cursorDate, scrollTodayIntoView, todayDateKey]);

  // Preserve scroll position when prepending past weeks so the user stays anchored
  // to the content they were reading instead of jumping.
  useLayoutEffect(() => {
    if (prependDistanceFromBottomRef.current === null) {
      return;
    }
    if (typeof window === "undefined") {
      return;
    }
    const previousDistance = prependDistanceFromBottomRef.current;
    const nextScrollY = document.documentElement.scrollHeight - previousDistance;
    window.scrollTo({ top: nextScrollY, behavior: "auto" });
    prependDistanceFromBottomRef.current = null;
  }, [pastWeeks]);

  const handleLoadEarlier = useCallback(() => {
    if (typeof window !== "undefined") {
      prependDistanceFromBottomRef.current =
        document.documentElement.scrollHeight - window.scrollY;
    }
    setPastWeeks((previous) => previous + LOAD_MORE_CHUNK_WEEKS);
  }, []);

  const handleLoadLater = useCallback(() => {
    setFutureWeeks((previous) => previous + LOAD_MORE_CHUNK_WEEKS);
  }, []);

  return (
    <div
      className="rounded-xl border border-[color:var(--sh-gray-200)]/90 bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]"
    >
      {/* Sticky weekday header — relies on page scroll; parent must NOT be overflow-hidden */}
      <div
        className="sticky top-0 z-10 grid rounded-t-xl border-b border-[color:var(--sh-gray-200)] bg-[color:var(--sh-gray)]/95 backdrop-blur-sm"
        style={{ gridTemplateColumns: "80px repeat(7, minmax(0, 1fr))" }}
      >
        <div aria-hidden className="px-2 py-1.5" />
        {weekdayLabels.map((label, index) => (
          <div
            key={`${label}-${index}`}
            className={cn(
              "px-2 py-1.5 text-center text-[10px] font-semibold uppercase tracking-wide text-navy-500/70",
              todayColumnIndex === index ? "text-blurple-700" : null
            )}
          >
            {label}
          </div>
        ))}
      </div>

      <div className="flex justify-center border-b border-[color:var(--sh-gray-200)]/70 bg-[color:var(--sh-gray)]/40 px-3 py-0.5">
        <button
          type="button"
          onClick={handleLoadEarlier}
          className="rounded-md px-2 py-0.5 text-[11px] font-medium text-navy-500 transition-colors hover:bg-blurple-50 focus-visible:outline-none focus-visible:shadow-brand-focus"
        >
          Load earlier weeks
        </button>
      </div>

      <div>
        {weeks.map((week, weekIndex) => {
          const weekStartKey = format(week.start, "yyyy-MM-dd");
          const isTodayWeek = week.days.some(
            (day) => format(day, "yyyy-MM-dd") === todayDateKey
          );

          // Emit a full-width month banner once per calendar month. The "dominant"
          // month of a straddle week is the month of its first day (Monday when
          // weekStart=1). This matches the rule the user locked in.
          const previousWeek = weeks[weekIndex - 1];
          const showMonthBanner =
            weekIndex === 0 ||
            (previousWeek
              ? previousWeek.start.getMonth() !== week.start.getMonth() ||
                previousWeek.start.getFullYear() !== week.start.getFullYear()
              : true);

          // Bucket items per day × row-kind
          const bucketsByKindAndDay: Record<RowKind, Record<string, CalendarStreamItem[]>> = {
            sh_blog: {},
            red_blog: {},
            sh_social: {},
            red_social: {},
          };
          for (const day of week.days) {
            const key = format(day, "yyyy-MM-dd");
            const items = itemsByDate[key] ?? [];
            for (const item of items) {
              const kind: RowKind =
                item.type === "blog"
                  ? getBlogRowKind(item.blog.site)
                  : getSocialRowKind(item.social);
              if (!bucketsByKindAndDay[kind][key]) {
                bucketsByKindAndDay[kind][key] = [];
              }
              bucketsByKindAndDay[kind][key].push(item);
            }
          }

          // Only render a site row when the legend flag is on AND that site has
          // items this week. Empty site rows would be visual noise now that the
          // content-slot wrapper guarantees the week rhythm.
          const activeRowKinds = visibleRowKinds.filter(
            (kind) => Object.keys(bucketsByKindAndDay[kind]).length > 0
          );

          return (
            <Fragment key={weekStartKey}>
              {showMonthBanner ? (
                <div className="border-y border-[color:var(--sh-gray-200)] bg-[color:var(--sh-gray)]/80 px-3 py-1.5 text-[12px] font-semibold uppercase tracking-[0.08em] text-ink">
                  {format(week.start, "MMMM yyyy")}
                </div>
              ) : null}
              <div
                ref={isTodayWeek ? todayWeekRef : undefined}
                className={cn(
                  "border-b border-[color:var(--sh-gray-200)]/70 bg-white",
                  isTodayWeek ? "ring-1 ring-inset ring-brand/25" : null
                )}
              >
                {/* Date row — always renders, fixed height. Gutter is intentionally
                    empty; the month banner above carries the month anchor. */}
                <div
                  className="grid h-[22px] items-stretch border-b border-[color:var(--sh-gray-200)]/40"
                  style={{ gridTemplateColumns: "80px repeat(7, minmax(0, 1fr))" }}
                >
                  <div aria-hidden />
                  {week.days.map((day, index) => {
                    const dayKey = format(day, "yyyy-MM-dd");
                    const isToday = dayKey === todayDateKey;
                    return (
                      <div
                        key={dayKey}
                        className={cn(
                          "flex items-center justify-end px-2 text-[10px] font-medium tabular-nums text-navy-500/80",
                          index !== 0 ? "border-l border-[color:var(--sh-gray-200)]/50" : null,
                          isToday ? "bg-blurple-50 text-blurple-700" : null
                        )}
                      >
                        {format(day, "d")}
                      </div>
                    );
                  })}
                </div>

                {/* Content slot — min-height equals one content-row-worth of space
                    so empty weeks still reserve the vertical rhythm. When sites
                    have items, their rows render inside and the slot grows. */}
                <div className="min-h-[28px]">
                  {activeRowKinds.map((kind) => {
                    const rowMeta = ROW_META[kind];
                    return (
                      <div
                        key={`${weekStartKey}-${kind}`}
                        className="grid h-[28px] items-stretch"
                        style={{ gridTemplateColumns: "80px repeat(7, minmax(0, 1fr))" }}
                      >
                        <div className="flex items-center gap-1.5 px-2 text-[10px] font-semibold uppercase tracking-wide text-navy-500">
                          <span className={cn("h-1.5 w-1.5 rounded-full", rowMeta.dotClassName)} />
                          <span>{rowMeta.label}</span>
                        </div>
                        {week.days.map((day, index) => {
                          const dayKey = format(day, "yyyy-MM-dd");
                          const isToday = dayKey === todayDateKey;
                          const cellItems = bucketsByKindAndDay[kind][dayKey] ?? [];
                          return (
                            <div
                              key={`${dayKey}-${kind}`}
                              className={cn(
                                "flex items-center px-1.5 text-[12px] leading-tight",
                                index !== 0 ? "border-l border-[color:var(--sh-gray-200)]/50" : null,
                                isToday ? "bg-blurple-50/40" : null
                              )}
                            >
                              {cellItems.length === 0 ? null : (
                                <div className="w-full">
                                  {cellItems.map((item) => {
                                    if (item.type === "blog") {
                                      const fullTitle = item.blog.title;
                                      return (
                                        <button
                                          key={item.key}
                                          type="button"
                                          onClick={() => onOpenBlog(item.blog.id)}
                                          title={fullTitle}
                                          className="block w-full truncate rounded px-1 text-left text-[12px] font-medium text-blurple-700 underline decoration-transparent underline-offset-2 transition-colors hover:bg-blurple-50 hover:decoration-blurple-400 focus-visible:outline-none focus-visible:shadow-brand-focus"
                                        >
                                          {fullTitle}
                                        </button>
                                      );
                                    }
                                    const social = item.social;
                                    const fullTitle = `${getSocialTypeLabel(social.type)}: ${social.title} (${getSocialStatusLabel(social.status)})`;
                                    return (
                                      <button
                                        key={item.key}
                                        type="button"
                                        onClick={() => onOpenSocial(social.id)}
                                        title={fullTitle}
                                        className="block w-full truncate rounded px-1 text-left text-[12px] font-medium text-navy-500 underline decoration-transparent underline-offset-2 transition-colors hover:bg-blurple-50 hover:decoration-navy-500/40 focus-visible:outline-none focus-visible:shadow-brand-focus"
                                      >
                                        {social.title}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            </Fragment>
          );
        })}
      </div>

      <div className="flex justify-center rounded-b-xl border-t border-[color:var(--sh-gray-200)]/70 bg-[color:var(--sh-gray)]/40 px-3 py-0.5">
        <button
          type="button"
          onClick={handleLoadLater}
          className="rounded-md px-2 py-0.5 text-[11px] font-medium text-navy-500 transition-colors hover:bg-blurple-50 focus-visible:outline-none focus-visible:shadow-brand-focus"
        >
          Load later weeks
        </button>
      </div>
    </div>
  );
}

export default CalendarStreamView;
