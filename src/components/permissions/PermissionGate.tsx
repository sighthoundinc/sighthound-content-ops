"use client";

import type { ReactNode } from "react";

import { isPermissionDebugModeEnabled } from "@/lib/permissions/uiPermissions";
import type { CanonicalAppPermissionKey } from "@/lib/types";
import { cn } from "@/lib/utils";

type PermissionGateMode = "hide" | "disable";

type PermissionGateProps = {
  can: boolean;
  children: ReactNode;
  mode?: PermissionGateMode;
  className?: string;
  reason?: string;
  requiredPermission?: CanonicalAppPermissionKey;
};

const DEFAULT_REASON = "You do not have permission to perform this action.";

export function PermissionGate({
  can,
  children,
  mode = "disable",
  className,
  reason = DEFAULT_REASON,
  requiredPermission,
}: PermissionGateProps) {
  if (can) {
    return <>{children}</>;
  }

  if (mode === "hide") {
    return null;
  }

  const debugSuffix =
    requiredPermission && isPermissionDebugModeEnabled()
      ? ` Required permission: ${requiredPermission}`
      : "";
  const tooltipText = `${reason}${debugSuffix}`;

  return (
    <span
      className={cn("inline-flex cursor-not-allowed", className)}
      title={tooltipText}
      aria-disabled={true}
      data-required-permission={requiredPermission}
    >
      <span className="pointer-events-none inline-flex opacity-60">{children}</span>
    </span>
  );
}
