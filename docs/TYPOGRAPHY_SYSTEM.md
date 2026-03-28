# Typography System: Modern Minimalist Design with Inter

## Overview

The app uses **Inter** as the primary sans-serif font and **JetBrains Mono** as the monospace font, creating a clean, modern, minimalist aesthetic aligned with contemporary design systems (OpenAI, Google, HubSpot).

## Font Loading

Fonts are loaded via Google Fonts with `display: swap` to prevent layout shift:

- **Inter** (`--font-inter-sans`): Primary sans-serif for all body text, headings, and UI elements
- **JetBrains Mono** (`--font-jetbrains-mono`): Monospace for technical values, IDs, and code snippets

Load location: `src/app/layout.tsx`

## Type Scale

All typography sizes and weights are intentionally designed to work with Inter's metrics. Font sizes use a 12–24px range for optimal readability and visual hierarchy.

### Core Type Scale Classes

These utility classes should be used for all typography in components:

```typescript
// In globals.css:

.page-title              // text-2xl font-semibold leading-snug text-slate-900 tracking-tight
.section-title           // text-lg font-semibold leading-snug text-slate-900 tracking-tight
.subsection-label        // text-base font-semibold leading-6 text-slate-900
.table-header-text       // text-xs font-semibold leading-4 tracking-normal text-slate-600
.body-text               // text-sm font-normal leading-6 text-slate-800
.meta-text               // text-xs font-normal leading-4 text-slate-600
.disabled-text           // text-xs font-normal leading-4 text-slate-400
.monospace-technical     // font-mono text-xs text-slate-700
```

### Typography Constants

For direct component usage, use the `TYPOGRAPHY` constants from `src/lib/typography.ts`:

```typescript
import { TYPOGRAPHY } from "@/lib/typography";

// Usage:
<h1 className={TYPOGRAPHY.PAGE_TITLE}>Page Title</h1>
<p className={TYPOGRAPHY.BODY}>Body text</p>
<span className={TYPOGRAPHY.META}>Meta information</span>
```

**Available constants:**
- `TYPOGRAPHY.PAGE_TITLE` — Hero level heading (h1)
- `TYPOGRAPHY.SECTION_TITLE` — Major section heading (h2)
- `TYPOGRAPHY.SUBSECTION_LABEL` — Minor heading (h3)
- `TYPOGRAPHY.TABLE_HEADER` — Column header text
- `TYPOGRAPHY.BODY` — Default paragraph text
- `TYPOGRAPHY.BODY_MUTED` — Secondary body text
- `TYPOGRAPHY.META` — Small supporting text
- `TYPOGRAPHY.DISABLED` — Disabled or inactive text
- `TYPOGRAPHY.MONOSPACE_TECHNICAL` — Technical IDs, codes, values
- `TYPOGRAPHY.BUTTON_LABEL` — Button and small label text
- `TYPOGRAPHY.BADGE` — Badge or pill text
- `TYPOGRAPHY.LINK` — Hyperlink text
- `TYPOGRAPHY.FORM_LABEL` — Form field labels
- `TYPOGRAPHY.FORM_HELPER` — Form helper/instruction text
- `TYPOGRAPHY.CARD_TITLE` — Card heading
- `TYPOGRAPHY.NOTIFICATION` — Notification/alert text
- `TYPOGRAPHY.LIST_ITEM` — List item text
- `TYPOGRAPHY.CAPTION` — Caption or figure text
- `TYPOGRAPHY.TOAST` — Toast/transient message text

## Hierarchy and Visual Balance

### Heading Hierarchy

1. **Page Title** (2xl, semibold, tight tracking)
   - Used for main page headings and primary CTAs
   - Most prominent element on a page

2. **Section Title** (lg, semibold, tight tracking)
   - Used for major content sections
   - Introduces new topics or panels

3. **Subsection Label** (base, semibold)
   - Used for minor headings and card titles
   - Smaller scope than section title

### Text Hierarchy

- **Body Text** (sm, normal, leading-6)
  - Default for all paragraph and descriptive text
  - 14px on most displays

- **Meta Text** (xs, normal, leading-4)
  - Secondary information, timestamps, supporting details
  - 12px on most displays

- **Table Headers** (xs, semibold, normal tracking)
  - Column labels in tables
  - Slightly more prominent than body due to semibold weight

## Weight System

### Font Weights

- **Normal (400)**: Body text, paragraphs, default content
- **Medium (500)**: Form labels, badges, emphatic text
- **Semibold (600)**: Headings, titles, strong emphasis
- **Bold (700)**: Reserved for exceptional emphasis (rarely used)

### When to Use Each Weight

