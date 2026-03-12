"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type MultiSelectOption = {
  value: string;
  label: string;
};

export function CheckboxMultiSelect({
  label,
  options,
  selectedValues,
  onChange,
}: {
  label: string;
  options: MultiSelectOption[];
  selectedValues: string[];
  onChange: (nextValues: string[]) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  const selectedSet = useMemo(() => new Set(selectedValues), [selectedValues]);
  const selectedLabels = useMemo(
    () =>
      options
        .filter((option) => selectedSet.has(option.value))
        .map((option) => option.label),
    [options, selectedSet]
  );

  const triggerText =
    selectedLabels.length === 0
      ? `All ${label}`
      : selectedLabels.length <= 2
        ? `${label}: ${selectedLabels.join(", ")}`
        : `${label}: ${selectedLabels.length} selected`;

  const toggleValue = (value: string) => {
    if (selectedSet.has(value)) {
      onChange(selectedValues.filter((nextValue) => nextValue !== value));
      return;
    }
    onChange([...selectedValues, value]);
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        className="flex w-full items-center justify-between rounded-md border border-slate-300 bg-white px-3 py-2 text-left text-sm text-slate-700"
        onClick={() => {
          setIsOpen((previous) => !previous);
        }}
      >
        <span className="truncate">{triggerText}</span>
        <span className="ml-3 text-xs text-slate-500">{isOpen ? "▲" : "▼"}</span>
      </button>

      {isOpen ? (
        <div className="absolute z-30 mt-1 w-full min-w-56 rounded-md border border-slate-200 bg-white p-2 shadow-lg">
          <div className="mb-2 flex items-center justify-between border-b border-slate-100 pb-2">
            <button
              type="button"
              className="text-xs font-medium text-slate-600 hover:text-slate-900"
              onClick={() => {
                onChange(options.map((option) => option.value));
              }}
            >
              Select all
            </button>
            <button
              type="button"
              className="text-xs font-medium text-slate-600 hover:text-slate-900"
              onClick={() => {
                onChange([]);
              }}
            >
              Clear
            </button>
          </div>
          <div className="max-h-64 space-y-1 overflow-y-auto pr-1">
            {options.map((option) => (
              <label
                key={option.value}
                className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm text-slate-700 hover:bg-slate-50"
              >
                <input
                  type="checkbox"
                  checked={selectedSet.has(option.value)}
                  onChange={() => {
                    toggleValue(option.value);
                  }}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
