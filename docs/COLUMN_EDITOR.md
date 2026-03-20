# ColumnEditor Component Documentation

## Overview

`ColumnEditor` is a globally reusable drag-and-drop column management component built with `@dnd-kit`. It provides:

- ✅ Drag-to-reorder columns
- ✅ Show/hide column toggles
- ✅ Visual feedback for hidden columns
- ✅ Accessible keyboard navigation
- ✅ Customizable grid layout
- ✅ Generic TypeScript typing for any column structure

## Installation

The component is located at:
```
src/components/column-editor.tsx
```

No additional dependencies beyond what's already in package.json (`@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`).

## Basic Usage

```tsx
import { ColumnEditor, type ColumnItem } from "@/components/column-editor";

function MyColumnsManager() {
  const [columns, setColumns] = useState<ColumnItem[]>([
    { id: "name", label: "Name", isVisible: true },
    { id: "email", label: "Email", isVisible: true },
    { id: "status", label: "Status", isVisible: false },
  ]);

  return (
    <ColumnEditor
      columns={columns}
      onReorder={(reorderedColumns) => setColumns(reorderedColumns)}
      onToggleVisibility={(columnId) => {
        setColumns((prev) =>
          prev.map((col) =>
            col.id === columnId ? { ...col, isVisible: !col.isVisible } : col
          )
        );
      }}
      minVisibleColumns={1}
    />
  );
}
```

## Advanced Usage with Generic Types

For custom column structures that extend `ColumnItem`:

```tsx
type CustomColumn = ColumnItem & {
  dataType: "string" | "number" | "date";
  sortable: boolean;
};

function MyCustomColumnsManager() {
  const [columns, setColumns] = useState<CustomColumn[]>([
    { id: "name", label: "Name", isVisible: true, dataType: "string", sortable: true },
    { id: "salary", label: "Salary", isVisible: true, dataType: "number", sortable: true },
  ]);

  return (
    <ColumnEditor<CustomColumn>
      columns={columns}
      onReorder={setColumns}
      onToggleVisibility={(columnId) => {
        setColumns((prev) =>
          prev.map((col) =>
            col.id === columnId ? { ...col, isVisible: !col.isVisible } : col
          )
        );
      }}
    />
  );
}
```

## Props

### Required

| Prop | Type | Description |
| --- | --- | --- |
| `columns` | `ColumnItem[]` | Array of columns with `id`, `label`, and `isVisible` properties |
| `onReorder` | `(columns) => void` | Callback when user drags to reorder columns |
| `onToggleVisibility` | `(columnId: string) => void` | Callback when user toggles column visibility |

### Optional

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `minVisibleColumns` | `number` | `1` | Minimum number of columns that must remain visible |
| `gridCols` | `string` | `"md:grid-cols-2"` | Tailwind grid class (e.g., `"grid-cols-1"`, `"lg:grid-cols-3"`) |
| `emptyMessage` | `string` | `"No columns available."` | Message shown when no columns exist |

## Features

### Drag-to-Reorder
- Click and drag the `≡` handle to reorder columns
- Smooth animations with visual feedback
- Keyboard support (arrow keys via `@dnd-kit`)

### Show/Hide Toggles
- Checkbox next to each column label
- Hidden columns show a gray "Hidden" badge
- Disabled state when minimum visible columns reached
- Tooltips explain the action

### Visual States
- **Visible column**: white background, blue hover tint
- **Hidden column**: light gray background, gray text
- **Dragging**: indigo highlight with shadow
- **Disabled**: opacity reduction with tooltip

### Accessibility
- ARIA labels on all interactive elements
- Keyboard navigation support
- Semantic HTML (proper `<label>` for checkboxes)
- Descriptive tooltips

## State Management Pattern

The component is a **controlled component**—it doesn't manage state internally. You must:

1. Store `columns` in parent state
2. Call `onReorder` to update column order
3. Call `onToggleVisibility` to update visibility

Example with persistence to localStorage:

```tsx
const [columns, setColumns] = useState<ColumnItem[]>(() => {
  const saved = localStorage.getItem("myColumns");
  return saved ? JSON.parse(saved) : DEFAULT_COLUMNS;
});

const handleReorder = (reorderedColumns: ColumnItem[]) => {
  setColumns(reorderedColumns);
  localStorage.setItem("myColumns", JSON.stringify(reorderedColumns));
};

const handleToggleVisibility = (columnId: string) => {
  const updated = columns.map((col) =>
    col.id === columnId ? { ...col, isVisible: !col.isVisible } : col
  );
  setColumns(updated);
  localStorage.setItem("myColumns", JSON.stringify(updated));
};

return (
  <ColumnEditor
    columns={columns}
    onReorder={handleReorder}
    onToggleVisibility={handleToggleVisibility}
  />
);
```

## Current Implementation in Dashboard

The component is already integrated in the Dashboard's Edit Columns section:
- **Location**: `src/app/dashboard/page.tsx` (Edit Columns modal)
- **Grid layout**: `"md:grid-cols-2"` (2 columns on medium+ screens)
- **Min visible**: 1 column
- **State**: Synced with `columnOrder` and `hiddenColumns` state + localStorage

## Styling & Customization

### Grid Layouts

Change layout with `gridCols` prop:

```tsx
// Single column
<ColumnEditor columns={columns} {...props} gridCols="grid-cols-1" />

// Three columns on large screens
<ColumnEditor columns={columns} {...props} gridCols="lg:grid-cols-3" />

// Responsive
<ColumnEditor columns={columns} {...props} gridCols="sm:grid-cols-2 lg:grid-cols-3" />
```

### Color Scheme

Colors are hardcoded but follow Tailwind slate/indigo palette:
- Visible: white/slate
- Hidden: slate-50/slate
- Hover: indigo tints
- Dragging: indigo-400/indigo-50

To customize colors, edit `SortableColumnItem` component in `column-editor.tsx`.

## Browser Support

Works in all modern browsers supporting:
- Pointer events
- CSS transforms
- Flexbox/Grid
- ES2020+ features

Tested on:
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

## Performance

- Uses `useSortable` hook from `@dnd-kit/sortable` (optimized for lists)
- No unnecessary re-renders when dragging
- Memoization via React hooks
- Minimal DOM manipulation

## Accessibility Checklist

- ✅ ARIA labels on drag handle and checkboxes
- ✅ Tooltips for disabled states
- ✅ Keyboard navigation (arrow keys, Tab)
- ✅ Semantic HTML structure
- ✅ Color not sole indicator of state
- ✅ Focus states visible

## Troubleshooting

### Columns not reordering
Ensure `onReorder` callback updates parent state:
```tsx
onReorder={(reordered) => setColumns(reordered)}
```

### Checkbox not toggling visibility
Ensure `onToggleVisibility` updates the `isVisible` property:
```tsx
onToggleVisibility={(id) => {
  setColumns(prev =>
    prev.map(col => col.id === id ? {...col, isVisible: !col.isVisible} : col)
  );
}}
```

### Minimum visible constraint not working
Verify `minVisibleColumns` is set correctly and the callback respects it:
```tsx
<ColumnEditor minVisibleColumns={2} {...props} />
```

## Future Enhancements

- [ ] Grouping columns by category
- [ ] Search/filter columns
- [ ] Drag-to-hide shortcut
- [ ] Preset column layouts (save/load)
- [ ] Column width customization
