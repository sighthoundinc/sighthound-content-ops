"use client";

// Lazy wrappers for the three layout-level chrome components that are
// interaction-gated (no visible UI on first paint). Each is triggered by a
// keyboard shortcut or an explicit button tap, so deferring their JS past
// first paint doesn't affect perceived UX.
//
// Keeping them here (instead of inlining `next/dynamic({ ssr: false })` in
// `layout.tsx`) works around the Next constraint that `ssr: false` is only
// valid from Client Components.

import dynamic from "next/dynamic";

const CommandPalette = dynamic(
  () => import("@/components/command-palette").then((m) => m.CommandPalette),
  { ssr: false, loading: () => null }
);

const GlobalQuickCreate = dynamic(
  () =>
    import("@/components/global-quick-create").then((m) => m.GlobalQuickCreate),
  { ssr: false, loading: () => null }
);

const AIFloatingAssistant = dynamic(
  () =>
    import("@/components/ai/ai-floating-assistant").then(
      (m) => m.AIFloatingAssistant
    ),
  { ssr: false, loading: () => null }
);

export function AppChromeLazy() {
  return (
    <>
      <CommandPalette />
      <GlobalQuickCreate />
      <AIFloatingAssistant />
    </>
  );
}
