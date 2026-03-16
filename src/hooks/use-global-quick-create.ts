import { useState, useCallback, useEffect } from "react";

export interface UseGlobalQuickCreateReturn {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

export function useGlobalQuickCreate(): UseGlobalQuickCreateReturn {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => {
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Global keyboard listener for C key
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
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

      // C key to open quick create
      if (e.key.toLowerCase() === "c") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }

      // ESC to close
      if (e.key === "Escape" && isOpen) {
        e.preventDefault();
        setIsOpen(false);
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
