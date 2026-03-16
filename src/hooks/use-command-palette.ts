import { useState, useCallback, useEffect, useRef } from "react";
import { searchCommands, groupCommandsByCategory } from "@/lib/command-palette-search";
import { allCommands } from "@/lib/command-palette-config";
import type { Command } from "@/lib/command-palette-config";

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
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const resultsRef = useRef<Command[]>([]);

  // Get search results
  const results = searchCommands(allCommands, searchTerm, 10);
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
      // Execute command based on action type
      if (command.actionType === "navigate" && command.targetUrl) {
        window.location.href = command.targetUrl;
      } else if (command.actionType === "create") {
        // Dispatch custom event for create actions
        window.dispatchEvent(
          new CustomEvent("create-command", { detail: { command } })
        );
      }
      close();
    }
  }, [results, selectedIndex, close]);

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
