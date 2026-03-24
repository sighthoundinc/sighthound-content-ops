# Sidebar Pattern Specification
Cross-reference: See `AGENTS.md` → `Layout Invariants (MUST)` for global layout and layering constraints that apply alongside this sidebar spec.

## Overview

The app uses a **global collapsible sidebar** with two stable states:
- **Expanded**: Icons + labels (240px width)
- **Collapsed**: Icons only (72px width)

This pattern applies to all navigation and sidebar components throughout the application. The spec prevents UI drift and ensures consistent user experience across pages.

---

## 1. Behavior Rules (MUST)

### 1.1 — Global State

- **Sidebar state is global**, not per-page
- **localStorage key**: `sidebar:collapsed` (boolean: `true` or `false`)
- Persists across browser sessions
- Applied on initial app load (hydrate before first render)
- No layout flicker on load (hydrate early in layout component)

**Implementation**:
```typescript
// src/hooks/useSidebarState.ts
const [collapsed, setCollapsed] = useLocalStorage('sidebar:collapsed', false);
```

### 1.2 — Layout Response

- Sidebar must **resize content, not overlay it**
- **Expanded state**: sidebar width `240px`
- **Collapsed state**: sidebar width `72px`
- Content remains in a sibling layout column and shifts naturally with sidebar width changes
- No floating drawer behavior
- Content shifts predictably with sidebar width
- Prevents layout instability and maintains readable content area

### 1.3 — Transition Timing

- **Duration**: 200ms
- **Easing**: `ease-in-out`
- Apply transitions to:
  - Sidebar width
  - Sidebar-adjacent layout changes when animated
- Do NOT animate individual items, labels, or icons
- Keep animation smooth but not distracting
- If toggle occurs while keyboard focus is inside sidebar, focus must remain predictable (preserve current focus if valid, otherwise move to sidebar toggle; never drop to page body)
- Reduced-motion requirement: when `prefers-reduced-motion` is active, disable sidebar/nav/toggle transitions (`motion-reduce:transition-none`) and update layout immediately

**CSS**:
```css
.sidebar {
  transition: width 200ms ease-in-out;
}

.content {
  transition: margin-left 200ms ease-in-out;
}
```

### 1.4 — Sticky Full-Height Shell + Scroll Partition

- Sidebar root must be viewport-anchored and full-height:
  - `sticky`
  - `top-0`
  - `h-screen`
  - `flex flex-col`
- Sidebar root must **not** use `overflow-y-auto` (prevents header/toggle from scrolling away)
- Header/toggle row must be fixed within sidebar flow (`shrink-0`)
- Middle nav section must own vertical scrolling (`flex-1 overflow-y-auto`)
- Optional footer region should remain non-scrolling (`shrink-0`)
- Scroll persistence policy: reset nav scroll position to top on route changes for deterministic behavior
- On smaller viewport heights, nav scrolls while header/toggle remains visible and interactive

**Structure**:
```tsx
<aside className="sticky top-0 h-screen flex flex-col">
  <div className="shrink-0">Header + Toggle</div>
  <div className="flex-1 overflow-y-auto">Nav</div>
  <div className="shrink-0">Optional Footer</div>
</aside>
```

---

## 2. Navigation Item Rules (MUST)

### 2.1 — Collapsed State = Icons Only

When sidebar is collapsed:
- **No text labels** (hidden with `hidden` or `sr-only`)
- **No truncation** (icons are fixed-width)
- **No wrapping** (single icon per item)
- All navigation items must work with icons alone
- Each item must keep at least ~40–44px height click/tap target
- Icon remains centered in the full clickable row
- No icon-only dead zones: full row remains clickable

**Requirement**: Every sidebar item MUST have a recognizable icon. No text fallbacks.

### 2.2 — Tooltip on Hover (CRITICAL)

