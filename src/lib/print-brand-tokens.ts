/**
 * Print / popup-scope brand hex fallbacks.
 *
 * CSS custom properties (--sh-*, --color-*) defined in `src/app/globals.css`
 * and `design-system/colors_and_type.css` are not available inside detached
 * print popups (`window.open(...)` creates an isolated document that does not
 * inherit the host stylesheets). Features like blog PDF export need the brand
 * palette inlined as literal hex values.
 *
 * Authoritative source: `design-system/colors_and_type.css`. Any brand token
 * change MUST update both that file AND this constant block, per AGENTS.md
 * Design System Authority §8 (change control).
 */
export const PRINT_BRAND_TOKENS = {
  /** Primary ink for body text on light surfaces (Sighthound Dark Navy). */
  ink: "#1a1d38",
  /** Secondary ink for metadata / subheadings (navy-500 tier). */
  inkSoft: "#4b4f73",
  /** Default border / divider color (--sh-gray-200 tier). */
  borderDefault: "#d9dfe6",
  /** Muted surface for table headers, footers (--sh-gray tier). */
  surfaceMuted: "#eff3f7",
} as const;

export type PrintBrandToken = keyof typeof PRINT_BRAND_TOKENS;
