import { cn } from "@/lib/utils";

export const SEGMENTED_CONTROL_CLASS =
  "inline-flex items-center rounded-md border border-[color:var(--sh-gray-200)] bg-blurple-50 p-0.5";

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
      ? "bg-white text-ink shadow-sm"
      : "text-navy-500 hover:bg-white/80 hover:text-ink",
    className
  );
}
