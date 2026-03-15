"use client";

import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "destructive" | "ghost" | "icon";
type ButtonSize = "xs" | "sm" | "md" | "icon";

const BUTTON_VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    "border border-slate-900 bg-slate-900 text-white hover:bg-slate-700 hover:border-slate-700",
  secondary:
    "border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 hover:border-slate-300",
  destructive:
    "border border-rose-600 bg-rose-600 text-white hover:bg-rose-500 hover:border-rose-500",
  ghost: "border border-transparent bg-transparent text-slate-600 hover:bg-slate-100",
  icon: "border border-slate-300 bg-white text-slate-600 hover:bg-slate-100",
};

const BUTTON_SIZE_CLASSES: Record<ButtonSize, string> = {
  xs: "px-2 py-1 text-xs font-medium",
  sm: "px-3 py-1.5 text-sm font-medium",
  md: "px-3 py-2 text-sm font-semibold",
  icon: "h-7 w-7 text-xs",
};

export function buttonClass({
  variant = "secondary",
  size = "sm",
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}) {
  return cn(
    "pressable inline-flex items-center justify-center rounded-md transition disabled:cursor-not-allowed disabled:opacity-60",
    BUTTON_VARIANT_CLASSES[variant],
    BUTTON_SIZE_CLASSES[size],
    className
  );
}

export function Button({
  variant = "secondary",
  size = "sm",
  className,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return <button type={type} className={buttonClass({ variant, size, className })} {...props} />;
}
