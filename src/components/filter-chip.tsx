import { CloseIcon } from "@/lib/icons";
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
        "inline-flex items-center gap-2 rounded-full bg-blurple-50 px-3 py-1.5 text-sm text-navy-500 border border-[color:var(--sh-gray-200)]",
        className
      )}
    >
      <span className="font-medium">{label}</span>
      {value && <span className="text-navy-500">{value}</span>}
      {removable && (
        <button
          type="button"
          onClick={onRemove}
          className="ml-1 inline-flex items-center justify-center rounded-full p-0.5 text-navy-500 hover:bg-[color:var(--sh-gray-200)] hover:text-ink transition-colors focus-visible:outline-none focus-visible:shadow-brand-focus"
          aria-label={`Remove ${label} filter`}
        >
          <CloseIcon size={12} boxClassName="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
