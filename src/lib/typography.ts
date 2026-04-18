/**
 * Typography system utilities for the Sighthound Content Relay design.
 *
 * Font family is Lexend (loaded via next/font in src/app/layout.tsx).
 * Sizes and weights are intentionally kept at app density per
 * design-system/MIGRATION_AUDIT.md §§11.2–11.3 (14px body / weight 400).
 *
 * Colour tokens:
 * - Primary body / heading colour  → `text-ink` (Sighthound navy #1a1d38)
 * - Meta / secondary colour        → `text-navy-500` (#4b4f73)
 * - Disabled / muted               → `text-navy-500` at 60% alpha
 * - Brand link                     → `text-brand` (Blurple #4f60dc)
 */
export const TYPOGRAPHY = {
  // Page titles: Hero level, largest
  PAGE_TITLE: "text-2xl font-semibold leading-snug text-ink tracking-tight",

  // Section titles: Major headings
  SECTION_TITLE: "text-lg font-semibold leading-snug text-ink tracking-tight",

  // Subsection labels: Minor headings
  SUBSECTION_LABEL: "text-base font-semibold leading-6 text-ink",

  // Table headers: Column labels
  TABLE_HEADER: "text-xs font-semibold leading-4 tracking-normal text-navy-500",

  // Body text: Default paragraph text
  BODY: "text-sm font-normal leading-6 text-ink",

  // Body text - muted
  BODY_MUTED: "text-sm font-normal leading-6 text-navy-500",

  // Meta text: Secondary information
  META: "text-xs font-normal leading-4 text-navy-500",

  // Disabled text: Disabled or inactive states (navy-500 at 60% alpha)
  DISABLED: "text-xs font-normal leading-4 text-navy-500/60",

  // Monospace technical: IDs, codes, values
  MONOSPACE_TECHNICAL: "font-mono text-xs text-navy-500",

  // Small buttons or labels
  BUTTON_LABEL: "text-xs font-semibold leading-4 text-ink",

  // Badge or pill text
  BADGE: "text-xs font-medium leading-4 text-navy-500",

  // Link text (default body size) — brand Blurple per Strategy B
  LINK: "text-sm font-normal leading-6 text-brand underline",

  // Form labels
  FORM_LABEL: "text-sm font-medium leading-6 text-ink",

  // Form helper text
  FORM_HELPER: "text-xs font-normal leading-4 text-navy-500",

  // Card title
  CARD_TITLE: "text-base font-semibold leading-6 text-ink",

  // Notification/alert text
  NOTIFICATION: "text-sm font-normal leading-6 text-ink",

  // Compact list item text
  LIST_ITEM: "text-sm font-normal leading-6 text-ink",

  // Caption or figure text
  CAPTION: "text-xs font-normal leading-4 text-navy-500",

  // Toast or transient message
  TOAST: "text-sm font-normal leading-6 text-ink",
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
  color = "text-ink",
  tracking = "tracking-normal"
): string {
  return cx(size, weight, leading, color, tracking);
}
