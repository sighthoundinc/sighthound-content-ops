"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { getUserRoles } from "@/lib/roles";

import {
  CommandPalette,
  type CommandPaletteCommand,
} from "@/components/command-palette";
import { Button } from "@/components/button";
import { KbdShortcut } from "@/components/kbd-shortcut";
import { createUiPermissionContract } from "@/lib/permissions/uiPermissions";
import {
  clearQuickViewSnapshot,
  readQuickViewSnapshot,
  type QuickViewSnapshot,
} from "@/lib/quick-view";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import { useSystemFeedback } from "@/providers/system-feedback-provider";

const WORK_NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/tasks", label: "My Tasks" },
  { href: "/calendar", label: "Calendar" },
];

const CONTENT_NAV_ITEMS = [
  { href: "/blogs", label: "Blogs" },
  { href: "/blogs/cardboard", label: "CardBoard" },
  { href: "/ideas", label: "Ideas" },
  { href: "/social-posts", label: "Social Posts" },
  { href: "/resources", label: "Resources" },
];
const NAV_ITEMS = [...WORK_NAV_ITEMS, ...CONTENT_NAV_ITEMS];

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
  commandPaletteCommands = [],
  sidebarContent = null,
}: {
  children: React.ReactNode;
  commandPaletteCommands?: CommandPaletteCommand[];
  sidebarContent?: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { hasPermission, profile, signOut, user } = useAuth();
  const {
    notifications,
    unreadCount,
    markNotificationAsRead,
    clearNotifications,
  } = useSystemFeedback();
  const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false);
  const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false);
  const [quickViewSnapshot, setQuickViewSnapshot] = useState<QuickViewSnapshot | null>(
    null
  );
  const [quickViewError, setQuickViewError] = useState<string | null>(null);
  const notificationPanelRef = useRef<HTMLDivElement | null>(null);
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
  const isQuickViewActive = Boolean(
    quickViewSnapshot &&
      user?.id &&
      quickViewSnapshot.adminUserId &&
      user.id !== quickViewSnapshot.adminUserId
  );

  const builtInCommandPaletteCommands = useMemo(() => {
    const navigationCommands: CommandPaletteCommand[] = NAV_ITEMS.map((item) => ({
      id: `nav-${item.href}`,
      label: `Go to ${item.label}`,
      group: "Navigation",
      keywords: [item.href, item.label.toLowerCase(), "navigate"],
      action: () => {
        router.push(item.href);
      },
    }));

    navigationCommands.push({
      id: "nav-settings",
      label: "Go to settings",
      group: "Navigation",
      keywords: ["settings", "preferences", "configuration"],
      action: () => {
        router.push("/settings");
      },
    });

    if (canManagePermissions) {
      navigationCommands.push({
        id: "nav-permissions",
        label: "Go to permissions",
        group: "Navigation",
        keywords: ["permissions", "roles", "access"],
        action: () => {
          router.push("/settings/permissions");
        },
      });
    }

    if (canCreateBlogs || canManageSocialPosts) {
      navigationCommands.push({
        id: "open-quick-create",
        label: "Open quick create",
        group: "Create",
        keywords: ["quick", "create", "new", "content", "c"],
        action: () => {
          setIsQuickCreateOpen(true);
        },
      });
    }

    if (canManageSocialPosts) {
      navigationCommands.push({
        id: "nav-add-social-post",
        label: "Create new social post",
        group: "Create",
        keywords: ["social", "post", "new", "create", "add"],
        action: () => {
          router.push("/social-posts?create=1");
        },
      });
    }

    if (canCreateBlogs) {
      navigationCommands.push({
        id: "nav-add-blog",
        label: "Create new blog",
        group: "Create",
        keywords: ["blog", "new", "create", "add"],
        action: () => {
          router.push("/blogs/new");
        },
      });
    }

    return navigationCommands;
  }, [canCreateBlogs, canManagePermissions, canManageSocialPosts, router]);

  const allCommandPaletteCommands = useMemo(
    () => [...builtInCommandPaletteCommands, ...commandPaletteCommands],
    [builtInCommandPaletteCommands, commandPaletteCommands]
  );

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }
      if (event.key === "Escape" && isQuickCreateOpen) {
        event.preventDefault();
        setIsQuickCreateOpen(false);
        return;
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

      if (event.key.toLowerCase() === "d" && pathname !== "/dashboard") {
        event.preventDefault();
        router.push("/dashboard");
        return;
      }

      if (event.key.toLowerCase() === "c" && (canCreateBlogs || canManageSocialPosts)) {
        event.preventDefault();
        setIsQuickCreateOpen(true);
        return;
      }

      if (event.key.toLowerCase() === "g" && pathname !== "/calendar") {
        event.preventDefault();
        router.push("/calendar");
        return;
      }

      if (event.key.toLowerCase() === "n" && canCreateBlogs) {
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
    isQuickCreateOpen,
    pathname,
    router,
  ]);

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

  return (
    <div className="min-h-screen bg-slate-50">
      <CommandPalette commands={allCommandPaletteCommands} />
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Sighthound Internal
            </p>
            <h1 className="text-lg font-semibold text-slate-900">
              Content Operations Dashboard
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 md:block">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Shortcuts
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-600">
                <KbdShortcut>⌘K</KbdShortcut>
                <KbdShortcut>Ctrl+K</KbdShortcut>
                <KbdShortcut>/</KbdShortcut>
                {canCreateBlogs ? <KbdShortcut>N</KbdShortcut> : null}
                <KbdShortcut>D</KbdShortcut>
                <KbdShortcut>C</KbdShortcut>
                <KbdShortcut>G</KbdShortcut>
              </div>
            </div>
            {canCreateBlogs || canManageSocialPosts ? (
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={() => {
                  setIsQuickCreateOpen(true);
                }}
              >
                Quick Create
              </Button>
            ) : null}
            <div className="relative" ref={notificationPanelRef}>
              <Button
                type="button"
                aria-label="Notifications"
                variant="secondary"
                size="md"
                className="relative"
                onClick={() => {
                  setIsNotificationPanelOpen((previous) => !previous);
                }}
              >
                🔔
                {unreadCount > 0 ? (
                  <span className="absolute -right-1 -top-1 inline-flex min-w-[18px] items-center justify-center rounded-full bg-rose-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                    {unreadCount}
                  </span>
                ) : null}
              </Button>
              {isNotificationPanelOpen ? (
                <div className="absolute right-0 z-40 mt-2 w-[360px] rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-slate-900">Notifications</h3>
                    <Button
                      type="button"
                      variant="secondary"
                      size="xs"
                      onClick={() => {
                        clearNotifications();
                      }}
                    >
                      Mark all as read
                    </Button>
                  </div>
                  {notifications.length === 0 ? (
                    <p className="mt-3 rounded-md border border-slate-200 bg-slate-50 px-2 py-2 text-xs text-slate-500">
                      No notifications.
                    </p>
                  ) : (
                    <ul className="mt-2 space-y-1">
                      {notifications.map((notification) => (
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
                              markNotificationAsRead(notification.id);
                              setIsNotificationPanelOpen(false);
                              if (notification.href) {
                                router.push(notification.href);
                              }
                            }}
                          >
                            <p className="text-sm text-slate-800">
                              <span className="mr-2">{notification.icon}</span>
                              {notification.message}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {formatNotificationAge(notification.createdAt)}
                            </p>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : null}
            </div>
            <div className="text-right text-sm">
              <p className="font-medium text-slate-900">
                {profile?.display_name || profile?.full_name}
              </p>
            </div>
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

      <div className="mx-auto flex w-full max-w-7xl gap-6 px-6 py-6">
        <aside className="w-full max-w-56 shrink-0 rounded-lg border border-slate-200 bg-white p-3">
          <nav className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href;

              return (
                <Link
                  key={`${item.href}-${item.label}`}
                  href={item.href}
                  className={cn(
                    "group flex items-center gap-2 rounded-md border-l-2 px-3 py-2 text-sm font-medium transition",
                    isActive
                      ? "border-l-slate-900 bg-slate-900 text-white font-semibold"
                      : "border-l-transparent text-slate-700 hover:bg-slate-100"
                  )}
                >
                  <span
                    className={cn(
                      "inline-block h-2 w-2 rounded-full",
                      isActive ? "bg-white" : "bg-slate-300 group-hover:bg-slate-500"
                    )}
                  />
                  {item.label}
                </Link>
              );
            })}
            <div className="my-3 border-t border-slate-200/70" />
            <Link
              href="/settings"
              className={cn(
                "group flex items-center gap-2 rounded-md border-l-2 px-3 py-2 text-sm font-medium transition",
                pathname === "/settings"
                  ? "border-l-slate-900 bg-slate-900 text-white font-semibold"
                  : "border-l-transparent text-slate-700 hover:bg-slate-100"
              )}
            >
              <span
                className={cn(
                  "inline-block h-2 w-2 rounded-full",
                  pathname === "/settings"
                    ? "bg-white"
                    : "bg-slate-300 group-hover:bg-slate-500"
                )}
              />
              Settings
            </Link>
            {canManagePermissions ? (
              <Link
                href="/settings/permissions"
                className={cn(
                  "group flex items-center gap-2 rounded-md border-l-2 px-3 py-2 text-sm font-medium transition",
                  pathname === "/settings/permissions"
                    ? "border-l-slate-900 bg-slate-900 text-white font-semibold"
                    : "border-l-transparent text-slate-700 hover:bg-slate-100"
                )}
              >
                <span
                  className={cn(
                    "inline-block h-2 w-2 rounded-full",
                    pathname === "/settings/permissions"
                      ? "bg-white"
                      : "bg-slate-300 group-hover:bg-slate-500"
                  )}
                />
                Permissions
              </Link>
            ) : null}
          </nav>
          {sidebarContent ? (
            <div className="mt-4 border-t border-slate-200 pt-3">{sidebarContent}</div>
          ) : null}
        </aside>

        <main className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white p-5">
          {children}
        </main>
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
              {canCreateBlogs ? (
                <Link
                  href="/blogs/new"
                  className="pressable rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
                  onClick={() => {
                    setIsQuickCreateOpen(false);
                  }}
                >
                  New Blog
                </Link>
              ) : null}
              {canManageSocialPosts ? (
                <Link
                  href="/social-posts?create=1"
                  className="pressable rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
                  onClick={() => {
                    setIsQuickCreateOpen(false);
                  }}
                >
                  New Social Post
                </Link>
              ) : null}
            </div>
            <p className="mt-4 text-xs text-slate-500">
              Shortcut: press <KbdShortcut>C</KbdShortcut> outside form fields.
            </p>
          </section>
        </div>
      ) : null}
    </div>
  );
}

