/**
 * Optional font imports for testing different typography choices.
 *
 * Current: Geist (modern, geometric)
 * - Excellent all-around choice, sharp at small sizes
 * - Load-time: ~50KB
 *
 * Option 1: Inter (Notion/Linear aesthetic)
 * - Humanist sans-serif, warm, very readable at xs/sm
 * - Load-time: ~55KB
 * - Uncomment and swap in layout.tsx if testing
 *
 * Option 2: System UI Stack (premium, zero-load)
 * - Native OS fonts: SF Pro on macOS, Segoe on Windows
 * - Load-time: 0KB, fastest rendering
 * - Switch in globals.css body font-family only
 *
 * Performance ranking: System UI > Geist ≈ Inter
 * Visual ranking: Inter (warm) > Geist (sharp) > System (native)
 */

// Uncomment to test Inter instead of Geist:
// import { Inter } from 'next/font/google';
//
// export const interFont = Inter({
//   variable: '--font-inter',
//   subsets: ['latin'],
// });

export const FONT_STACK_SYSTEM_UI = `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif`;
export const FONT_STACK_CURRENT = `var(--font-geist-sans), ${FONT_STACK_SYSTEM_UI}`;

/**
 * To switch to System UI:
 * 1. In globals.css, change body font-family to FONT_STACK_SYSTEM_UI
 * 2. Remove @theme inline --font-sans override
 *
 * To switch to Inter:
 * 1. Import Inter above and export it
 * 2. In layout.tsx, add interFont.variable to className
 * 3. In @theme inline, change --font-sans to var(--font-inter)
 * 4. Verify tracking-wide headers still look sharp (Inter may need slight adjustment)
 */
