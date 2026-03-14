"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { getUserRoles } from "@/lib/roles";

import {
  CommandPalette,
  type CommandPaletteCommand,
} from "@/components/command-palette";
import { hasWorkflowOverridePermission } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";

const WORK_NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/tasks", label: "My Tasks" },
  { href: "/calendar", label: "Calendar" },
];

const CONTENT_NAV_ITEMS = [
  { href: "/blogs", label: "Blogs" },
  { href: "/ideas", label: "Ideas" },
  { href: "/social-posts", label: "Social Posts" },
];
const NAV_ITEMS = [...WORK_NAV_ITEMS, ...CONTENT_NAV_ITEMS];

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
  const { hasPermission, profile, signOut } = useAuth();
  const canCreateBlogs = hasPermission("create_blog");
  const userRoles = getUserRoles(profile);
  const isAdmin = userRoles.includes("admin");
  const canManagePermissions = isAdmin;
  const canManageSocialPosts =
    hasPermission("view_dashboard") || hasWorkflowOverridePermission(hasPermission);

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

    if (canManageSocialPosts) {
      navigationCommands.push({
        id: "nav-add-social-post",
        label: "Create new social post",
        group: "Create",
        keywords: ["social", "post", "new", "create", "add"],
        action: () => {
          router.push("/social-posts");
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
  const activeRoleLabel = profile?.role
    ? profile.role.charAt(0).toUpperCase() + profile.role.slice(1)
    : "Unknown";

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) {
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

      if (event.key.toLowerCase() === "c" && pathname !== "/calendar") {
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
  }, [canCreateBlogs, pathname, router]);

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
            <p className="hidden rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-500 md:block">
              ⌘K / Ctrl+K
            </p>
            <div className="text-right text-sm">
              <p className="font-medium text-slate-900">
                {profile?.display_name || profile?.full_name}
              </p>
              <p className="text-slate-500">Active role: {activeRoleLabel}</p>
            </div>
            <button
              type="button"
              className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              onClick={async () => {
                await signOut();
                router.replace("/login");
              }}
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

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
    </div>
  );
}

