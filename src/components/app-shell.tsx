"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { getUserRoles } from "@/lib/roles";

import { Button } from "@/components/button";
import { KbdShortcut } from "@/components/kbd-shortcut";
import { createUiPermissionContract } from "@/lib/permissions/uiPermissions";
import {
  clearQuickViewSnapshot,
  readQuickViewSnapshot,
  type QuickViewSnapshot,
} from "@/lib/quick-view";
import {
  MAIN_CREATE_SHORTCUTS,
  NEW_BLOG_SHORTCUT_KEY,
  QUICK_CREATE_SHORTCUT_KEY,
} from "@/lib/shortcuts";
import { setActiveModal, getActiveModal } from "@/lib/modal-state";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { AppIcon, type AppIconName } from "@/lib/icons";
import { socialPostAwaitingLiveLinkReminderNotification } from "@/lib/notification-helpers";
import {
  getApiErrorMessage,
  isApiFailure,
  parseApiResponseJson,
} from "@/lib/api-response";
import { cn } from "@/lib/utils";
import { Tooltip } from "@/components/tooltip";
import { useAuth } from "@/providers/auth-provider";
import { useNotifications } from "@/providers/notifications-provider";
import { useSidebarState } from "@/hooks/useSidebarState";
import { SidebarToggle } from "@/components/sidebar-toggle";
import { SidebarVersionFooter } from "@/components/sidebar-version-footer";

type NavItem = { href: string; label: string; icon: AppIconName };

const ENTRY_POINT_NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "home" },
  { href: "/tasks", label: "My Tasks", icon: "task" },
];

const CONTENT_WORKFLOW_NAV_ITEMS: NavItem[] = [
  { href: "/ideas", label: "Ideas", icon: "idea" },
  { href: "/blogs", label: "Blogs", icon: "blog" },
  { href: "/social-posts", label: "Social Posts", icon: "social" },
];

const SECONDARY_NAV_ITEMS: NavItem[] = [
  { href: "/calendar", label: "Calendar", icon: "calendar" },
  { href: "/blogs/cardboard", label: "CardBoard", icon: "kanban" },
];
const APP_SHELL_LOGO_SEQUENCE = [
  { src: "/sighthound-badge-animated.gif", width: 64, height: 36, alt: "Sighthound badge" },
  { src: "/sighthound-badge-mark.svg", width: 36, height: 36, alt: "Sighthound badge mark" },
] as const;
type ShortcutDefinition = {
  id: string;
  label: string;
  keys: string[];
};
type QuickCreateItem = {
  id: "new-blog" | "new-idea" | "new-social-post";
  label: "New Blog" | "New Idea" | "New Social Post";
  href: "/blogs/new" | "/ideas" | "/social-posts?create=1";
  shortcut: string;
  isDirectShortcut: boolean;
};
type TaskShortcutItem = {
  id: string;
  title: string;
  kind: "blog" | "social";
  href: string;
  statusLabel: string;
  scheduledDate: string | null;
  actionState: "action_required" | "waiting_on_others";
};

function formatNotificationAge(createdAt: number) {
  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - createdAt) / 1000));
  if (elapsedSeconds < 60) {
    return `${elapsedSeconds}s ago`;
  }
  const elapsedMinutes = Math.floor(elapsedSeconds / 60);
  if (elapsedMinutes < 60) {
    return `${elapsedMinutes}m ago`;
  }
  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) {
    return `${elapsedHours}h ago`;
  }
  const elapsedDays = Math.floor(elapsedHours / 24);
  return `${elapsedDays}d ago`;
}

