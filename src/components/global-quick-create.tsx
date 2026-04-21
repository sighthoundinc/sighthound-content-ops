"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useGlobalQuickCreate } from "@/hooks/use-global-quick-create";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { KbdShortcut } from "@/components/kbd-shortcut";
import { Button } from "@/components/button";
import { MAIN_CREATE_SHORTCUTS, QUICK_CREATE_SHORTCUT_KEY } from "@/lib/shortcuts";
import { AppIcon, type AppIconName } from "@/lib/icons";
type QuickCreateAction = {
  id: "new-blog" | "new-idea" | "new-social-post";
  label: "New Blog" | "New Idea" | "New Social Post";
  icon: AppIconName;
  description: string;
  onClick: () => void;
  shortcut: string;
  isDirectShortcut: boolean;
};

export function GlobalQuickCreate() {
  const { isOpen, close } = useGlobalQuickCreate();
  const [activeIndex, setActiveIndex] = useState(0);
  const actionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const router = useRouter();

  const handleCreateBlog = useCallback(() => {
    router.push("/blogs/new");
    close();
  }, [close, router]);

  const handleCreateSocialPost = useCallback(() => {
    router.push("/social-posts?create=1");
    close();
  }, [close, router]);

  const handleCreateIdea = useCallback(() => {
    router.push("/ideas");
    close();
  }, [close, router]);
  const actions = useMemo<QuickCreateAction[]>(
    () => [
      {
        id: "new-blog",
        label: "New Blog",
        icon: "blog",
        description: "Create a new blog post",
        onClick: handleCreateBlog,
        shortcut: MAIN_CREATE_SHORTCUTS.newBlog,
        isDirectShortcut: true,
      },
      {
        id: "new-social-post",
        label: "New Social Post",
        icon: "social",
        description: "Create a new social media post",
        onClick: handleCreateSocialPost,
        shortcut: MAIN_CREATE_SHORTCUTS.newSocialPost,
        isDirectShortcut: false,
      },
      {
        id: "new-idea",
        label: "New Idea",
        icon: "idea",
        description: "Add a new content idea",
        onClick: handleCreateIdea,
        shortcut: MAIN_CREATE_SHORTCUTS.newIdea,
        isDirectShortcut: false,
      },
    ],
    [handleCreateBlog, handleCreateIdea, handleCreateSocialPost]
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    setActiveIndex(0);
  }, [isOpen]);
  useEffect(() => {
    if (!isOpen || actions.length === 0) {
      return;
    }
    actionRefs.current[activeIndex]?.focus();
  }, [actions.length, activeIndex, isOpen]);

  useEffect(() => {
    const handleCreateCommand = (event: Event) => {
      const customEvent = event as CustomEvent<{ command?: { id?: string } }>;
      const commandId = customEvent.detail?.command?.id;
      if (commandId === "create-blog") {
        handleCreateBlog();
        return;
      }
      if (commandId === "create-social-post") {
        handleCreateSocialPost();
        return;
      }
      if (commandId === "create-idea") {
        handleCreateIdea();
      }
    };
    window.addEventListener("create-command", handleCreateCommand as EventListener);
    return () => {
      window.removeEventListener("create-command", handleCreateCommand as EventListener);
    };
  }, [handleCreateBlog, handleCreateIdea, handleCreateSocialPost]);
  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if (!isOpen || actions.length === 0) {
        return;
      }
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const delta = event.key === "ArrowDown" ? 1 : -1;
        setActiveIndex((previous) => (previous + delta + actions.length) % actions.length);
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        const selectedAction = actions[activeIndex];
        if (selectedAction) {
          selectedAction.onClick();
        }
      }
    };
    window.addEventListener("keydown", handleKeydown);
    return () => {
      window.removeEventListener("keydown", handleKeydown);
    };
  }, [actions, activeIndex, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={close}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="absolute inset-x-0 top-1/3 flex justify-center">
        <div
          className="w-full max-w-md bg-surface rounded-lg shadow-lg overflow-hidden"
          role="dialog"
          aria-modal="true"
          aria-labelledby="quick-create-title"
        >
          {/* Header */}
          <div className="border-b border-[color:var(--sh-gray-200)] px-6 py-4">
            <h2
              id="quick-create-title"
              className="text-lg font-semibold text-ink"
            >
              Create New
            </h2>
          </div>

          {/* Actions */}
          <div
            className="divide-y divide-[color:var(--sh-gray-200)]"
            role="listbox"
            aria-label="Quick create actions"
          >
            {actions.map((action, index) => (
              <button
                key={action.id}
                ref={(node) => {
                  actionRefs.current[index] = node;
                }}
                type="button"
                onClick={action.onClick}
                onMouseEnter={() => {
                  setActiveIndex(index);
                }}
                onFocus={() => {
                  setActiveIndex(index);
                }}
                role="option"
                aria-selected={index === activeIndex}
                aria-label={
                  action.isDirectShortcut
                    ? `${action.label}. Direct shortcut ${action.shortcut}.`
                    : `${action.label}. Open Quick Create first with ${QUICK_CREATE_SHORTCUT_KEY}, then select this action.`
                }
                aria-keyshortcuts={action.isDirectShortcut ? action.shortcut : undefined}
                className={cn(
                  "w-full px-6 py-4 text-left transition-colors focus-visible:outline-none focus-visible:shadow-brand-focus",
                  index === activeIndex
                    ? "bg-blurple-50 ring-2 ring-inset ring-[color:var(--sh-blurple-100)]"
                    : "hover:bg-blurple-50"
                )}
              >
                <div className="flex items-center gap-3">
                  <AppIcon
                    name={action.icon}
                    boxClassName="h-8 w-8"
                    size={18}
                    className="text-navy-500"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3 font-medium text-ink">
                      <span>{action.label}</span>
                      <KbdShortcut>{action.shortcut}</KbdShortcut>
                    </div>
                    <div className="text-sm text-navy-500">{action.description}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Footer */}
          <div className="border-t border-[color:var(--sh-gray-200)] px-6 py-3 bg-[color:var(--sh-gray)] text-xs text-navy-500">
            <Button
              variant="ghost"
              size="xs"
              onClick={() => {
                close();
                window.dispatchEvent(new CustomEvent("open-shortcuts-modal"));
              }}
            >
              Shortcuts
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
