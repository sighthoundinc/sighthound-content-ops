"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/providers/auth-provider";
import type { AppRole } from "@/lib/types";

export function ProtectedPage({
  children,
  allowedRoles,
}: {
  children: React.ReactNode;
  allowedRoles?: AppRole[];
}) {
  const router = useRouter();
  const { loading, session, profile } = useAuth();

  useEffect(() => {
    if (!loading && !session) {
      router.replace("/login");
      return;
    }

    if (!loading && allowedRoles?.length && profile && !allowedRoles.includes(profile.role)) {
      router.replace("/dashboard");
    }
  }, [allowedRoles, loading, profile, router, session]);

  if (loading || !session) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-slate-500">
        Loading…
      </div>
    );
  }

  if (allowedRoles?.length && profile && !allowedRoles.includes(profile.role)) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-slate-500">
        You do not have permission to view this page.
      </div>
    );
  }

  return <>{children}</>;
}
