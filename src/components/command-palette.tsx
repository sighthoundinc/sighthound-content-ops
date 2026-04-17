"use client";

import React, { useEffect, useRef } from "react";
import { useCommandPalette } from "@/hooks/use-command-palette";
import type { Command } from "@/lib/command-palette-config";
import { AppIcon } from "@/lib/icons";

export function CommandPalette() {
  const {
    isOpen,
    close,
    searchTerm,
    setSearchTerm,
    results,
    groupedResults,
    selectedIndex,
    selectResult,
    executeSelected,
    handleKeyDown,
  } = useCommandPalette();

  const inputRef = useRef<HTMLInputElement>(null);
  const resultsContainerRef = useRef<HTMLDivElement>(null);
  const selectedItemRef = useRef<HTMLButtonElement>(null);

  // Focus input when palette opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Scroll selected item into view
  useEffect(() => {
    if (selectedItemRef.current && resultsContainerRef.current) {
      selectedItemRef.current.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  const categoryOrder = ["results", "navigation", "create", "actions"];
  const sortedCategories = Object.keys(groupedResults).sort((a, b) => {
    const aIndex = categoryOrder.indexOf(a);
    const bIndex = categoryOrder.indexOf(b);
    return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
  });

  let currentIndex = 0;
  const getIsSelected = (cmdIndex: number) => cmdIndex === selectedIndex;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={close}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="absolute inset-x-0 top-1/4 flex justify-center">
        <div
          className="w-full max-w-2xl bg-white rounded-lg shadow-lg overflow-hidden"
          role="dialog"
          aria-modal="true"
          aria-labelledby="command-palette-title"
        >
          {/* Search Input */}
          <div className="border-b border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <AppIcon
                name="search"
                className="text-gray-400"
                boxClassName="h-5 w-5"
                size={16}
              />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search commands, navigate, or create..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  handleKeyDown(e);
                }}
                className="flex-1 outline-none text-sm"
                aria-label="Command search"
              />
            </div>
          </div>

          {/* Results */}
          <div
            ref={resultsContainerRef}
            className="max-h-96 overflow-y-auto"
            role="listbox"
            aria-label="Command results"
          >
            {results.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-sm">
                No commands found
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {sortedCategories.map((category) => (
                  <div key={category}>
                    {/* Category Header */}
                    <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-50">
                      {category === "results" && "Results"}
                      {category === "navigation" && "Navigation"}
                      {category === "create" && "Create"}
                      {category === "actions" && "Actions"}
                    </div>

                    {/* Commands */}
                    <div>
                      {groupedResults[category]?.map((command: Command) => {
                        const isSelected = getIsSelected(currentIndex);
                        const itemIndex = currentIndex;
                        currentIndex++;

                        return (
                          <button
                            key={command.id}
                            ref={isSelected ? selectedItemRef : null}
                            onClick={() => {
                              selectResult(itemIndex);
                              executeSelected();
                            }}
                            onMouseEnter={() => selectResult(itemIndex)}
                            className={`w-full px-4 py-3 text-left text-sm flex items-center gap-3 transition-colors ${
                              isSelected
                                ? "bg-blue-50 text-blue-900"
                                : "text-gray-700 hover:bg-gray-50"
                            }`}
                            role="option"
                            aria-selected={isSelected}
                          >
                            <div className="flex-shrink-0">
                              <AppIcon
                                name={command.icon ?? "chevronRight"}
                                className={isSelected ? "text-blue-700" : "text-gray-500"}
                                boxClassName="h-6 w-6"
                                size={16}
                              />
                            </div>
                            <div className="flex-1">
                              <div className="font-medium">{command.label}</div>
                              {command.description && (
                                <div className="text-xs text-gray-500 mt-0.5">
                                  {command.description}
                                </div>
                              )}
                            </div>
                            {command.keyboard && (
                              <div className="text-xs text-gray-400 ml-auto flex-shrink-0">
                                {command.keyboard}
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 px-4 py-3 bg-gray-50 flex items-center justify-between text-xs text-gray-500">
            <div>Press ESC to close</div>
            <div className="flex gap-2">
              <kbd className="px-2 py-1 bg-white border border-gray-200 rounded text-xs font-semibold">
                Up/Down
              </kbd>
              <kbd className="px-2 py-1 bg-white border border-gray-200 rounded text-xs font-semibold">
                Enter
              </kbd>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
