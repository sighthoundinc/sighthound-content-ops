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
import { cn } from "@/lib/utils";
import { Tooltip } from "@/components/tooltip";
import { useAuth } from "@/providers/auth-provider";
import { useNotifications } from "@/providers/notifications-provider";
import { useSidebarState } from "@/hooks/useSidebarState";
import { SidebarToggle } from "@/components/sidebar-toggle";
import { SidebarVersionFooter } from "@/components/sidebar-version-footer";
import { OnboardingTour } from "@/components/onboarding-tour";
import { useDensityPreference } from "@/hooks/useDensityPreference";
import { groupNotifications } from "@/lib/notification-grouping";

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
  const { hasPermission, profile, signOut, user } = useAuth();
  const {
    notifications,
    unreadCount,
    markAsRead,
  } = useNotifications();
  const { collapsed, setCollapsed } = useSidebarState();
  const { density } = useDensityPreference();
  const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false);
  const [activeQuickCreateIndex, setActiveQuickCreateIndex] = useState(0);
  const [isShortcutModalOpen, setIsShortcutModalOpen] = useState(false);
  const [quickViewSnapshot, setQuickViewSnapshot] = useState<QuickViewSnapshot | null>(
    null
  );
  const [quickViewError, setQuickViewError] = useState<string | null>(null);
  const broadcastGlobalPopoverClose = useCallback(() => {
    window.dispatchEvent(new CustomEvent("app:close-popovers"));
  }, []);
  const [headerLogoSourceIndex, setHeaderLogoSourceIndex] = useState(0);
  const [headerLogoLoaded, setHeaderLogoLoaded] = useState(false);
  const notificationPanelRef = useRef<HTMLDivElement | null>(null);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const sidebarRef = useRef<HTMLElement | null>(null);
  const sidebarToggleRef = useRef<HTMLButtonElement | null>(null);
  const sidebarNavScrollRef = useRef<HTMLDivElement | null>(null);
  const quickCreateItemRefs = useRef<Array<HTMLAnchorElement | null>>([]);
  const permissionContract = useMemo(
    () => createUiPermissionContract(hasPermission),
    [hasPermission]
  );
  const canCreateBlogs = permissionContract.canCreateBlog;
  const userRoles = getUserRoles(profile);
  const isAdmin = userRoles.includes("admin");
  const canManagePermissions = isAdmin;
  const canManageSocialPosts =
    permissionContract.canViewDashboard || permissionContract.canOverrideWorkflow;
  const profileDisplayName = profile?.display_name || profile?.full_name || "Account";
  const profileInitials = profileDisplayName
    .split(" ")
    .filter((segment) => segment.length > 0)
    .slice(0, 2)
    .map((segment) => segment[0]?.toUpperCase() ?? "")
    .join("");
  const activeHeaderLogo = APP_SHELL_LOGO_SEQUENCE[headerLogoSourceIndex] ?? null;
  const headerMenuTriggerClass =
    "inline-flex min-h-9 items-center justify-center rounded-md px-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-inset";
  const headerMenuItemClass =
    "flex w-full items-center rounded-md px-2 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-inset";
  const closeOpenDetailsMenus = useCallback(
    (excludeDetails: HTMLDetailsElement | null = null) => {
      document.querySelectorAll<HTMLDetailsElement>("details[open]").forEach((menu) => {
        if (!excludeDetails) {
          menu.open = false;
          return;
        }
        if (
          menu === excludeDetails ||
          menu.contains(excludeDetails) ||
          excludeDetails.contains(menu)
        ) {
          return;
        }
        menu.open = false;
      });
    },
    []
  );
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
        broadcastGlobalPopoverClose();
        closeOpenDetailsMenus();
        if (isNotificationPanelOpen || isProfileMenuOpen) {
          event.preventDefault();
          setIsNotificationPanelOpen(false);
          setIsProfileMenuOpen(false);
          return;
        }
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
    isNotificationPanelOpen,
    isProfileMenuOpen,
    isShortcutModalOpen,
    pathname,
    quickCreateItems,
    router,
    broadcastGlobalPopoverClose,
    closeOpenDetailsMenus,
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
    const handleOutsideClick = (event: MouseEvent) => {
      const targetNode = event.target as Node;
      const targetElement = targetNode instanceof Element ? targetNode : null;
      const activeDetails = targetElement?.closest("details") ?? null;
      closeOpenDetailsMenus(activeDetails);
      if (
        isNotificationPanelOpen &&
        !notificationPanelRef.current?.contains(targetNode)
      ) {
        setIsNotificationPanelOpen(false);
      }
      if (isProfileMenuOpen && !profileMenuRef.current?.contains(targetNode)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [
    closeOpenDetailsMenus,
    isNotificationPanelOpen,
    isProfileMenuOpen,
  ]);

  useEffect(() => {
    const handleDetailsToggle = (event: Event) => {
      const target = event.target;
      if (!(target instanceof HTMLDetailsElement)) {
        return;
      }
      if (!target.open) {
        return;
      }
      broadcastGlobalPopoverClose();
      closeOpenDetailsMenus(target);
      setIsNotificationPanelOpen(false);
      setIsProfileMenuOpen(false);
    };
    document.addEventListener("toggle", handleDetailsToggle, true);
    return () => {
      document.removeEventListener("toggle", handleDetailsToggle, true);
    };
  }, [broadcastGlobalPopoverClose, closeOpenDetailsMenus]);

  useEffect(() => {
    const handleCustomDropdownOpened = () => {
      closeOpenDetailsMenus();
      setIsNotificationPanelOpen(false);
      setIsProfileMenuOpen(false);
    };
    window.addEventListener(
      "app:dropdown-opened",
      handleCustomDropdownOpened as EventListener
    );
    return () => {
      window.removeEventListener(
        "app:dropdown-opened",
        handleCustomDropdownOpened as EventListener
      );
    };
  }, [closeOpenDetailsMenus]);

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
  const unreadNotificationItems = useMemo(
    () => notifications.filter((notification) => !notification.read).slice(0, 5),
    [notifications]
  );
  const groupedUnreadNotifications = useMemo(
    () => groupNotifications(unreadNotificationItems),
    [unreadNotificationItems]
  );

  return (
    <div className="min-h-screen bg-slate-50" data-density={density}>
      <header className="border-b border-slate-200 bg-[#fcfcfe]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-3">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-md px-1 py-1 hover:bg-slate-50"
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

          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Search and commands"
              className={cn(
                "inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 transition hover:border-slate-300 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              )}
              onClick={() => {
                window.dispatchEvent(new CustomEvent("command-palette:open"));
              }}
            >
              <AppIcon name="search" boxClassName="h-4 w-4" size={12} />
              <span className="hidden sm:inline">Search</span>
              <KbdShortcut>⌘K</KbdShortcut>
            </button>
            <div className="relative" ref={notificationPanelRef}>
              <button
                type="button"
                className={cn(headerMenuTriggerClass, "relative px-1.5")}
                aria-label="Notifications"
                aria-haspopup="menu"
                aria-expanded={isNotificationPanelOpen}
                aria-controls="header-notifications-menu"
                onClick={() => {
                  broadcastGlobalPopoverClose();
                  closeOpenDetailsMenus();
                  setIsProfileMenuOpen(false);
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
                <div
                  id="header-notifications-menu"
                  className="absolute right-0 z-40 mt-2 w-[320px] rounded-lg border border-slate-200 bg-white p-3 shadow-lg"
                  role="menu"
                  aria-label="Notifications menu"
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-slate-900">Assignment & Changes</h3>
                    <button
                      type="button"
                      onClick={() => {
                        setIsNotificationPanelOpen(false);
                        router.push("/updates");
                      }}
                      className="text-xs font-medium text-slate-600 transition hover:text-slate-900"
                    >
                      Open inbox
                    </button>
                  </div>
                  {unreadNotificationItems.length === 0 ? (
                    <p className="mt-3 rounded-md border border-slate-200 bg-slate-50 px-2 py-2 text-xs text-slate-500">
                      No unread assignments or changes.
                    </p>
                  ) : (
                    <ul className="mt-2 max-h-[340px] space-y-1 overflow-y-auto">
                      {groupedUnreadNotifications.map((entry) =>
                        entry.kind === "group" ? (
                          <li key={entry.id}>
                            <button
                              type="button"
                              className="w-full rounded-md border border-slate-200 bg-slate-50 px-2 py-2 text-left transition hover:bg-white"
                              onClick={() => {
                                entry.items.forEach((item) => markAsRead(item.id));
                                setIsNotificationPanelOpen(false);
                                router.push("/inbox");
                              }}
                            >
                              <div className="flex items-start gap-2">
                                <span className="mt-0.5 inline-flex shrink-0">
                                  <AppIcon
                                    name="bell"
                                    boxClassName="h-4 w-4"
                                    size={14}
                                    className="text-slate-600"
                                  />
                                </span>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-semibold text-slate-900">
                                    {entry.title}
                                  </p>
                                  <p className="mt-0.5 text-xs text-slate-600">
                                    {entry.message}
                                  </p>
                                  <p className="mt-1 text-xs text-slate-500">
                                    {formatNotificationAge(entry.createdAt)}
                                  </p>
                                </div>
                                <AppIcon
                                  name="chevronDown"
                                  boxClassName="h-3.5 w-3.5 mt-1"
                                  size={12}
                                  className="text-slate-400"
                                />
                              </div>
                            </button>
                          </li>
                        ) : (
                          <li key={entry.id}>
                            <button
                              type="button"
                              className="w-full rounded-md border border-slate-200 bg-white px-2 py-2 text-left transition hover:bg-slate-50"
                              onClick={() => {
                                markAsRead(entry.id);
                                setIsNotificationPanelOpen(false);
                                if (entry.href) {
                                  router.push(entry.href);
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
                                  <p className="truncate text-sm font-medium text-slate-900">
                                    {entry.title}
                                  </p>
                                  <p className="mt-0.5 line-clamp-2 text-sm text-slate-700">
                                    {entry.message}
                                  </p>
                                  <p className="mt-1 text-xs text-slate-500">
                                    {formatNotificationAge(entry.createdAt)}
                                  </p>
                                </div>
                              </div>
                            </button>
                          </li>
                        )
                      )}
                    </ul>
                  )}
                </div>
              ) : null}
            </div>
            <div className="relative" ref={profileMenuRef}>
              <button
                type="button"
                className={cn(headerMenuTriggerClass, "gap-2")}
                aria-label="Profile menu"
                aria-haspopup="menu"
                aria-expanded={isProfileMenuOpen}
                aria-controls="header-profile-menu"
                onClick={() => {
                  broadcastGlobalPopoverClose();
                  closeOpenDetailsMenus();
                  setIsNotificationPanelOpen(false);
                  setIsProfileMenuOpen((previous) => !previous);
                }}
              >
                <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-700">
                  {profileInitials || "U"}
                </span>
                <span className="max-w-[160px] truncate">{profileDisplayName}</span>
                <AppIcon
                  name="chevronRight"
                  boxClassName="h-4 w-4"
                  size={12}
                  className={cn(
                    "text-slate-500 transition-transform",
                    isProfileMenuOpen ? "rotate-90" : null
                  )}
                />
              </button>
              {isProfileMenuOpen ? (
                <div
                  id="header-profile-menu"
                  className="absolute right-0 z-40 mt-2 w-52 rounded-lg border border-slate-200 bg-white p-2 shadow-lg"
                  role="menu"
                  aria-label="Profile menu"
                >
                  <button
                    type="button"
                    className={headerMenuItemClass}
                    role="menuitem"
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      setIsShortcutModalOpen(true);
                    }}
                  >
                    Shortcuts
                  </button>
                  <Link
                    href="/resources"
                    className={headerMenuItemClass}
                    role="menuitem"
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                    }}
                  >
                    User Manual
                  </Link>
                  <Link
                    href="/settings"
                    className={headerMenuItemClass}
                    role="menuitem"
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                    }}
                  >
                    Settings
                  </Link>
                  <button
                    type="button"
                    className={headerMenuItemClass}
                    role="menuitem"
                    onClick={async () => {
                      setIsProfileMenuOpen(false);
                      clearQuickViewSnapshot();
                      setQuickViewSnapshot(null);
                      await signOut();
                      router.replace("/login");
                    }}
                  >
                    Sign out
                  </button>
                </div>
              ) : null}
            </div>
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
                <span className="px-1 text-xs font-medium text-slate-500">Menu</span>
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
            <main className="min-w-0">
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
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                className="text-xs font-medium text-slate-700 underline-offset-2 hover:underline"
                onClick={() => {
                  setIsQuickCreateOpen(false);
                  setIsShortcutModalOpen(true);
                }}
              >
                Shortcut
              </button>
            </div>
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
                      Opens Quick Create. Use Up/Down arrow keys and Enter to select.
                    </p>
                  </div>
                </div>
              </div>
              <div className="rounded-md border border-amber-200 bg-amber-50 p-2 text-[10px] text-amber-800">
                <p className="font-medium">Tip: Press Q, then Up/Down arrow keys to navigate, Enter to select action</p>
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
      <OnboardingTour />
    </div>
  );
}

