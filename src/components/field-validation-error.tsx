import { ErrorIcon } from "@/lib/icons";

interface FieldValidationErrorProps {
  field: string;
  message?: string;
  show: boolean;
}

/**
 * Inline validation error banner for form fields.
 * Shows which field caused a validation error with optional custom message.
 * Use above or below the field that has the error.
 */
export function FieldValidationError({
  field,
  message,
  show,
}: FieldValidationErrorProps) {
  if (!show) return null;

  return (
    <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 flex items-start gap-2">
      <ErrorIcon boxClassName="h-5 w-5 flex-shrink-0 mt-0.5"
        size={16} />
      <div className="flex-1">
        <strong>{field}:</strong>{' '}
        {message || 'This field is required before proceeding.'}
      </div>
    </div>
  );
}
