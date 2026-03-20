import { useState, useCallback, useEffect } from "react";
import { QUICK_CREATE_SHORTCUT_KEY } from "@/lib/shortcuts";
import { setActiveModal, getActiveModal } from "@/lib/modal-state";

export interface UseGlobalQuickCreateReturn {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

export function useGlobalQuickCreate(): UseGlobalQuickCreateReturn {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => {
    setIsOpen(true);
    setActiveModal("global-quick-create");
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setActiveModal(null);
  }, []);

  // Global keyboard listener for Q key
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) {
        return;
      }
      // Only trigger C key when not in form input
      const target = e.target as HTMLElement | null;
      const isFormElement =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT" ||
        target?.isContentEditable;

      if (isFormElement) {
        return;
      }

      // Quick create key to open quick create
      if (e.key.toLowerCase() === QUICK_CREATE_SHORTCUT_KEY.toLowerCase()) {
        const activeModal = getActiveModal();
        if (activeModal && activeModal !== "global-quick-create") {
          return; // Don't open if another modal is already open
        }
        e.preventDefault();
        setIsOpen((prev) => {
          const nextIsOpen = !prev;
          if (nextIsOpen) {
            setActiveModal("global-quick-create");
          } else {
            setActiveModal(null);
          }
          return nextIsOpen;
        });
      }

      // ESC to close
      if (e.key === "Escape" && isOpen) {
        e.preventDefault();
        setIsOpen(false);
        setActiveModal(null);
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [isOpen]);

  return {
    isOpen,
    open,
    close,
  };
}