export function AppShell({
  children,
  sidebarContent = null,
}: {
  children: React.ReactNode;
  sidebarContent?: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { hasPermission, profile, session, signOut, user } = useAuth();
  const {
    notifications,
    unreadCount,
    pushNotification,
    markAsRead,
    clearAll,
  } = useNotifications();
  const { collapsed, setCollapsed } = useSidebarState();
  const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false);
  const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false);
  const [activeQuickCreateIndex, setActiveQuickCreateIndex] = useState(0);
  const [isShortcutModalOpen, setIsShortcutModalOpen] = useState(false);
  const [quickViewSnapshot, setQuickViewSnapshot] = useState<QuickViewSnapshot | null>(
    null
  );
  const [quickViewError, setQuickViewError] = useState<string | null>(null);
  const [activityFeed, setActivityFeed] = useState<
    Array<{
      id: string;
      content_type: "blog" | "social_post";
      content_id: string;
      content_title: string;
      event_type: string;
      event_title: string;
      event_summary: string | null;
      changed_by_name: string | null;
      changed_at: string;
    }>
  >([]);
  const [requiredTaskShortcuts, setRequiredTaskShortcuts] = useState<TaskShortcutItem[]>(
    []
  );
  const [headerLogoSourceIndex, setHeaderLogoSourceIndex] = useState(0);
  const [headerLogoLoaded, setHeaderLogoLoaded] = useState(false);
  const notificationPanelRef = useRef<HTMLDivElement | null>(null);
  const sidebarRef = useRef<HTMLElement | null>(null);
  const sidebarToggleRef = useRef<HTMLButtonElement | null>(null);
  const sidebarNavScrollRef = useRef<HTMLDivElement | null>(null);
  const quickCreateItemRefs = useRef<Array<HTMLAnchorElement | null>>([]);
  const permissionContract = useMemo(
    () => createUiPermissionContract(hasPermission),
    [hasPermission]
  );
  const canCreateBlogs = permissionContract.canCreateBlog;
  const requiredByLabel = profile?.display_name || profile?.full_name || "You";
  const userRoles = getUserRoles(profile);
  const isAdmin = userRoles.includes("admin");
  const canManagePermissions = isAdmin;
  const canManageSocialPosts =
    permissionContract.canViewDashboard || permissionContract.canOverrideWorkflow;
  const activeHeaderLogo = APP_SHELL_LOGO_SEQUENCE[headerLogoSourceIndex] ?? null;
  const globalShortcuts = useMemo(() => {
    const shortcuts: ShortcutDefinition[] = [
      {
        id: "global-command-palette",
        label: "Open command palette",
        keys: ["⌘K", "Ctrl+K"],
      },
      {
        id: "global-focus-search",
        label: "Focus search",
        keys: ["/"],
      },
      {
        id: "global-go-dashboard",
        label: "Go to dashboard",
        keys: ["D"],
      },
      {
        id: "global-go-calendar",
        label: "Go to calendar",
        keys: ["G"],
      },
    ];
    if (canCreateBlogs || canManageSocialPosts) {
      shortcuts.push({
        id: "global-quick-create",
        label: "Quick create",
        keys: [QUICK_CREATE_SHORTCUT_KEY],
      });
    }
    return shortcuts;
  }, [canCreateBlogs, canManageSocialPosts]);

  // Reset sidebar scroll position on route change to prevent random jumps
  useEffect(() => {
    if (!sidebarNavScrollRef.current) {
      return;
    }
    sidebarNavScrollRef.current.scrollTop = 0;
  }, [pathname]);

  const pageShortcutScopeLabel = useMemo(() => {
    if (pathname.startsWith("/dashboard")) {
      return "Dashboard";
    }
    if (pathname.startsWith("/tasks")) {
      return "Tasks";
    }
    if (pathname.startsWith("/calendar")) {
      return "Calendar";
    }
    if (pathname.startsWith("/blogs/cardboard")) {
      return "CardBoard";
    }
    if (pathname.startsWith("/blogs")) {
      return "Blogs";
    }
    if (pathname.startsWith("/social-posts")) {
      return "Social Posts";
    }
    if (pathname.startsWith("/ideas")) {
      return "Ideas";
    }
    if (pathname.startsWith("/resources")) {
      return "User Manual";
    }
    if (pathname.startsWith("/settings")) {
      return "Settings";
    }
    return "Page";
  }, [pathname]);
  const pageShortcuts = useMemo(() => {
    const shortcuts: ShortcutDefinition[] = [];
    if (pathname.startsWith("/blogs") && canCreateBlogs) {
      shortcuts.push({
        id: "page-create-blog",
        label: "New Blog",
        keys: [NEW_BLOG_SHORTCUT_KEY],
      });
    }
    if (/^\/social-posts\/[^/]+$/.test(pathname)) {
      shortcuts.push(
        {
          id: "page-social-next-required-field",
          label: "Jump to next required field",
          keys: ["⌥⇧J"],
        },
        {
          id: "page-social-primary-action",
          label: "Run primary action",
          keys: ["⌥⇧↵"],
        }
      );
    }
    return shortcuts;
  }, [canCreateBlogs, pathname]);
  const quickCreateItems = useMemo<QuickCreateItem[]>(() => {
    const items: QuickCreateItem[] = [];
    if (canCreateBlogs) {
      items.push({
        id: "new-blog",
        label: "New Blog",
        href: "/blogs/new",
        shortcut: MAIN_CREATE_SHORTCUTS.newBlog,
        isDirectShortcut: true,
      });
      items.push({
        id: "new-idea",
        label: "New Idea",
        href: "/ideas",
        shortcut: MAIN_CREATE_SHORTCUTS.newIdea,
        isDirectShortcut: false,
      });
    }
    if (canManageSocialPosts) {
      items.push({
        id: "new-social-post",
        label: "New Social Post",
        href: "/social-posts?create=1",
        shortcut: MAIN_CREATE_SHORTCUTS.newSocialPost,
        isDirectShortcut: false,
      });
    }
    return items;
  }, [canCreateBlogs, canManageSocialPosts]);
  const isQuickViewActive = Boolean(
    quickViewSnapshot &&
      user?.id &&
      quickViewSnapshot.adminUserId &&
      user.id !== quickViewSnapshot.adminUserId
  );


  useEffect(() => {
    if (!isQuickCreateOpen) {
      return;
    }
    setActiveQuickCreateIndex(0);
  }, [isQuickCreateOpen, quickCreateItems.length]);
  useEffect(() => {
    if (!isQuickCreateOpen) {
      return;
    }
    quickCreateItemRefs.current[activeQuickCreateIndex]?.focus();
  }, [activeQuickCreateIndex, isQuickCreateOpen]);
  const executeQuickCreateItem = useCallback(
    (item: QuickCreateItem) => {
      setIsQuickCreateOpen(false);
      router.push(item.href);
    },
    [router]
  );
  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }
      if (event.key === "Escape") {
        if (isShortcutModalOpen) {
          event.preventDefault();
          setIsShortcutModalOpen(false);
          return;
        }
        if (isQuickCreateOpen) {
          event.preventDefault();
          setIsQuickCreateOpen(false);
          setActiveModal(null);
          return;
        }
      }

      const target = event.target as HTMLElement | null;
      const isTypingField =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT" ||
        target?.isContentEditable;

      if (event.key === "/") {
        if (isTypingField) {
          return;
        }
        event.preventDefault();
        const searchInput = document.querySelector<HTMLInputElement>('input[type="search"]');
        searchInput?.focus();
        searchInput?.select();
        return;
      }

      if (isTypingField) {
        return;
      }
      if (isQuickCreateOpen) {
        if (quickCreateItems.length === 0) {
          return;
        }
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault();
          const delta = event.key === "ArrowDown" ? 1 : -1;
          setActiveQuickCreateIndex((previous) => {
            const next = (previous + delta + quickCreateItems.length) % quickCreateItems.length;
            return next;
          });
          return;
        }
        if (event.key === "Enter") {
          event.preventDefault();
          const activeItem =
            quickCreateItems[activeQuickCreateIndex] ?? quickCreateItems[0];
          if (activeItem) {
            executeQuickCreateItem(activeItem);
          }
          return;
        }
        return;
      }

      if (event.key.toLowerCase() === "d" && pathname !== "/dashboard") {
        event.preventDefault();
        router.push("/dashboard");
        return;
      }

      if (
        event.key.toLowerCase() === QUICK_CREATE_SHORTCUT_KEY.toLowerCase() &&
        (canCreateBlogs || canManageSocialPosts)
      ) {
        const activeModal = getActiveModal();
        if (activeModal && activeModal !== "app-shell-quick-create") {
          return; // Don't open if another modal is already open
        }
        event.preventDefault();
        setIsQuickCreateOpen((prev) => {
          const nextIsOpen = !prev;
          if (nextIsOpen) {
            setActiveModal("app-shell-quick-create");
          } else {
            setActiveModal(null);
          }
          return nextIsOpen;
        });
        return;
      }

      if (event.key.toLowerCase() === "g" && pathname !== "/calendar") {
        event.preventDefault();
        router.push("/calendar");
        return;
      }

      if (event.key.toLowerCase() === NEW_BLOG_SHORTCUT_KEY.toLowerCase() && canCreateBlogs) {
        event.preventDefault();
        router.push("/blogs/new");
      }
    };

    window.addEventListener("keydown", handleKeydown);
    return () => {
      window.removeEventListener("keydown", handleKeydown);
    };
  }, [
    canCreateBlogs,
    canManageSocialPosts,
    executeQuickCreateItem,
    activeQuickCreateIndex,
    isQuickCreateOpen,
    isShortcutModalOpen,
    pathname,
    quickCreateItems,
    router,
  ]);
  useEffect(() => {
    const handleOpenShortcutModal = () => {
      setIsShortcutModalOpen(true);
    };
    window.addEventListener("open-shortcuts-modal", handleOpenShortcutModal);
    return () => {
      window.removeEventListener("open-shortcuts-modal", handleOpenShortcutModal);
    };
  }, []);

  useEffect(() => {
    if (!isNotificationPanelOpen) {
      return;
    }
    const handleOutsideClick = (event: MouseEvent) => {
      if (!notificationPanelRef.current?.contains(event.target as Node)) {
        setIsNotificationPanelOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isNotificationPanelOpen]);

  useLayoutEffect(() => {
    if (!sidebarNavScrollRef.current) {
      return;
    }
    sidebarNavScrollRef.current.scrollTop = 0;
  }, [pathname]);

  useEffect(() => {
    setQuickViewSnapshot(readQuickViewSnapshot());
    setQuickViewError(null);
  }, [user?.id]);

  // Load activity feed when notification panel opens
  useEffect(() => {
    if (!isNotificationPanelOpen) {
      return;
    }
    const loadActivityFeed = async () => {
      try {
        if (session?.access_token) {
          const shortcutResponse = await fetch("/api/dashboard/tasks-snapshot", {
            headers: {
              authorization: `Bearer ${session.access_token}`,
            },
          });
          const shortcutPayload = await parseApiResponseJson<{
            requiredByMe?: TaskShortcutItem[];
          }>(shortcutResponse);
          if (!isApiFailure(shortcutResponse, shortcutPayload)) {
            setRequiredTaskShortcuts(shortcutPayload.requiredByMe ?? []);
          } else {
            setRequiredTaskShortcuts([]);
          }
        } else {
          setRequiredTaskShortcuts([]);
        }
        if (isAdmin && session?.access_token) {
          const reminderResponse = await fetch("/api/social-posts/reminders", {
            method: "POST",
            headers: {
              authorization: `Bearer ${session.access_token}`,
            },
          });
          const reminderPayload = await parseApiResponseJson<{
            posts?: Array<{ id: string; title: string }>;
          }>(reminderResponse);
          if (!isApiFailure(reminderResponse, reminderPayload)) {
            for (const reminderPost of reminderPayload.posts ?? []) {
              pushNotification(
                socialPostAwaitingLiveLinkReminderNotification(
                  reminderPost.title,
                  reminderPost.id
                )
              );
            }
          } else {
            console.warn(
              getApiErrorMessage(
                reminderPayload,
                "Failed to run social reminder sweep."
              )
            );
          }
        }
        const response = await fetch("/api/activity-feed");
        const payload = await parseApiResponseJson<{
          data?: {
            activities?: Array<{
              id: string;
              content_type: "blog" | "social_post";
              content_id: string;
              content_title: string;
              event_type: string;
              event_title: string;
              event_summary: string | null;
              changed_by_name: string | null;
              changed_at: string;
            }>;
          };
        }>(response);
        if (isApiFailure(response, payload)) {
          throw new Error(getApiErrorMessage(payload, "Failed to load activity feed."));
        }
        setActivityFeed(payload.data?.activities || []);
      } catch (error) {
        console.error("Failed to load activity feed:", error);
        setRequiredTaskShortcuts([]);
      }
    };
    void loadActivityFeed();
  }, [isAdmin, isNotificationPanelOpen, pushNotification, session?.access_token]);

  const returnToAdminFromQuickView = async () => {
    const snapshot = readQuickViewSnapshot();
    if (!snapshot) {
      setQuickViewError("No saved admin session found.");
      return;
    }

    setQuickViewError(null);
    const supabase = getSupabaseBrowserClient();
    const { error: setSessionError } = await supabase.auth.setSession({
      access_token: snapshot.adminAccessToken,
      refresh_token: snapshot.adminRefreshToken,
    });
    if (setSessionError) {
      setQuickViewError(setSessionError.message);
      return;
    }

    clearQuickViewSnapshot();
    setQuickViewSnapshot(null);
    router.push("/settings");
  };

  const handleSidebarToggle = useCallback(() => {
    const activeElement =
      typeof document !== "undefined"
        ? (document.activeElement as HTMLElement | null)
        : null;
    const wasFocusInsideSidebar = Boolean(
      activeElement && sidebarRef.current?.contains(activeElement)
    );

    setCollapsed((previous) => !previous);

    if (!wasFocusInsideSidebar) {
      return;
    }

    window.requestAnimationFrame(() => {
      const currentActiveElement =
        typeof document !== "undefined"
          ? (document.activeElement as HTMLElement | null)
          : null;
      const focusIsLost = !currentActiveElement || currentActiveElement === document.body;
      const focusMovedOutsideSidebar = Boolean(
        currentActiveElement && !sidebarRef.current?.contains(currentActiveElement)
      );

      if (focusIsLost || focusMovedOutsideSidebar) {
        sidebarToggleRef.current?.focus();
      }
    });
  }, [setCollapsed]);
  const handleHeaderLogoError = useCallback(() => {
    setHeaderLogoLoaded(false);
    setHeaderLogoSourceIndex((currentIndex) => currentIndex + 1);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-[#fcfcfe]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <Link
            href="/"
            className="flex items-center gap-3 rounded-md px-1 py-1 hover:bg-slate-50"
            aria-label="Sighthound Content Relay"
          >
            <div className="relative flex h-9 w-16 shrink-0 items-center">
              {activeHeaderLogo ? (
                <>
                  {!headerLogoLoaded ? (
                    <span
                      aria-hidden="true"
                      className={cn(
                        "absolute left-0 top-0 h-9 animate-pulse rounded-md bg-slate-200/70",
                        activeHeaderLogo.width === 64 ? "w-16" : "w-9"
                      )}
                    />
                  ) : null}
                  <Image
                    src={activeHeaderLogo.src}
                    alt={activeHeaderLogo.alt}
                    width={activeHeaderLogo.width}
                    height={activeHeaderLogo.height}
                    className={cn(
                      "h-9 object-contain transition-opacity",
                      activeHeaderLogo.width === 64 ? "w-auto" : "w-9",
                      headerLogoLoaded
                        ? "opacity-100"
                        : "pointer-events-none absolute left-0 top-0 opacity-0"
                    )}
                    priority
                    unoptimized
                    onLoad={() => {
                      setHeaderLogoLoaded(true);
                    }}
                    onError={handleHeaderLogoError}
                  />
                </>
              ) : (
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-slate-900 text-[10px] font-semibold uppercase tracking-wide text-white">
                  SH
                </span>
              )}
            </div>
            <span className="leading-tight">
              <span className="block text-sm font-semibold text-slate-900">Sighthound</span>
              <span className="block text-xs text-slate-600">Content Relay</span>
            </span>
          </Link>

          <div className="flex items-center gap-4">
            {/* Notifications - Plain icon with badge */}
            <div className="relative" ref={notificationPanelRef}>
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-md p-1.5 text-slate-600 transition hover:bg-slate-100 hover:text-slate-800"
                aria-label="Notifications"
                onClick={() => {
                  setIsNotificationPanelOpen((previous) => !previous);
                }}
              >
                <AppIcon name="bell" boxClassName="h-5 w-5" size={16} />
                {unreadCount > 0 ? (
                  <span className="absolute -right-1 -top-1 inline-flex min-w-[18px] items-center justify-center rounded-full bg-rose-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                    {unreadCount}
                  </span>
                ) : null}
              </button>
              {isNotificationPanelOpen ? (
                <div className="absolute right-0 z-40 mt-2 w-[360px] rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-slate-900">Notifications</h3>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsNotificationPanelOpen(false);
                          router.push("/settings/access-logs");
                        }}
                        className="text-xs text-slate-600 transition hover:text-slate-900"
                        title="View full activity history"
                      >
                        View History
                      </button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="xs"
                        onClick={() => {
                          clearAll();
                        }}
                      >
                        Clear All
                      </Button>
                    </div>
                  </div>
                  {notifications.length === 0 &&
                  activityFeed.length === 0 &&
                  requiredTaskShortcuts.length === 0 ? (
                    <p className="mt-3 rounded-md border border-slate-200 bg-slate-50 px-2 py-2 text-xs text-slate-500">
                      No updates or activity.
                    </p>
                  ) : (
                    <div className="mt-2 space-y-3 max-h-[400px] overflow-y-auto">
                      {requiredTaskShortcuts.length > 0 ? (
                        <div>
                          <p className="mb-1 text-xs font-semibold uppercase text-slate-500">
                            Required by: {requiredByLabel}
                          </p>
                          <ul className="space-y-1">
                            {requiredTaskShortcuts.slice(0, 5).map((task) => (
                              <li key={task.id}>
                                <button
                                  type="button"
                                  className="w-full rounded-md border border-emerald-200 bg-emerald-50 px-2 py-2 text-left text-xs transition hover:bg-emerald-100"
                                  onClick={() => {
                                    setIsNotificationPanelOpen(false);
                                    router.push(task.href);
                                  }}
                                >
                                  <p className="truncate font-medium text-slate-900">
                                    {task.title}
                                  </p>
                                  <p className="mt-0.5 truncate text-slate-700">
                                    {task.kind === "blog" ? "Blog" : "Social"} •{" "}
                                    {task.statusLabel}
                                  </p>
                                </button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                      {/* Real-time notifications */}
                      {notifications.length > 0 && (
                        <div>
                          <p className="mb-1 text-xs font-semibold uppercase text-slate-500">Updates</p>
                          <ul className="space-y-1">
                            {notifications.slice(0, 5).map((notification) => (
                              <li key={notification.id}>
                                <button
                                  type="button"
                                  className={cn(
                                    "w-full rounded-md border px-2 py-2 text-left transition hover:bg-slate-50",
                                    notification.read
                                      ? "border-slate-200 bg-white"
                                      : "border-indigo-200 bg-indigo-50"
                                  )}
                                  onClick={() => {
                                    markAsRead(notification.id);
                                    setIsNotificationPanelOpen(false);
                                    if (notification.href) {
                                      router.push(notification.href);
                                    }
                                  }}
                                >
                                  <div className="flex items-start gap-2">
                                    <span className="mt-0.5 inline-flex shrink-0">
                                      <AppIcon
                                        name="bell"
                                        boxClassName="h-4 w-4"
                                        size={14}
                                        className="text-blue-600"
                                      />
                                    </span>
                                    <div className="min-w-0 flex-1">
                                      <p className="font-medium text-slate-900 text-sm">{notification.title}</p>
                                      <p className="mt-0.5 text-sm text-slate-700">{notification.message}</p>
                                      <p className="mt-1 text-xs text-slate-500">
                                        {formatNotificationAge(notification.createdAt)}
                                      </p>
                                    </div>
                                  </div>
                                </button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Activity history */}
                      {activityFeed.length > 0 && (
                        <div>
                          <p className="mb-1 text-xs font-semibold uppercase text-slate-500">Recent Activity</p>
                          <ul className="space-y-1">
                            {activityFeed.slice(0, 10).map((activity) => {
                              const href =
                                activity.content_type === "blog"
                                  ? `/blogs/${activity.content_id}`
                                  : `/social-posts/${activity.content_id}`;
                              const icon =
                                activity.content_type === "blog" ? "blog" : "social";
                              return (
                                <li key={activity.id}>
                                  <button
                                    type="button"
                                    className="w-full rounded-md border border-slate-200 bg-white px-2 py-2 text-left text-xs transition hover:bg-slate-50"
                                    onClick={() => {
                                      setIsNotificationPanelOpen(false);
                                      router.push(href);
                                    }}
                                  >
                                    <div className="flex items-start gap-2">
                                      <span className="mt-0.5 inline-flex shrink-0">
                                        <AppIcon
                                          name={icon}
                                          boxClassName="h-4 w-4"
                                          size={12}
                                          className="text-slate-400"
                                        />
                                      </span>
                                      <div className="min-w-0 flex-1">
                                        <p className="font-medium text-slate-900">
                                          {activity.event_title}
                                        </p>
                                        {activity.event_summary ? (
                                          <p className="mt-0.5 truncate text-slate-700">
                                            {activity.event_summary}
                                          </p>
                                        ) : null}
                                        <p className="mt-0.5 truncate text-slate-500">
                                          {activity.content_title}
                                          {activity.changed_by_name
                                            ? ` • ${activity.changed_by_name}`
                                            : ""}
                                        </p>
                                        <p className="mt-1 text-slate-500">
                                          {formatNotificationAge(new Date(activity.changed_at).getTime())}
                                        </p>
                                      </div>
                                    </div>
                                  </button>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            {/* Shortcuts - Plain text link */}
            <button
              type="button"
              className="text-sm text-slate-700 transition hover:text-slate-900"
              onClick={() => {
                setIsShortcutModalOpen(true);
              }}
              aria-label="View keyboard shortcuts"
            >
              Shortcuts
            </button>

            {/* User Manual - Plain text link */}
            <Link
              href="/resources"
              className="text-sm text-slate-700 transition hover:text-slate-900"
              title="Go to User Manual"
            >
              User Manual
            </Link>

            {/* User name - Clickable link to settings */}
            <Link
              href="/settings"
              className="text-sm text-slate-700 transition hover:text-slate-900"
              title="Go to settings"
            >
              {profile?.display_name || profile?.full_name}
            </Link>

            {/* Sign out - Button */}
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={async () => {
                clearQuickViewSnapshot();
                setQuickViewSnapshot(null);
                await signOut();
                router.replace("/login");
              }}
            >
              Sign out
            </Button>
          </div>
        </div>
      </header>
      {isQuickViewActive || quickViewError ? (
        <div className="border-b border-indigo-200 bg-indigo-50">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-6 py-2 text-sm">
            <p className="text-indigo-800">
              {isQuickViewActive && quickViewSnapshot
                ? `Quick-view active: actions are being performed as ${quickViewSnapshot.targetDisplayName}.`
                : null}
              {quickViewError ? (
                <span className="ml-2 text-rose-700">{quickViewError}</span>
              ) : null}
            </p>
            {isQuickViewActive ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  void returnToAdminFromQuickView();
                }}
              >
                Return to Admin
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="flex min-h-[calc(100vh-8rem)] w-full bg-slate-50">
        <aside
          ref={sidebarRef}
          className={cn(
            "sticky top-0 h-screen shrink-0 flex flex-col border-r border-slate-200 bg-white transition-[width] duration-200 ease-in-out motion-reduce:transition-none",
            collapsed ? "w-[72px]" : "w-[240px]"
          )}
        >
          {/* Sidebar header with toggle */}
          <div className={cn("shrink-0 py-3", collapsed ? "px-1" : "px-2")}>
            {collapsed ? (
              <Tooltip
                content="Open sidebar"
                delay={100}
                className="block w-full"
              >
                <SidebarToggle
                  ref={sidebarToggleRef}
                  collapsed={collapsed}
                  onToggle={handleSidebarToggle}
                />
              </Tooltip>
            ) : (
              <div className="flex items-center justify-between">
                <span className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Menu</span>
                <Tooltip
                  content="Close sidebar"
                  delay={100}
                  className="inline-flex"
                >
                  <SidebarToggle
                    ref={sidebarToggleRef}
                    collapsed={collapsed}
                    onToggle={handleSidebarToggle}
                  />
                </Tooltip>
              </div>
            )}
          </div>
          <div ref={sidebarNavScrollRef} className="flex-1 overflow-y-auto">
            <nav className="space-y-1 px-1 pb-3">
              {/* Helper to render nav items with consistent styling */}
              {(() => {
                const renderNavItem = (item: NavItem, isActive: boolean) => {
                  const navKey = `${item.href}-${item.label}`;
                  const navItemClassName = cn(
                    "group flex w-full min-h-11 items-center rounded-md transition motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-inset",
                    collapsed ? "justify-center px-2 py-2" : "gap-2 px-3 py-2",
                    isActive
                      ? "bg-slate-900 text-white font-semibold shadow-[inset_0_0_0_1px_rgba(255,255,255,0.16)] hover:bg-slate-900 hover:text-white"
                      : "text-slate-700 font-medium hover:bg-slate-100 hover:text-slate-900"
                  );

                  const navContent = (
                    <Link
                      href={item.href}
                      className={navItemClassName}
                      aria-label={collapsed ? item.label : undefined}
                      aria-current={isActive ? "page" : undefined}
                    >
                      <AppIcon
                        name={item.icon}
                        boxClassName="h-4 w-4 shrink-0"
                        size={14}
                        className={cn(
                          isActive ? "text-white" : "text-slate-400 group-hover:text-slate-700"
                        )}
                      />
                      {!collapsed ? <span className="text-sm">{item.label}</span> : null}
                    </Link>
                  );

                  if (collapsed) {
                    return (
                      <Tooltip
                        key={navKey}
                        content={item.label}
                        delay={100}
                        className="block w-full"
                      >
                        {navContent}
                      </Tooltip>
                    );
                  }

                  return (
                    <div key={navKey} className="block w-full">
                      {navContent}
                    </div>
                  );
                };

                return (
                  <>
                    {/* Entry points */}
                    <div className="space-y-0.5">
                      {ENTRY_POINT_NAV_ITEMS.map((item) => {
                        const isActive = pathname === item.href;
                        return renderNavItem(item, isActive);
                      })}
                    </div>

                    {/* Content workflow */}
                    <div className="mt-2 space-y-0.5 border-t border-slate-200 pt-2">
                      {CONTENT_WORKFLOW_NAV_ITEMS.map((item) => {
                        const isActive = pathname === item.href;
                        return renderNavItem(item, isActive);
                      })}
                    </div>

                    {/* Supporting tools */}
                    <div className="mt-2 space-y-0.5 border-t border-slate-200 pt-2">
                      {SECONDARY_NAV_ITEMS.map((item) => {
                        const isActive = pathname === item.href;
                        return renderNavItem(item, isActive);
                      })}
                    </div>

                    {/* System/Admin */}
                    <div className="mt-2 space-y-0.5 border-t border-slate-200 pt-2">
                      {renderNavItem({ href: "/settings", label: "Settings", icon: "settings" }, pathname === "/settings")}
                      {canManagePermissions
                        ? renderNavItem(
                            { href: "/settings/permissions", label: "Permissions", icon: "lock" },
                            pathname === "/settings/permissions"
                          )
                        : null}
                    </div>
                  </>
                );
              })()}
            </nav>
          </div>
          {!collapsed && sidebarContent ? (
            <div className="shrink-0 border-t border-slate-200 px-1 pt-3 pb-3">{sidebarContent}</div>
          ) : null}
          {!collapsed ? <SidebarVersionFooter /> : null}
        </aside>
        <div className="min-w-0 flex-1">
          <div className="mx-auto w-full max-w-7xl px-6 py-6">
            <main className="min-w-0 rounded-lg border border-slate-200 bg-white p-5">
              {children}
            </main>
          </div>
        </div>
      </div>
      {isQuickCreateOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close quick create"
            className="absolute inset-0 bg-slate-900/35"
            onClick={() => {
              setIsQuickCreateOpen(false);
            }}
          />
          <section className="relative z-10 w-full max-w-md rounded-lg border border-slate-200 bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Quick Create</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Jump straight into a new content item.
                </p>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  setIsQuickCreateOpen(false);
                }}
              >
                Close
              </Button>
            </div>
            <div className="mt-4 grid gap-2">
              <div role="listbox" aria-label="Quick create actions">
                {quickCreateItems.map((item, index) => (
                  <Link
                    key={item.id}
                    ref={(node) => {
                      quickCreateItemRefs.current[index] = node;
                    }}
                    href={item.href}
                    role="option"
                    aria-selected={index === activeQuickCreateIndex}
                    aria-label={
                      item.isDirectShortcut
                        ? `${item.label}. Direct shortcut ${item.shortcut}.`
                        : `${item.label}. Open Quick Create first with ${QUICK_CREATE_SHORTCUT_KEY}, then select this action.`
                    }
                    aria-keyshortcuts={item.isDirectShortcut ? item.shortcut : undefined}
                    className={cn(
                      "pressable mt-2 block rounded-md border px-3 py-2 text-sm font-medium text-slate-800 transition",
                      index === activeQuickCreateIndex
                        ? "border-indigo-400 bg-indigo-50 ring-2 ring-indigo-200"
                        : "border-slate-300 bg-white hover:bg-slate-50"
                    )}
                    onMouseEnter={() => {
                      setActiveQuickCreateIndex(index);
                    }}
                    onFocus={() => {
                      setActiveQuickCreateIndex(index);
                    }}
                    onClick={(event) => {
                      event.preventDefault();
                      executeQuickCreateItem(item);
                    }}
                  >
                    <span className="flex items-center justify-between gap-3">
                      <span>{item.label}</span>
                      <KbdShortcut>{item.shortcut}</KbdShortcut>
                    </span>
                  </Link>
                ))}
              </div>
            </div>
            <p className="mt-4 text-xs text-slate-500">
              Use ↑/↓ to move and Enter to select.{" "}
              <button
                type="button"
                className="font-medium text-slate-700 underline-offset-2 hover:underline"
                onClick={() => {
                  setIsQuickCreateOpen(false);
                  setIsShortcutModalOpen(true);
                }}
              >
                Shortcuts
              </button>{" "}
              details
            </p>
          </section>
        </div>
      ) : null}
      {isShortcutModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close shortcuts modal"
            className="absolute inset-0 bg-slate-900/35"
            onClick={() => {
              setIsShortcutModalOpen(false);
            }}
          />
          <section className="relative z-10 w-full max-w-md rounded-lg border border-slate-200 bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Shortcuts</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Keyboard shortcuts grouped by global and page scope.
                </p>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  setIsShortcutModalOpen(false);
                }}
              >
                Close
              </Button>
            </div>
            <div className="mt-4 space-y-4 text-xs text-slate-700">
              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Navigation
                </p>
                <div className="space-y-2">
                  {globalShortcuts
                    .filter((s) => !s.id.includes("create"))
                    .map((shortcut) => (
                      <div
                        key={shortcut.id}
                        className="flex items-center justify-between gap-3 rounded border border-slate-200 bg-slate-50 px-3 py-2"
                      >
                        <span>{shortcut.label}</span>
                        <div className="flex items-center gap-1">
                          {shortcut.keys.map((key) => (
                            <KbdShortcut key={`${shortcut.id}-${key}`}>{key}</KbdShortcut>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Create
                </p>
                <div className="space-y-2">
                  <div className="rounded border border-slate-200 bg-slate-50 px-3 py-2">
                    <div className="flex items-center justify-between gap-3">
                      <span>New Blog</span>
                      <KbdShortcut>N</KbdShortcut>
                    </div>
                    <p className="mt-1 text-[10px] text-slate-500">Direct shortcut</p>
                  </div>
                  <div className="rounded border border-slate-200 bg-slate-50 px-3 py-2">
                    <div className="flex items-center justify-between gap-3">
                      <span>New Idea / Social Post</span>
                      <KbdShortcut>Q</KbdShortcut>
                    </div>
                    <p className="mt-1 text-[10px] text-slate-500">
                      Opens Quick Create. Use ↑/↓ and Enter to select.
                    </p>
                  </div>
                </div>
              </div>
              <div className="rounded-md border border-amber-200 bg-amber-50 p-2 text-[10px] text-amber-800">
                <p className="font-medium">Tip: Press Q, then ↑/↓ to navigate, Enter to select action</p>
              </div>
              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  {pageShortcutScopeLabel} shortcuts
                </p>
                {pageShortcuts.length > 0 ? (
                  <div className="space-y-2">
                    {pageShortcuts.map((shortcut) => (
                      <div
                        key={shortcut.id}
                        className="flex items-center justify-between gap-3 rounded border border-slate-200 bg-slate-50 px-3 py-2"
                      >
                        <span>{shortcut.label}</span>
                        <div className="flex items-center gap-1">
                          {shortcut.keys.map((key) => (
                            <KbdShortcut key={`${shortcut.id}-${key}`}>{key}</KbdShortcut>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-slate-500">
                    No page-specific shortcuts on this page.
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