Collapsed mode requires tooltips for usability:
- **Trigger**: Mouse hover over collapsed sidebar item
- **Display**: Label tooltip on the right side of icon
- **Delay**: ~150ms (prevent tooltip spam)
- **Position**: Tooltip at item center height
- **Z-index**: Ensure tooltip renders above all content layers
- **Accessibility**: Include `aria-label` on item (screen readers don't need tooltip)
- **Keyboard**: Tooltip must also appear on focus when tabbing collapsed items

**Without tooltips, collapsed navigation is unusable.** This is non-negotiable.

**HTML Pattern**:
```tsx
<Tooltip content={label} delay={150}>
  <button aria-label={label} className="sidebar-item">
    <AppIcon name={iconName} size={20} />
  </button>
</Tooltip>
```

### 2.3 — Active State Must Remain Obvious

Active item styling must work in both collapsed and expanded states:

**Active item**:
- Background: `bg-slate-900`
- Icon color: `text-white`
- Indicator: Subtle left border or background sufficient

**Inactive item**:
- Icon color: `text-slate-400`
- Hover: `text-slate-600`
- Background: Transparent

**Important**: Do NOT rely on text visibility to indicate active state. Icons must communicate state clearly.
Focused keyboard state must be clearly visible with a non-clipped focus ring.
Hover invariants:
- Hover on non-active items must remain visually weaker than active state.
- Hover on active items must preserve active identity (no visual state swap).

### 2.4 — Icon Consistency

All icons in sidebar must follow the same visual standard:
- **Size**: 20px (or 18px, pick one globally)
- **Stroke weight**: Consistent across all icons (typically 1.5–2px for lucide-react)
- **Style**: Outline style (not solid or filled)
- **Source**: All icons from `lucide-react` via `AppIcon` in `src/lib/icons.tsx`

**No mixing icon styles** (e.g., no emoji mixed with lucide icons).

---

## 3. Toggle Control (MUST)

### Location & Design

- **Position**: Sidebar header (top-right or bottom-left of sidebar)
- **Icon**: Chevron pointing left/right indicating collapse direction
  - **Expanded**: `chevronLeft` (indicates "collapse to left")
  - **Collapsed**: `chevronRight` (indicates "expand to right")
- **Size**: Same as navigation icons (20px)
- **Behavior**: Click toggles `sidebar:collapsed` state in localStorage

**Avoid hamburger menu** (reserved for mobile).

**Code**:
```tsx
<button
  onClick={() => setCollapsed(!collapsed)}
  aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
  className="p-2 hover:bg-slate-100"
>
  <AppIcon name={collapsed ? "chevronRight" : "chevronLeft"} size={20} />
</button>
```

---

## 4. Grouping Behavior (MUST)

Sidebar items are grouped by function. Groups must remain visually separated in both states.

### Group Structure

```
Dashboard
My Tasks
---
Ideas
Blogs
Social Posts
Calendar
---
CardBoard
Resources
---
Settings
Permissions
```

### Collapsed State

- Icons remain, in same order
- **Visual separator**: Larger vertical spacing between groups (3–4 units instead of 1–2)
- Labels are hidden (shown in tooltips)
- Group identity is preserved via spacing and icon order

### Expanded State

- Icons + labels visible
- Optional group headers (e.g., "CONTENT" label above Ideas/Blogs)
- Divider lines between groups
- Spacing consistent with collapsed state

**No rearrangement or reordering between states.**

---

## 5. Dimensions & Spacing (MUST)

### Sidebar Width

- **Expanded**: `240px` (includes padding and icons)
- **Collapsed**: `72px` (centered icons)

### Icon Positioning (Collapsed)

- Icon horizontally **centered** in 72px width
- Do NOT left-align icons in collapsed state
- Calculation: `(72px - 20px) / 2 = 26px` left padding

**Code**:
```tsx
<div className={collapsed ? "flex justify-center" : "px-4"}>
  <AppIcon name={iconName} size={20} />
</div>
```

### Padding & Spacing (Expanded)

- **Horizontal padding**: 12–16px (symmetrical)
- **Vertical padding per item**: 12px (comfortable height ~44px min)
- **Group spacing**: 8–12px between groups
- **Item spacing**: 4px between items

### Item Height

- **Minimum height**: 44px (touch-friendly)
- **Consistent across all items** (no variable heights)
- Icon + label aligned vertically in center

---

## 6. Label Styling (Expanded State Only) (MUST)

When sidebar is expanded, labels must follow consistent typography:

- **Font size**: `text-sm` (14px)
- **Font weight**: `font-medium` (500)
- **Color (inactive)**: `text-slate-700`
- **Color (active)**: `text-slate-900`
- **Truncation**: Single-line with ellipsis (no wrapping)

**Code**:
```tsx
<span className="text-sm font-medium text-slate-700 truncate">
  {label}
</span>
```

---

## 7. Edge Cases (MUST)

### Tooltip Overflow Prevention

- Tooltips must NOT be clipped by container edges
- Render tooltips via portal to `document.body` to escape overflow contexts
- Use a dedicated high layer (`z-[220]`) above drawers and modals
- Position calculation must account for viewport edges
- Test on small screens (tooltips should not break layout)

### Long Labels

In expanded mode:
- Labels longer than ~20 characters must truncate
- Use `truncate` class (single-line ellipsis)
- Full label available via `title` attribute for tooltip on hover

### Mobile Behavior (Future)

- On mobile (< 768px), sidebar collapses into overlay drawer
- Drawer pattern is separate from desktop collapse pattern
- Document this separately when mobile is added

---

## 8. Performance Considerations (SHOULD)

### Avoid Common Pitfalls

- **Do NOT** re-render entire layout on toggle
  - Use CSS transitions only
  - Use context or useState locally in sidebar component
- **Do NOT** cause layout thrashing
  - Batch DOM updates
  - Avoid measuring/writing in loops
- **Do NOT** flicker on page load
  - Hydrate sidebar state before initial render
  - Use early script or layout effect

### Optimization Patterns

```tsx
// Avoid: Re-renders entire page
function App() {
  const [collapsed, setCollapsed] = useState(false);
  return <Layout collapsed={collapsed} />;
}

// Prefer: Isolate sidebar state
function App() {
  return (
    <SidebarStateProvider>
      <Layout />
    </SidebarStateProvider>
  );
}
```

---

## 9. Naming Conventions (MUST)

Use consistent names across all sidebar code:

- **Component**: `Sidebar`
- **Item**: `SidebarItem` or `SidebarLink`
- **Toggle**: `SidebarToggle`
- **Group**: `SidebarGroup`
- **Context/Hook**: `useSidebarState`

**Avoid mixing**:
- ~~drawer~~, ~~nav~~, ~~menu~~, ~~navigation~~
- Use **Sidebar** consistently

---

## 10. Testing & Validation (MUST)

Before shipping changes to sidebar:

1. **Functional tests**:
   - Toggle collapsed/expanded
   - Verify localStorage persistence
   - Load page with `sidebar:collapsed = true` → sidebar starts collapsed
   - Load page with `sidebar:collapsed = false` → sidebar starts expanded

2. **Visual tests**:
   - All icons render correctly in collapsed state
   - Tooltips appear on hover (collapsed)
   - Content margin adjusts correctly
   - No layout shift or flicker on toggle
   - With reduced-motion enabled, toggle/navigation update instantly without animated width transitions

3. **Accessibility tests**:
   - `aria-label` on all items
   - Keyboard navigation (tab through items)
   - Screen reader announces item labels and active state
   - Toggle button is keyboard accessible

4. **Edge case tests**:
   - Very long labels (> 30 chars) truncate properly
   - Tooltips don't get cut off at screen edges
   - Long sidebar content: only nav region scrolls; header/toggle remains visible
   - Route change behavior: nav scroll resets to top consistently (no random jumps)
   - Small viewport height: sidebar remains sticky and toggle remains reachable
   - Mobile screen resize from desktop → drawer behavior
   - Multiple tabs with same site → sidebar state syncs

---

## 11. Icon Mapping & Recognition (CRITICAL)

Each sidebar item MUST have an icon users recognize immediately. Poor icon choices break collapsed state usability.

### Required Icons (by item)

| Item | Icon | Reasoning |
|------|------|-----------|
| Dashboard | `LayoutDashboard` | Dashboard grid pattern |
| My Tasks | `CheckSquare` or `ListTodo` | Task/checklist |
| Ideas | `Lightbulb` | Ideation/concept |
| Blogs | `BookOpen` or `Newspaper` | Written content |
| Social Posts | `Share2` or `MessageSquare` | Social sharing |
| Calendar | `Calendar` | Date/time |
| CardBoard | `Kanban` or `Grid` | Board view |
| Resources | `BookMarked` or `HelpCircle` | Documentation/help |
| Settings | `Settings` or `Sliders` | Configuration |
| Permissions | `Lock` or `Users` | Access control |

**Validation**: Test collapsed sidebar with a fresh user. If they can't identify items by icon alone, choose better icons.

---

## 12. Documentation & Maintenance (MUST)

After implementing sidebar changes:

1. **Update in AGENTS.md**:
   - Add sidebar pattern reference
   - Link to this document
   
2. **Update in HOW_TO_USE_APP.md**:
   - Document sidebar collapse/expand for users
   - Explain group organization

3. **Add to component storybook** (if applicable):
   - Sidebar in expanded state
   - Sidebar in collapsed state
   - Interactive toggle demo

4. **Add to OPERATIONS.md**:
   - How to change sidebar layout (add/remove items)
   - How to change group order
   - How to update icon mappings

---

## Implementation Checklist

- [ ] Create `useSidebarState()` hook with localStorage persistence
- [ ] Create `Sidebar` component with expanded/collapsed states
- [ ] Create `SidebarItem` component with icons + optional labels
- [ ] Create `SidebarToggle` button with chevron icon
- [ ] Implement tooltips on hover (collapsed state)
- [ ] Update layout to respond to sidebar width (margin-left adjustment)
- [ ] Add CSS transitions (200ms ease-in-out)
- [ ] Test all items render in collapsed state
- [ ] Test localStorage persistence across page reloads
- [ ] Test no layout flicker on initial load
- [ ] Verify active state styling in both states
- [ ] Audit all icon choices for recognition
- [ ] Add accessibility attributes (aria-label, aria-current)
- [ ] Update documentation (AGENTS.md, HOW_TO_USE_APP.md, OPERATIONS.md)
- [ ] Run final visual & accessibility audit

---

## Enforcement

This spec is **locked**. Any changes to sidebar behavior, styling, or interaction must:

1. Reference this document
2. Update the checklist above
3. Pass all validation tests
4. Update all three documentation files (AGENTS.md, HOW_TO_USE_APP.md, OPERATIONS.md)

**Risk level**: Medium (UI-only, affects layout and navigation consistency)

**Owner**: Design + Frontend
