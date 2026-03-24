"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

type TooltipProps = {
  content: string;
  children: ReactNode;
  delay?: number;
  disabled?: boolean;
  className?: string;
  offset?: number;
};

export function Tooltip({
  content,
  children,
  delay = 150,
  disabled = false,
  className,
  offset = 8,
}: TooltipProps) {
  const triggerRef = useRef<HTMLSpanElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const openTimerRef = useRef<number | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const tooltipId = useId();
  const VIEWPORT_PADDING = 8;

  const clearOpenTimer = () => {
    if (openTimerRef.current !== null) {
      window.clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
  };

  const updatePosition = useCallback(() => {
    const triggerNode = triggerRef.current;
    if (!triggerNode) {
      return;
    }
    const triggerRect = triggerNode.getBoundingClientRect();
    const tooltipNode = tooltipRef.current;
    const tooltipRect = tooltipNode?.getBoundingClientRect();

    let nextTop = triggerRect.top + triggerRect.height / 2;
    let nextLeft = triggerRect.right + offset;

    if (tooltipRect) {
      const minLeft = VIEWPORT_PADDING;
      const maxLeft = Math.max(
        VIEWPORT_PADDING,
        window.innerWidth - tooltipRect.width - VIEWPORT_PADDING
      );
      nextLeft = Math.min(Math.max(nextLeft, minLeft), maxLeft);

      const halfHeight = tooltipRect.height / 2;
      const minTop = VIEWPORT_PADDING + halfHeight;
      const maxTop = Math.max(
        VIEWPORT_PADDING + halfHeight,
        window.innerHeight - VIEWPORT_PADDING - halfHeight
      );
      nextTop = Math.min(Math.max(nextTop, minTop), maxTop);
    }

    setPosition({
      top: nextTop,
      left: nextLeft,
    });
  }, [offset]);

  const openWithDelay = () => {
    if (disabled) {
      return;
    }
    clearOpenTimer();
    openTimerRef.current = window.setTimeout(() => {
      updatePosition();
      setIsOpen(true);
    }, delay);
  };

  const openImmediately = () => {
    if (disabled) {
      return;
    }
    clearOpenTimer();
    updatePosition();
    setIsOpen(true);
  };

  const closeTooltip = () => {
    clearOpenTimer();
    setIsOpen(false);
  };

  useEffect(() => {
    setIsClient(true);
    return () => {
      clearOpenTimer();
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const handleViewportChange = () => {
      updatePosition();
    };

    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);

    return () => {
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [isOpen, updatePosition]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const rafId = window.requestAnimationFrame(() => {
      updatePosition();
    });

    return () => {
      window.cancelAnimationFrame(rafId);
    };
  }, [isOpen, updatePosition]);

  if (disabled) {
    return <>{children}</>;
  }

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={openWithDelay}
        onMouseLeave={closeTooltip}
        onFocus={openImmediately}
        onBlur={closeTooltip}
        aria-describedby={isOpen ? tooltipId : undefined}
        className={className}
      >
        {children}
      </span>
      {isClient && isOpen
        ? createPortal(
            <div
              ref={tooltipRef}
              id={tooltipId}
              role="tooltip"
              className="pointer-events-none fixed z-20 rounded-md bg-slate-900 px-2 py-1 text-xs font-medium text-white shadow-lg"
              style={{
                top: position.top,
                left: position.left,
                transform: "translateY(-50%)",
              }}
            >
              {content}
            </div>,
            document.body
          )
        : null}
    </>
  );
}
