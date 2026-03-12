"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo } from "react";
import { getUserRoles, hasRole } from "@/lib/roles";

import {
  CommandPalette,
  type CommandPaletteCommand,
} from "@/components/command-palette";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/tasks", label: "My Tasks" },
  { href: "/calendar", label: "Calendar" },
];

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
  const { profile, signOut } = useAuth();

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

    if (profile?.role === "admin") {
      navigationCommands.push(
        {
          id: "nav-add-blog",
          label: "Create new blog",
          group: "Create",
          keywords: ["blog", "new", "create", "add"],
          action: () => {
            router.push("/blogs/new");
          },
        },
        {
          id: "nav-settings",
          label: "Go to settings",
          group: "Navigation",
          keywords: ["settings", "preferences", "configuration"],
          action: () => {
            router.push("/settings");
          },
        }
      );
    }

    return navigationCommands;
  }, [profile?.role, router]);

  const allCommandPaletteCommands = useMemo(
    () => [...builtInCommandPaletteCommands, ...commandPaletteCommands],
    [builtInCommandPaletteCommands, commandPaletteCommands]
  );
  const rolesLabel = getUserRoles(profile).join(", ");

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
              <p className="text-slate-500">{rolesLabel || profile?.role}</p>
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
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "block rounded-md px-3 py-2 text-sm font-medium",
                  pathname === item.href
                    ? "bg-slate-900 text-white"
                    : "text-slate-700 hover:bg-slate-100"
                )}
              >
                {item.label}
              </Link>
            ))}
            {hasRole(profile, "admin") ? (
              <Link
                href="/blogs/new"
                className={cn(
                  "block rounded-md px-3 py-2 text-sm font-medium",
                  pathname === "/blogs/new"
                    ? "bg-slate-900 text-white"
                    : "text-slate-700 hover:bg-slate-100"
                )}
              >
                Add Blog
              </Link>
            ) : null}
            <Link
              href="/settings"
              className={cn(
                "block rounded-md px-3 py-2 text-sm font-medium",
                pathname === "/settings"
                  ? "bg-slate-900 text-white"
                  : "text-slate-700 hover:bg-slate-100"
              )}
            >
              Settings
            </Link>
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
