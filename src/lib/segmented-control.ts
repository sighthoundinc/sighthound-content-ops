import { cn } from "@/lib/utils";

export const SEGMENTED_CONTROL_CLASS =
  "inline-flex items-center rounded-md border border-slate-300 bg-slate-100 p-0.5";

export function segmentedControlItemClass({
  isActive,
  className,
}: {
  isActive: boolean;
  className?: string;
}) {
  return cn(
    "rounded px-3 py-1.5 text-sm font-medium transition-colors",
    isActive
      ? "bg-white text-slate-900 shadow-sm"
      : "text-slate-600 hover:bg-white/80 hover:text-slate-900",
    className
  );
}
