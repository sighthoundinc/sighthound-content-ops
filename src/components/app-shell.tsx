"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { getUserRoles } from "@/lib/roles";

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

const ENTRY_POINT_NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/tasks", label: "My Tasks" },
];

const CONTENT_WORKFLOW_NAV_ITEMS = [
  { href: "/ideas", label: "Ideas" },
  { href: "/blogs", label: "Blogs" },
  { href: "/social-posts", label: "Social Posts" },
];

const SECONDARY_NAV_ITEMS = [
  { href: "/calendar", label: "Calendar" },
  { href: "/blogs/cardboard", label: "CardBoard" },
];

const SUPPORTING_TOOLS_NAV_ITEMS = [
  { href: "/resources", label: "User Guide" },
];
type ShortcutDefinition = {
  id: string;
  label: string;
  keys: string[];
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
    markNotificationAsRead,
    clearNotifications,
  } = useSystemFeedback();
  const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false);
  const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false);
  const [isShortcutModalOpen, setIsShortcutModalOpen] = useState(false);
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
        keys: ["C"],
      });
    }
    return shortcuts;
  }, [canCreateBlogs, canManageSocialPosts]);
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
      return "User Guide";
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
        keys: ["N"],
      });
    }
    return shortcuts;
  }, [canCreateBlogs, pathname]);
  const isQuickViewActive = Boolean(
    quickViewSnapshot &&
      user?.id &&
      quickViewSnapshot.adminUserId &&
      user.id !== quickViewSnapshot.adminUserId
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
    isShortcutModalOpen,
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
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 rounded-md px-1 py-1 hover:bg-slate-50"
            aria-label="Sighthound Content Ops"
          >
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white p-1">
              <Image
                src="/sighthound-badge-mark.svg"
                alt="Sighthound badge mark"
                width={28}
                height={28}
                className="h-7 w-7 object-contain"
              />
            </span>
            <span className="leading-tight">
              <span className="block text-sm font-semibold text-slate-900">Sighthound</span>
              <span className="block text-xs text-slate-600">Content Ops</span>
            </span>
          </Link>

          <div className="flex items-center gap-4">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={() => {
                setIsShortcutModalOpen(true);
              }}
            >
              Shortcuts
            </Button>
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
            <div className="space-y-1">
              {ENTRY_POINT_NAV_ITEMS.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={`${item.href}-${item.label}`}
                    href={item.href}
                    className={cn(
                      "group flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition",
                      isActive
                        ? "bg-slate-100 text-slate-900 font-medium"
                        : "text-slate-700 hover:bg-slate-50"
                    )}
                  >
                    <span
                      className={cn(
                        "inline-block h-2 w-2 rounded-full",
                        isActive ? "bg-slate-900" : "bg-slate-300 group-hover:bg-slate-500"
                      )}
                    />
                    {item.label}
                  </Link>
                );
              })}
            </div>
            <div className="space-y-1">
              <div className="my-2 border-t border-slate-200/70" />
              {CONTENT_WORKFLOW_NAV_ITEMS.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={`${item.href}-${item.label}`}
                    href={item.href}
                    className={cn(
                      "group flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition",
                      isActive
                        ? "bg-slate-100 text-slate-900 font-medium"
                        : "text-slate-700 hover:bg-slate-50"
                    )}
                  >
                    <span
                      className={cn(
                        "inline-block h-2 w-2 rounded-full",
                        isActive ? "bg-slate-900" : "bg-slate-300 group-hover:bg-slate-500"
                      )}
                    />
                    {item.label}
                  </Link>
                );
              })}
            </div>
            <div className="space-y-1">
              <div className="my-2 border-t border-slate-200/70" />
              {SECONDARY_NAV_ITEMS.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={`${item.href}-${item.label}`}
                    href={item.href}
                    className={cn(
                      "group flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition",
                      isActive
                        ? "bg-slate-100 text-slate-900 font-medium"
                        : "text-slate-700 hover:bg-slate-50"
                    )}
                  >
                    <span
                      className={cn(
                        "inline-block h-2 w-2 rounded-full",
                        isActive ? "bg-slate-900" : "bg-slate-300 group-hover:bg-slate-500"
                      )}
                    />
                    {item.label}
                  </Link>
                );
              })}
            </div>
            <div className="space-y-1">
              <div className="my-2 border-t border-slate-200/70" />
              {SUPPORTING_TOOLS_NAV_ITEMS.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={`${item.href}-${item.label}`}
                    href={item.href}
                    className={cn(
                      "group flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition",
                      isActive
                        ? "bg-slate-100 text-slate-900 font-medium"
                        : "text-slate-700 hover:bg-slate-50"
                    )}
                  >
                    <span
                      className={cn(
                        "inline-block h-2 w-2 rounded-full",
                        isActive ? "bg-slate-900" : "bg-slate-300 group-hover:bg-slate-500"
                      )}
                    />
                    {item.label}
                  </Link>
                );
              })}
              <div className="my-2 border-t border-slate-200/70" />
              <Link
                href="/settings"
                className={cn(
                  "group flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition",
                  pathname === "/settings"
                    ? "bg-slate-100 text-slate-900 font-medium"
                    : "text-slate-700 hover:bg-slate-50"
                )}
              >
                <span
                  className={cn(
                    "inline-block h-2 w-2 rounded-full",
                    pathname === "/settings"
                      ? "bg-slate-900"
                      : "bg-slate-300 group-hover:bg-slate-500"
                  )}
                />
                Settings
              </Link>
              {canManagePermissions ? (
                <Link
                  href="/settings/permissions"
                  className={cn(
                    "group flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition",
                    pathname === "/settings/permissions"
                      ? "bg-slate-100 text-slate-900 font-medium"
                      : "text-slate-700 hover:bg-slate-50"
                  )}
                >
                  <span
                    className={cn(
                      "inline-block h-2 w-2 rounded-full",
                      pathname === "/settings/permissions"
                        ? "bg-slate-900"
                        : "bg-slate-300 group-hover:bg-slate-500"
                    )}
                  />
                  Permissions
                </Link>
              ) : null}
            </div>
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
              {canCreateBlogs ? (
                <Link
                  href="/ideas"
                  className="pressable rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
                  onClick={() => {
                    setIsQuickCreateOpen(false);
                  }}
                >
                  New Idea
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
            <div className="mt-4 space-y-3 text-xs text-slate-700">
              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Global shortcuts
                </p>
                <div className="space-y-2">
                  {globalShortcuts.map((shortcut) => (
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

