"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { hasRole } from "@/lib/roles";

import { useAuth } from "@/providers/auth-provider";
import type { AppPermissionKey, AppRole } from "@/lib/types";

export function ProtectedPage({
  children,
  allowedRoles,
  requiredPermissions,
}: {
  children: React.ReactNode;
  allowedRoles?: AppRole[];
  requiredPermissions?: AppPermissionKey[];
}) {
  const router = useRouter();
  const { hasPermission, loading, session, profile } = useAuth();
  const hasRequiredPermissions =
    !requiredPermissions?.length ||
    requiredPermissions.every((permissionKey) => hasPermission(permissionKey));

  useEffect(() => {
    if (!loading && !session) {
      router.replace("/login");
      return;
    }

    if (
      !loading &&
      allowedRoles?.length &&
      profile &&
      !allowedRoles.some((role) => hasRole(profile, role))
    ) {
      router.replace("/dashboard");
      return;
    }

    if (!loading && session && !hasRequiredPermissions) {
      router.replace("/dashboard");
    }
  }, [allowedRoles, hasRequiredPermissions, loading, profile, router, session]);

  if (loading || !session) {
    // Shell-shaped skeleton: the page keeps its frame while the session
    // resolves, instead of flashing a bare "Loading…" line.
    return (
      <div
        role="status"
        aria-label="Loading"
        className="min-h-screen bg-[color:var(--sh-gray)]"
      >
        <div className="flex items-center justify-between border-b border-[color:var(--sh-gray-200)] bg-surface px-5 py-3">
          <div className="skeleton h-9 w-40" />
          <div className="skeleton h-8 w-28" />
        </div>
        <div className="flex">
          <div className="hidden w-[240px] shrink-0 space-y-2 border-r border-[color:var(--sh-gray-200)] bg-white p-3 md:block md:min-h-[calc(100vh-61px)]">
            {Array.from({ length: 7 }).map((_, index) => (
              <div key={`nav-skeleton-${index}`} className="skeleton h-9 w-full" />
            ))}
          </div>
          <div className="min-w-0 flex-1 space-y-4 px-4 py-5 sm:px-6 sm:py-6">
            <div className="skeleton h-7 w-48" />
            <div className="skeleton h-4 w-full max-w-md" />
            <div className="skeleton h-24 w-full" />
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={`row-skeleton-${index}`} className="skeleton h-12 w-full" />
              ))}
            </div>
          </div>
        </div>
        <span className="sr-only">Loading…</span>
      </div>
    );
  }

  if (
    (allowedRoles?.length &&
      profile &&
      !allowedRoles.some((role) => hasRole(profile, role))) ||
    !hasRequiredPermissions
  ) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-navy-500">
        You do not have permission to view this page.
      </div>
    );
  }

  return <>{children}</>;
}