- **Normal**: Any default readable text
- **Medium**: Form labels, button text, badge labels
- **Semibold**: All headings (h1, h2, h3, h4), section titles, strong callouts
- **Bold**: Avoid unless there's a specific design reason

## Line Height

Modern typography uses tighter, more optical line heights:

- **Headings** (`leading-snug`): 1.2 — tight vertical rhythm
- **Body text** (`leading-6`): 1.5 — comfortable reading (24px baseline)
- **Meta text** (`leading-4`): 1 — compact for small supporting text
- **Table headers** (`leading-4`): 1 — compact column labels

## Letter Spacing

- **Headings** (`tracking-tight`): -0.015em — modern, confident look
- **Table headers** (`tracking-normal`): 0 — standard spacing
- **Body** (default): 0 — natural Inter spacing
- **Avoid wide letter-spacing** unless explicitly designed

Global body element has `-0.01em` for subtle optical tightening with Inter.

## Color Palette for Text

Text colors follow a consistent slate-based palette:

- **`text-slate-900`**: Headings, primary content (darkest)
- **`text-slate-800`**: Body text, default content
- **`text-slate-700`**: Secondary content, less prominent text
- **`text-slate-600`**: Meta text, table headers, supporting info
- **`text-slate-500`**: Placeholder text
- **`text-slate-400`**: Disabled text, lowest visual weight

## Implementation Rules

### Do's

- ✅ Use utility classes from `globals.css` for standard typography roles
- ✅ Import `TYPOGRAPHY` constants from `src/lib/typography.ts` for components
- ✅ Maintain consistent spacing and line-height across similar content types
- ✅ Test typography on different screen sizes to ensure readability
- ✅ Use tabular-nums for numeric values in tables (automatic via `TABLE_NUMERIC_CELL_CLASS`)

### Don'ts

- ❌ Don't mix font families (e.g., don't use fallback fonts if Inter is available)
- ❌ Don't override heading line-heights arbitrarily
- ❌ Don't use font sizes outside the defined scale without documentation
- ❌ Don't apply semibold to non-heading text
- ❌ Don't use text-xs for primary body content
- ❌ Don't apply letter-spacing to body text

## Component Typography Examples

### Button

```tsx
<button className="bg-blue-600 text-white rounded px-4 py-2">
  <span className={TYPOGRAPHY.BUTTON_LABEL}>Click Me</span>
</button>
```

### Form Label

```tsx
<label htmlFor="name" className={TYPOGRAPHY.FORM_LABEL}>
  Full Name
</label>
<input id="name" type="text" />
<span className={TYPOGRAPHY.FORM_HELPER}>Your legal first and last name</span>
```

### Table Cell

```tsx
<td className="text-sm font-normal leading-6 text-slate-800 truncate">
  {cellContent}
</td>
```

### Card Title

```tsx
<h3 className={TYPOGRAPHY.CARD_TITLE}>Card Title</h3>
```

### Meta Information (Timestamp, Status Label)

```tsx
<span className={TYPOGRAPHY.META}>
  Last updated 2 hours ago
</span>
```

## Migration Notes

### From Geist to Inter

Inter is optically similar to Geist but with subtly different metrics:

- **Slightly more compact**: Use `leading-6` instead of `leading-5` for body text to maintain openness
- **Tighter headings**: Use `leading-snug` and `tracking-tight` for a modern look
- **More neutral**: No personality font; relies on weight and spacing for hierarchy

### Testing Checklist

After font changes or typography updates:

- [ ] Page titles are prominent and clearly hierarchical
- [ ] Section headings are visually distinct from body text
- [ ] Body text is easily readable (14px, 1.5 line-height)
- [ ] Meta text is visibly secondary (12px, 1 line-height)
- [ ] Truncation works correctly in tables and lists
- [ ] All text colors meet WCAG contrast minimums
- [ ] Tables maintain fixed row heights with no wrapping
- [ ] Forms display labels clearly above inputs
- [ ] Buttons and interactive elements are easily tappable

## Global Letter-Spacing

The `body` element applies `-0.01em` letter-spacing globally for a subtle optical tightening with Inter. This creates a more refined, modern appearance without being noticeable. Do not override this at the component level unless there's a documented design reason.

## Future Considerations

- Consider `font-variant-numeric: tabular-nums;` for all numeric displays to ensure alignment
- Monitor Inter font updates for metric changes
- Test new font features (e.g., variable font weights) if they become beneficial
- Maintain this document as new typography roles are added

## Resources

- [Inter Font](https://rsms.me/inter/) — Official Inter documentation
- [Google Fonts Inter](https://fonts.google.com/specimen/Inter) — Loading and variants
- [JetBrains Mono](https://www.jetbrains.com/lp/mono/) — Monospace font documentation
