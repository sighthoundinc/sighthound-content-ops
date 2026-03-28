/**
 * Typography system utilities for modern minimalist design
 * Using Inter font with consistent scale and hierarchy
 */

export const TYPOGRAPHY = {
  // Page titles: Hero level, largest
  PAGE_TITLE: "text-2xl font-semibold leading-snug text-slate-900 tracking-tight",

  // Section titles: Major headings
  SECTION_TITLE: "text-lg font-semibold leading-snug text-slate-900 tracking-tight",

  // Subsection labels: Minor headings
  SUBSECTION_LABEL: "text-base font-semibold leading-6 text-slate-900",

  // Table headers: Column labels
  TABLE_HEADER: "text-xs font-semibold leading-4 tracking-normal text-slate-600",

  // Body text: Default paragraph text
  BODY: "text-sm font-normal leading-6 text-slate-800",

  // Body text - muted
  BODY_MUTED: "text-sm font-normal leading-6 text-slate-600",

  // Meta text: Secondary information
  META: "text-xs font-normal leading-4 text-slate-600",

  // Disabled text: Disabled or inactive states
  DISABLED: "text-xs font-normal leading-4 text-slate-400",

  // Monospace technical: IDs, codes, values
  MONOSPACE_TECHNICAL: "font-mono text-xs text-slate-700",

  // Small buttons or labels
  BUTTON_LABEL: "text-xs font-semibold leading-4 text-slate-900",

  // Badge or pill text
  BADGE: "text-xs font-medium leading-4 text-slate-700",

  // Link text (default body size)
  LINK: "text-sm font-normal leading-6 text-blue-600 underline",

  // Form labels
  FORM_LABEL: "text-sm font-medium leading-6 text-slate-900",

  // Form helper text
  FORM_HELPER: "text-xs font-normal leading-4 text-slate-600",

  // Card title
  CARD_TITLE: "text-base font-semibold leading-6 text-slate-900",

  // Notification/alert text
  NOTIFICATION: "text-sm font-normal leading-6 text-slate-800",

  // Compact list item text
  LIST_ITEM: "text-sm font-normal leading-6 text-slate-800",

  // Caption or figure text
  CAPTION: "text-xs font-normal leading-4 text-slate-600",

  // Toast or transient message
  TOAST: "text-sm font-normal leading-6 text-slate-800",
} as const;

/**
 * Typography tokens for flexible styling
 * Use these for custom combinations or overrides
 */
export const FONT_SIZES = {
  XS: "text-xs",
  SM: "text-sm",
  BASE: "text-base",
  LG: "text-lg",
  XL: "text-xl",
  "2XL": "text-2xl",
} as const;

export const FONT_WEIGHTS = {
  NORMAL: "font-normal",
  MEDIUM: "font-medium",
  SEMIBOLD: "font-semibold",
  BOLD: "font-bold",
} as const;

export const LEADING = {
  "4": "leading-4",
  "5": "leading-5",
  "6": "leading-6",
  "7": "leading-7",
  SNUG: "leading-snug",
  TIGHT: "leading-tight",
} as const;

export const TRACKING = {
  TIGHT: "tracking-tight",
  NORMAL: "tracking-normal",
  WIDE: "tracking-wide",
} as const;

/**
 * Helper function to combine typography classes
 */
export function cx(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

/**
 * Build custom typography combination
 */
export function buildTypography(
  size: typeof FONT_SIZES[keyof typeof FONT_SIZES],
  weight: typeof FONT_WEIGHTS[keyof typeof FONT_WEIGHTS],
  leading: typeof LEADING[keyof typeof LEADING],
  color = "text-slate-800",
  tracking = "tracking-normal"
): string {
  return cx(size, weight, leading, color, tracking);
}
