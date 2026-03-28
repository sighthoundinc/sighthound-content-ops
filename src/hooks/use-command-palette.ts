import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { usePathname } from "next/navigation";
import { searchCommands, groupCommandsByCategory } from "@/lib/command-palette-search";
import { allCommands } from "@/lib/command-palette-config";
import type { Command } from "@/lib/command-palette-config";
import { createUiPermissionContract } from "@/lib/permissions/uiPermissions";
import { getUserRoles } from "@/lib/roles";
import { useAuth } from "@/providers/auth-provider";
import { useAlerts } from "@/providers/alerts-provider";

export interface UseCommandPaletteReturn {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  results: Command[];
  groupedResults: Record<string, Command[]>;
  selectedIndex: number;
  selectResult: (index: number) => void;
  executeSelected: () => void;
  handleKeyDown: (e: React.KeyboardEvent) => void;
}

export function useCommandPalette(): UseCommandPaletteReturn {
  const pathname = usePathname();
  const { hasPermission, profile } = useAuth();
  const { showError } = useAlerts();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const resultsRef = useRef<Command[]>([]);
  const permissionContract = useMemo(
    () => createUiPermissionContract(hasPermission),
    [hasPermission]
  );
  const isAdmin = useMemo(
    () => (profile ? getUserRoles(profile).includes("admin") : false),
    [profile]
  );
  const canManageSocialPosts =
    permissionContract.canViewDashboard || permissionContract.canOverrideWorkflow;
  const isActionCommandContext =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/blogs") ||
    pathname.startsWith("/tasks");

  const isCommandAllowed = useCallback(
    (command: Command) => {
      switch (command.id) {
        case "nav-dashboard":
        case "nav-blogs":
        case "nav-social-posts":
        case "nav-tasks":
          return permissionContract.canViewDashboard;
        case "nav-calendar":
          return hasPermission("view_calendar");
        case "nav-settings":
        case "nav-ideas":
          return true;
        case "create-blog":
          return permissionContract.canCreateBlog;
        case "create-social-post":
          return canManageSocialPosts;
        case "create-idea":
          return true;
        case "action-import-blogs":
          return hasPermission("run_data_import");
        case "action-export-current-view":
          return permissionContract.canExportCsv && isActionCommandContext;
        case "action-clear-all-filters":
          return isActionCommandContext;
        default:
          return isAdmin;
      }
    },
    [
      canManageSocialPosts,
      hasPermission,
      isActionCommandContext,
      isAdmin,
      permissionContract.canCreateBlog,
      permissionContract.canExportCsv,
      permissionContract.canViewDashboard,
    ]
  );

  const availableCommands = useMemo(
    () => allCommands.filter((command) => isCommandAllowed(command)),
    [isCommandAllowed]
  );
  const results = searchCommands(availableCommands, searchTerm, 10);
  resultsRef.current = results;

  const groupedResults = groupCommandsByCategory(results);

  const open = useCallback(() => {
    setIsOpen(true);
    setSearchTerm("");
    setSelectedIndex(0);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setSearchTerm("");
    setSelectedIndex(0);
  }, []);

  const selectResult = useCallback((index: number) => {
    const maxIndex = Math.max(0, results.length - 1);
    setSelectedIndex(Math.min(Math.max(0, index), maxIndex));
  }, [results.length]);

  const executeSelected = useCallback(() => {
    const command = results[selectedIndex];
    if (command) {
      if (!isCommandAllowed(command)) {
        showError("You do not have permission to run this command.");
        close();
        return;
      }
      // Execute command based on action type
      if (command.actionType === "navigate" && command.targetUrl) {
        window.location.href = command.targetUrl;
      } else if (command.actionType === "create") {
        // Dispatch custom event for create actions
        window.dispatchEvent(
          new CustomEvent("create-command", { detail: { command } })
        );
      } else if (command.actionType === "action" && command.actionId) {
        if (command.actionId === "import_blogs") {
          window.location.href = "/blogs?import=1";
        } else {
          window.dispatchEvent(
            new CustomEvent("command-palette-action", {
              detail: { actionId: command.actionId },
            })
          );
        }
      }
      close();
    }
  }, [close, isCommandAllowed, results, selectedIndex, showError]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          selectResult(selectedIndex + 1);
          break;
        case "ArrowUp":
          e.preventDefault();
          selectResult(selectedIndex - 1);
          break;
        case "Enter":
          e.preventDefault();
          executeSelected();
          break;
        case "Escape":
          e.preventDefault();
          close();
          break;
      }
    },
    [selectedIndex, selectResult, executeSelected, close]
  );

  // Global keyboard listener for ⌘K / Ctrl+K
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // ⌘K on Mac, Ctrl+K on Windows/Linux
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
        if (!isOpen) {
          setSearchTerm("");
          setSelectedIndex(0);
        }
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [isOpen]);

  return {
    isOpen,
    open,
    close,
    searchTerm,
    setSearchTerm,
    results,
    groupedResults,
    selectedIndex,
    selectResult,
    executeSelected,
    handleKeyDown,
  };
}
