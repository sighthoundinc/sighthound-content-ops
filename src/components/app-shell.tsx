"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard" },
  { href: "/tasks", label: "My Tasks" },
  { href: "/calendar", label: "Calendar" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50">
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
            <div className="text-right text-sm">
              <p className="font-medium text-slate-900">{profile?.full_name}</p>
              <p className="text-slate-500">{profile?.role}</p>
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
            {profile?.role === "admin" ? (
              <>
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
              </>
            ) : null}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white p-5">
          {children}
        </main>
      </div>
    </div>
  );
}
