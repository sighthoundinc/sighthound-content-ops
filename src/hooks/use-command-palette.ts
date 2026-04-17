import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { usePathname } from "next/navigation";
import { searchCommands, groupCommandsByCategory } from "@/lib/command-palette-search";
import { allCommands } from "@/lib/command-palette-config";
import type { Command } from "@/lib/command-palette-config";
import { createUiPermissionContract } from "@/lib/permissions/uiPermissions";
import { getUserRoles } from "@/lib/roles";
import { useAuth } from "@/providers/auth-provider";
import { useAlerts } from "@/providers/alerts-provider";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

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
  const baseResults = searchCommands(availableCommands, searchTerm, 10);

  // Live cross-entity search via /api/search. Results appear as a
  // "results" category below the canonical navigation/create groups.
  const [liveResults, setLiveResults] = useState<Command[]>([]);
  const debouncedSearchTerm = useDebouncedValue(searchTerm, 180);
  useEffect(() => {
    const trimmed = debouncedSearchTerm.trim();
    if (!isOpen || trimmed.length < 2) {
      setLiveResults([]);
      return;
    }
    const controller = new AbortController();
    const run = async () => {
      try {
        const response = await fetch(
          `/api/search?q=${encodeURIComponent(trimmed)}`,
          { signal: controller.signal, cache: "no-store" }
        );
        if (!response.ok) {
          return;
        }
        const payload = (await response.json()) as {
          results?: Array<{
            id: string;
            title: string;
            kind: "blog" | "social" | "idea";
            href: string;
            statusLabel?: string | null;
          }>;
        };
        const rows = Array.isArray(payload.results) ? payload.results : [];
        setLiveResults(
          rows.slice(0, 10).map((row) => ({
            id: `search-${row.kind}-${row.id}`,
            label: row.title || "Untitled",
            category: "results",
            icon:
              row.kind === "blog"
                ? "blog"
                : row.kind === "social"
                  ? "social"
                  : "idea",
            description:
              row.kind === "blog"
                ? "Blog"
                : row.kind === "social"
                  ? "Social Post"
                  : "Idea",
            actionType: "navigate",
            targetUrl: row.href,
          } satisfies Command))
        );
      } catch (error) {
        if ((error as { name?: string }).name !== "AbortError") {
          console.warn("command palette search failed", error);
        }
      }
    };
    void run();
    return () => {
      controller.abort();
    };
  }, [debouncedSearchTerm, isOpen]);

  const results = useMemo(
    () => [...liveResults, ...baseResults],
    [baseResults, liveResults]
  );
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

  // Clickable ⌘K affordance fires a custom event rather than binding
  // directly to the hook so it works from anywhere in the tree.
  useEffect(() => {
    const handleOpenEvent = () => {
      setIsOpen(true);
      setSearchTerm("");
      setSelectedIndex(0);
    };
    window.addEventListener("command-palette:open", handleOpenEvent);
    return () => {
      window.removeEventListener("command-palette:open", handleOpenEvent);
    };
  }, []);

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
