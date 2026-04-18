"use client";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useSortable } from "@dnd-kit/sortable";
import { cn } from "@/lib/utils";

export type ColumnItem = {
  id: string;
  label: string;
  isVisible: boolean;
};

export type ColumnEditorProps<T extends ColumnItem = ColumnItem> = {
  columns: T[];
  onReorder: (columns: T[]) => void;
  onToggleVisibility: (columnId: string) => void;
  minVisibleColumns?: number;
  gridCols?: string;
  emptyMessage?: string;
};

function SortableColumnItem({
  id,
  label,
  isVisible,
  onToggle,
  canHide,
}: {
  id: string;
  label: string;
  isVisible: boolean;
  onToggle: () => void;
  canHide: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "inline-flex items-center justify-between gap-2 rounded border px-2 py-1.5 text-xs transition",
        isDragging
          ? "border-brand bg-blurple-50 shadow-md"
          : isVisible
            ? "border-[color:var(--sh-gray-200)] bg-white text-navy-500 hover:border-blurple-300 hover:bg-blurple-50 hover:shadow-sm"
            : "border-[color:var(--sh-gray-200)] bg-[color:var(--sh-gray)] text-navy-500 hover:border-[color:var(--sh-gray-200)] hover:bg-white"
      )}
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          className={cn(
            "cursor-grab transition active:cursor-grabbing",
            isVisible ? "text-navy-500/60 hover:text-navy-500" : "text-[color:var(--sh-gray-400)] hover:text-navy-500/60"
          )}
          {...listeners}
          {...attributes}
          title="Drag to reorder"
          aria-label={`Drag ${label} to reorder`}
        >
          ≡
        </button>

        <label className="inline-flex items-center gap-1.5">
          <input
            type="checkbox"
            checked={isVisible}
            disabled={!canHide}
            onChange={onToggle}
            className={cn("cursor-pointer", !canHide && "opacity-50")}
            title={canHide ? (isVisible ? "Hide column" : "Show column") : "At least one column must stay visible"}
          />
          <span
            className={cn(
              "font-medium transition",
              isVisible ? "text-navy-500" : "text-navy-500/60"
            )}
          >
            {label}
          </span>
          {!isVisible ? (
            <span className="rounded-full bg-[color:var(--sh-gray-200)] px-1.5 py-0.5 text-[10px] font-medium text-navy-500">
              Hidden
            </span>
          ) : null}
        </label>
      </div>
    </div>
  );
}

export function ColumnEditor<T extends ColumnItem = ColumnItem>({
  columns,
  onReorder,
  onToggleVisibility,
  minVisibleColumns = 1,
  gridCols = "md:grid-cols-2",
  emptyMessage = "No columns available.",
}: ColumnEditorProps<T>) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const visibleCount = columns.filter((col) => col.isVisible).length;

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = columns.findIndex((col) => col.id === active.id);
      const newIndex = columns.findIndex((col) => col.id === over.id);

      const newOrder = arrayMove([...columns], oldIndex, newIndex);
      onReorder(newOrder);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={columns.map((col) => col.id)}
        strategy={verticalListSortingStrategy}
      >
        {columns.length === 0 ? (
          <p className="text-xs text-navy-500">{emptyMessage}</p>
        ) : (
          <div className={cn("grid gap-2", gridCols)}>
            {columns.map((column) => (
              <SortableColumnItem
                key={column.id}
                id={column.id}
                label={column.label}
                isVisible={column.isVisible}
                onToggle={() => onToggleVisibility(column.id)}
                canHide={visibleCount > minVisibleColumns || !column.isVisible}
              />
            ))}
          </div>
        )}
      </SortableContext>
    </DndContext>
  );
}
