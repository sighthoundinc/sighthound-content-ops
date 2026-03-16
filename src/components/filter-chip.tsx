import { cn } from "@/lib/utils";

export interface FilterChipProps {
  /** Display label for the filter */
  label: string;
  /** Optional value/description for the filter */
  value?: string;
  /** Callback when remove button is clicked */
  onRemove: () => void;
  /** Custom className */
  className?: string;
  /** Show remove button */
  removable?: boolean;
}

/**
 * FilterChip component for displaying active filters.
 * Shows the filter label and optional value with a remove button.
 *
 * @example
 * <FilterChip
 *   label="Status"
 *   value="Published"
 *   onRemove={() => handleRemoveFilter("status")}
 * />
 */
export function FilterChip({
  label,
  value,
  onRemove,
  className,
  removable = true,
}: FilterChipProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-sm text-slate-700 border border-slate-200",
        className
      )}
    >
      <span className="font-medium">{label}</span>
      {value && <span className="text-slate-600">{value}</span>}
      {removable && (
        <button
          type="button"
          onClick={onRemove}
          className="ml-1 inline-flex items-center justify-center rounded-full p-0.5 hover:bg-slate-200 transition-colors"
          aria-label={`Remove ${label} filter`}
        >
          <span className="text-slate-600 font-semibold text-sm leading-none">×</span>
        </button>
      )}
    </div>
  );
}
