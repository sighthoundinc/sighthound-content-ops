"use client";

import { Command } from "cmdk";
import { useEffect, useMemo, useState } from "react";

import { cn } from "@/lib/utils";

export type CommandPaletteCommand = {
  id: string;
  label: string;
  group: string;
  keywords?: string[];
  action: () => void;
};

export function CommandPalette({
  commands,
}: {
  commands: CommandPaletteCommand[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setIsOpen((previous) => !previous);
        return;
      }

      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setQuery("");
    }
  }, [isOpen]);

  const groupedCommands = useMemo(() => {
    const commandGroups = new Map<string, CommandPaletteCommand[]>();
    for (const command of commands) {
      const existingCommands = commandGroups.get(command.group) ?? [];
      existingCommands.push(command);
      commandGroups.set(command.group, existingCommands);
    }
    return Array.from(commandGroups.entries());
  }, [commands]);

  if (!isOpen) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        aria-label="Close command palette"
        className="fixed inset-0 z-40 bg-slate-900/30"
        onClick={() => {
          setIsOpen(false);
        }}
      />
      <div className="fixed inset-x-4 top-16 z-50 mx-auto w-full max-w-2xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
        <Command className="w-full" shouldFilter value={query} onValueChange={setQuery}>
          <div className="border-b border-slate-200 px-3 py-2">
            <Command.Input
              autoFocus
              placeholder="Search commands..."
              className="w-full bg-transparent px-2 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400"
            />
          </div>
          <Command.List className="max-h-[60vh] overflow-y-auto p-2">
            <Command.Empty className="px-3 py-5 text-sm text-slate-500">
              No matching commands.
            </Command.Empty>
            {groupedCommands.map(([groupName, groupCommands]) => (
              <Command.Group
                key={groupName}
                heading={groupName}
                className={cn(
                  "mb-2 overflow-hidden rounded-md border border-transparent p-1 text-xs font-semibold uppercase tracking-wide text-slate-500",
                  "[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pb-1"
                )}
              >
                {groupCommands.map((command) => (
                  <Command.Item
                    key={command.id}
                    value={`${command.label} ${(command.keywords ?? []).join(" ")}`}
                    className="cursor-pointer rounded-md px-2 py-2 text-sm font-medium text-slate-700 aria-selected:bg-slate-100 aria-selected:text-slate-900"
                    onSelect={() => {
                      command.action();
                      setIsOpen(false);
                    }}
                  >
                    {command.label}
                  </Command.Item>
                ))}
              </Command.Group>
            ))}
          </Command.List>
        </Command>
      </div>
    </>
  );
}
