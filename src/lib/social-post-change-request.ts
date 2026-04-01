export const CHANGE_REQUEST_CATEGORY_OPTIONS = [
  { value: "creative_direction", label: "Creative direction" },
  { value: "caption_message", label: "Caption and messaging" },
  { value: "requirements_missing", label: "Missing required fields" },
  { value: "timing_schedule", label: "Timing and schedule" },
  { value: "platform_fit", label: "Platform fit" },
  { value: "other", label: "Other" },
] as const;

export type ChangeRequestCategory =
  (typeof CHANGE_REQUEST_CATEGORY_OPTIONS)[number]["value"];

export type ChangeRequestTemplateState = {
  category: ChangeRequestCategory | "";
  checklist: string[];
  note: string;
};

export const CHANGE_REQUEST_CHECKLIST_OPTIONS = [
  {
    id: "revise_copy",
    label: "Revise copy for clarity and consistency",
  },
  {
    id: "update_creative",
    label: "Update creative/design alignment",
  },
  {
    id: "fill_required_fields",
    label: "Fill required workflow fields",
  },
  {
    id: "adjust_schedule",
    label: "Adjust schedule or platform plan",
  },
  {
    id: "confirm_links",
    label: "Confirm links/context before next stage",
  },
] as const;

export function createEmptyChangeRequestTemplate(): ChangeRequestTemplateState {
  return {
    category: "",
    checklist: [],
    note: "",
  };
}

export function getChangeRequestTemplateError(
  template: ChangeRequestTemplateState
): string | null {
  if (!template.category) {
    return "Select a change category.";
  }
  if (template.checklist.length === 0) {
    return "Select at least one checklist item.";
  }
  return null;
}

export function formatChangeRequestReason(
  template: ChangeRequestTemplateState
): string {
  const categoryLabel =
    CHANGE_REQUEST_CATEGORY_OPTIONS.find(
      (option) => option.value === template.category
    )?.label ?? "Other";
  const checklistLabels = template.checklist
    .map(
      (itemId) =>
        CHANGE_REQUEST_CHECKLIST_OPTIONS.find((option) => option.id === itemId)
          ?.label
    )
    .filter(
      (
        label
      ): label is (typeof CHANGE_REQUEST_CHECKLIST_OPTIONS)[number]["label"] =>
        typeof label === "string"
    );
  const lines = [
    `Category: ${categoryLabel}`,
    "Checklist:",
    ...checklistLabels.map((label) => `- ${label}`),
  ];
  const note = template.note.trim();
  if (note.length > 0) {
    lines.push(`Context: ${note}`);
  }
  return lines.join("\n");
}
