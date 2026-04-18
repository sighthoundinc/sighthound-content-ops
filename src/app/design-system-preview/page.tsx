/**
 * Sighthound Content Relay — design-system Phase 1 smoke-test route.
 *
 * Goal: confirm new tokens resolve correctly. No component imports from
 * src/lib/typography.ts, src/lib/status.ts, or src/components/* per
 * Phase 1 scope rules.
 *
 * Visit: /design-system-preview
 */

import Image from "next/image";
import type { CSSProperties } from "react";

import { Button } from "@/components/button";
import {
  DetailDrawerBody,
  DetailDrawerField,
  DetailDrawerFooter,
  DetailDrawerHeader,
  DetailDrawerQuickAction,
  DetailDrawerSection,
} from "@/components/detail-drawer";
import {
  DetailSkeleton,
  Skeleton,
  TableSkeleton,
  TableSkeletonRow,
} from "@/components/skeleton";
import { Tooltip } from "@/components/tooltip";

export const metadata = {
  title: "Design System Preview · Sighthound Content Relay",
  description: "Phase 1 smoke test for Sighthound Content Relay tokens",
};

type Swatch = {
  name: string;
  value: string;
  cssVar: string;
  textOn?: "light" | "dark";
};

const BLURPLE: Swatch[] = [
  { name: "Blurple 50", value: "#eef1fc", cssVar: "--sh-blurple-50", textOn: "dark" },
  { name: "Blurple 100", value: "#dee2f8", cssVar: "--sh-blurple-100", textOn: "dark" },
  { name: "Blurple 300", value: "#8792e8", cssVar: "--sh-blurple-300", textOn: "light" },
  { name: "Blurple (brand)", value: "#4f60dc", cssVar: "--sh-blurple", textOn: "light" },
  { name: "Blurple 700", value: "#3d4bc2", cssVar: "--sh-blurple-700", textOn: "light" },
  { name: "Blurple 800", value: "#2e3ba4", cssVar: "--sh-blurple-800", textOn: "light" },
];

const NAVY_GRAY: Swatch[] = [
  { name: "Navy (ink)", value: "#1a1d38", cssVar: "--sh-navy", textOn: "light" },
  { name: "Navy 700", value: "#2a2e56", cssVar: "--sh-navy-700", textOn: "light" },
  { name: "Navy 500", value: "#4b4f73", cssVar: "--sh-navy-500", textOn: "light" },
  { name: "Gray 600", value: "#64708a", cssVar: "--sh-gray-600", textOn: "light" },
  { name: "Gray 400", value: "#9aa3b2", cssVar: "--sh-gray-400", textOn: "light" },
  { name: "Gray 200", value: "#d9dfe6", cssVar: "--sh-gray-200", textOn: "dark" },
  { name: "Gray (surface)", value: "#eff3f7", cssVar: "--sh-gray", textOn: "dark" },
  { name: "White", value: "#ffffff", cssVar: "--sh-white", textOn: "dark" },
];

const ACCENT: Swatch[] = [
  { name: "Orange Light", value: "#f99f25", cssVar: "--sh-orange-light", textOn: "dark" },
  { name: "Orange Medium", value: "#f05d22", cssVar: "--sh-orange-medium", textOn: "light" },
  { name: "Orange Red", value: "#f62470", cssVar: "--sh-orange-red", textOn: "light" },
];

const GRADIENTS: { name: string; cssVar: string }[] = [
  { name: "Brand (Blurple → Red-Orange)", cssVar: "--sh-gradient-brand" },
  { name: "Warm (Light → Medium → Red)", cssVar: "--sh-gradient-warm" },
  { name: "Cool (Navy → Blurple)", cssVar: "--sh-gradient-cool" },
  { name: "Surface (Gray → White)", cssVar: "--sh-gradient-surface" },
];

const SHADOWS: { name: string; value: string; cssVar: string }[] = [
  { name: "xs", value: "0 1px 2px rgba(26,29,56,.06)", cssVar: "shadow-xs" },
  { name: "sm", value: "0 2px 6px rgba(26,29,56,.08)", cssVar: "shadow-sm" },
  { name: "md", value: "0 8px 20px rgba(26,29,56,.10)", cssVar: "shadow-md" },
  { name: "lg", value: "0 20px 40px rgba(26,29,56,.14)", cssVar: "shadow-lg" },
];

function SwatchCard({ s }: { s: Swatch }) {
  return (
    <div
      className="flex h-28 flex-col justify-between rounded-lg p-3 text-xs"
      style={{
        background: `var(${s.cssVar})`,
        color: s.textOn === "dark" ? "var(--sh-navy)" : "var(--sh-white)",
      }}
    >
      <div style={{ fontWeight: 500 }}>{s.name}</div>
      <div style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: 11, opacity: 0.85 }}>
        {s.value}
        <br />
        var({s.cssVar})
      </div>
    </div>
  );
}

function GradientCard({ name, cssVar }: { name: string; cssVar: string }) {
  return (
    <div
      className="flex h-28 flex-col justify-between rounded-lg p-3 text-xs text-white"
      style={{ background: `var(${cssVar})` }}
    >
      <div style={{ fontWeight: 500 }}>{name}</div>
      <div style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: 11, opacity: 0.9 }}>
        var({cssVar})
      </div>
    </div>
  );
}

function ShadowCard({ name, value }: { name: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="h-20 w-28 rounded-lg bg-white"
        style={{ boxShadow: value, border: "1px solid var(--sh-gray-200)" }}
      />
      <div style={{ fontSize: 12, color: "var(--sh-navy-500)" }}>
        <strong style={{ color: "var(--sh-navy)" }}>{name}</strong> · {value}
      </div>
    </div>
  );
}

/** Phase-1 button variants using the new radii tokens. Self-contained; not a shared primitive yet. */
function PreviewButton({
  children,
  variant = "primary",
  size = "cta",
}: {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "tertiary";
  size?: "cta" | "compact";
}) {
  const pad = size === "cta" ? "14px 29px" : "8px 14px";
  const radius =
    size === "cta" ? "var(--radius-button-cta)" : "var(--radius-button-compact)";
  const fontSize = size === "cta" ? 16 : 14;

  const base: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    fontFamily: "var(--font-lexend-sans)",
    fontWeight: 300,
    fontSize,
    lineHeight: 1,
    padding: pad,
    borderRadius: radius,
    border: "1px solid transparent",
    cursor: "pointer",
    transition: "all 200ms cubic-bezier(0.2,0,0.2,1)",
    whiteSpace: "nowrap",
  };

  if (variant === "primary") {
    return (
      <button
        style={{
          ...base,
          background: "var(--color-brand)",
          color: "var(--sh-white)",
        }}
      >
        {children}
      </button>
    );
  }
  if (variant === "secondary") {
    return (
      <button
        style={{
          ...base,
          background: "var(--color-surface)",
          color: "var(--color-ink)",
          borderColor: "var(--color-ink)",
        }}
      >
        {children}
      </button>
    );
  }
  return (
    <button
      style={{
        ...base,
        background: "transparent",
        color: "var(--color-brand)",
      }}
    >
      {children}
    </button>
  );
}

export default function DesignSystemPreviewPage() {
  return (
    <main
      style={{
        background: "var(--sh-white)",
        color: "var(--color-ink)",
        fontFamily: "var(--font-lexend-sans)",
        minHeight: "100vh",
      }}
    >
      <div className="mx-auto max-w-5xl px-8 py-16">
        <header className="mb-12">
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "var(--sh-navy-500)",
              marginBottom: 8,
            }}
          >
            Phase 1 Smoke Test
          </div>
          <h1
            style={{
              fontFamily: "var(--font-lexend-sans)",
              fontWeight: 500,
              fontSize: 46,
              lineHeight: 1.2,
              letterSpacing: "-0.01em",
              margin: 0,
            }}
          >
            Sighthound Content Relay
          </h1>
          <p
            style={{
              marginTop: 12,
              fontSize: 16,
              lineHeight: 1.5,
              color: "var(--sh-navy-500)",
              maxWidth: 640,
            }}
          >
            Live token-sanity check for Phase 1. Renders the Lexend ramp, the
            full brand palette from <code>design-system/colors_and_type.css</code>,
            both button-radius variants, and the navy-tinted shadow ramp.
          </p>
        </header>

        {/* ---- Logos ---- */}
        <section className="mb-14">
          <SectionTitle>Logos (public/brand)</SectionTitle>
          <div className="flex flex-wrap items-center gap-10">
            <Image
              src="/brand/sighthound-logo-horizontal.jpg"
              alt="Sighthound horizontal logo"
              width={240}
              height={60}
              style={{ height: 48, width: "auto" }}
              unoptimized
            />
            <div
              style={{
                background: "var(--sh-navy)",
                padding: "12px 18px",
                borderRadius: 12,
              }}
            >
              <Image
                src="/brand/sighthound-logo-white.png"
                alt="Sighthound white logo on navy"
                width={220}
                height={48}
                style={{ height: 40, width: "auto" }}
                unoptimized
              />
            </div>
            <Image
              src="/brand/redactor-logo-horizontal.webp"
              alt="Redactor horizontal logo"
              width={200}
              height={44}
              style={{ height: 36, width: "auto" }}
              unoptimized
            />
          </div>
        </section>

        {/* ---- Type ramp ---- */}
        <section className="mb-14">
          <SectionTitle>Type ramp — Lexend</SectionTitle>
          <div
            style={{
              border: "1px solid var(--sh-gray-200)",
              borderRadius: 12,
              padding: 28,
              display: "grid",
              gap: 20,
            }}
          >
            <div>
              <Tag>H1 · 46 / 1.2 · medium</Tag>
              <div style={{ fontSize: 46, fontWeight: 500, lineHeight: 1.2, letterSpacing: "-0.01em" }}>
                Turning sight into insight.
              </div>
            </div>
            <div>
              <Tag>H2 · 32 / 1.33 · light</Tag>
              <div style={{ fontSize: 32, fontWeight: 300, lineHeight: 1.33 }}>
                State-of-the-art deep learning from the Sighthound CV lab.
              </div>
            </div>
            <div>
              <Tag>H3 · 18 / 1.5 · light</Tag>
              <div style={{ fontSize: 18, fontWeight: 300, lineHeight: 1.5 }}>
                Vehicle &amp; pedestrian insights, made easy.
              </div>
            </div>
            <div>
              <Tag>H4 · 16 semibold · ALL CAPS · tracking 0.06em</Tag>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  lineHeight: 1.5,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                Section Label
              </div>
            </div>
            <div>
              <Tag>Body · 14px · 400 (app density, intentional deviation)</Tag>
              <div style={{ fontSize: 14, fontWeight: 400, lineHeight: 1.5, color: "var(--sh-navy)" }}>
                Cut costs by 93%. Up to 160 FPS on GPU. Over 2,800 customers and partners.
                This body is kept at 14/400 in the app to preserve table density; marketing
                surfaces may use the full 16/300 spec.
              </div>
            </div>
            <div>
              <Tag>Meta · 12px · 400 · navy-500</Tag>
              <div style={{ fontSize: 12, fontWeight: 400, lineHeight: 1.4, color: "var(--sh-navy-500)" }}>
                Secondary meta text — timestamps, captions, system hints.
              </div>
            </div>
            <div>
              <Tag>Monospace · JetBrains Mono</Tag>
              <div style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: 13, color: "var(--sh-navy)" }}>
                POST /api/social-posts/[id]/transition → 200 OK
              </div>
            </div>
          </div>
        </section>

        {/* ---- Color swatches ---- */}
        <section className="mb-14">
          <SectionTitle>Blurple scale</SectionTitle>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
            {BLURPLE.map((s) => (
              <SwatchCard key={s.cssVar} s={s} />
            ))}
          </div>
        </section>

        <section className="mb-14">
          <SectionTitle>Navy &amp; Gray</SectionTitle>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {NAVY_GRAY.map((s) => (
              <SwatchCard key={s.cssVar} s={s} />
            ))}
          </div>
        </section>

        <section className="mb-14">
          <SectionTitle>Accents (capped at ~10% of a composition)</SectionTitle>
          <div className="grid grid-cols-3 gap-3">
            {ACCENT.map((s) => (
              <SwatchCard key={s.cssVar} s={s} />
            ))}
          </div>
        </section>

        <section className="mb-14">
          <SectionTitle>Gradients</SectionTitle>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {GRADIENTS.map((g) => (
              <GradientCard key={g.cssVar} name={g.name} cssVar={g.cssVar} />
            ))}
          </div>
        </section>

        {/* ---- Buttons ---- */}
        <section className="mb-14">
          <SectionTitle>
            Buttons — split radius (CTA 20px + compact 8px)
          </SectionTitle>
          <div style={{ display: "grid", gap: 24 }}>
            <div>
              <Tag>CTA · rounded-button-cta (20px) · Lexend Light 16</Tag>
              <div className="flex flex-wrap items-center gap-3">
                <PreviewButton>Talk to our team</PreviewButton>
                <PreviewButton variant="secondary">Watch demo</PreviewButton>
                <PreviewButton variant="tertiary">Learn more →</PreviewButton>
              </div>
            </div>
            <div>
              <Tag>Compact · rounded-button-compact (8px) · Lexend Light 14</Tag>
              <div className="flex flex-wrap items-center gap-3">
                <PreviewButton size="compact">Apply</PreviewButton>
                <PreviewButton size="compact" variant="secondary">
                  Cancel
                </PreviewButton>
                <PreviewButton size="compact" variant="tertiary">
                  Reset filters
                </PreviewButton>
              </div>
            </div>
            <div>
              <Tag>Tailwind utilities generated by @theme inline</Tag>
              <div className="flex flex-wrap items-center gap-3">
                <button className="bg-brand text-surface rounded-button-cta px-7 py-3 font-light">
                  bg-brand · rounded-button-cta
                </button>
                <button className="text-ink border-ink rounded-button-compact border bg-surface px-4 py-2 text-sm font-light">
                  text-ink · rounded-button-compact
                </button>
                <button className="text-brand rounded-button-compact bg-white px-4 py-2 text-sm font-light">
                  text-brand
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ---- Shadows ---- */}
        <section className="mb-14">
          <SectionTitle>Shadow ramp (navy-tinted)</SectionTitle>
          <div className="flex flex-wrap gap-8">
            {SHADOWS.map((sh) => (
              <ShadowCard key={sh.cssVar} name={sh.name} value={sh.value} />
            ))}
          </div>
        </section>

        {/* ---- Phase 3: shared <Button> primitive ---- */}
        <section className="mb-14">
          <SectionTitle>
            Phase 3 — shared <code>&lt;Button&gt;</code> primitive
          </SectionTitle>
          <div className="grid gap-6">
            <div>
              <Tag>size=&quot;cta&quot; · rounded-button-cta (20px) · Lexend Light 16</Tag>
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="primary" size="cta">Talk to our team</Button>
                <Button variant="secondary" size="cta">Watch demo</Button>
                <Button variant="destructive" size="cta">Delete account</Button>
                <Button variant="ghost" size="cta">Learn more</Button>
              </div>
            </div>
            <div>
              <Tag>size=&quot;md&quot; · rounded-button-compact (8px)</Tag>
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="primary" size="md">Save</Button>
                <Button variant="secondary" size="md">Cancel</Button>
                <Button variant="destructive" size="md">Delete</Button>
                <Button variant="ghost" size="md">Skip</Button>
              </div>
            </div>
            <div>
              <Tag>size=&quot;sm&quot; (default) · rounded-button-compact (8px)</Tag>
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="primary">Apply</Button>
                <Button variant="secondary">Reset</Button>
                <Button variant="ghost">Dismiss</Button>
              </div>
            </div>
            <div>
              <Tag>size=&quot;xs&quot; + icon size · rounded-button-compact (8px)</Tag>
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="primary" size="xs">
                  xs primary
                </Button>
                <Button variant="secondary" size="xs">
                  xs secondary
                </Button>
                <Button variant="icon" size="icon" aria-label="More options">
                  ⋯
                </Button>
              </div>
            </div>
            <div>
              <Tag>disabled state (any variant)</Tag>
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="primary" disabled>
                  Primary disabled
                </Button>
                <Button variant="secondary" disabled>
                  Secondary disabled
                </Button>
                <Button variant="destructive" disabled>
                  Destructive disabled
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* ---- Phase 3.6: confirmation modal primitive ---- */}
        <section className="mb-14">
          <SectionTitle>
            Phase 3.6 — confirmation modal primitive
          </SectionTitle>
          <p
            style={{
              fontSize: 13,
              color: "var(--sh-navy-500)",
              marginBottom: 12,
              maxWidth: 640,
            }}
          >
            The shared <code>&lt;ConfirmationModal&gt;</code> uses
            <code>bg-surface</code> + <code>--sh-gray-200</code> border +
            <code>shadow-brand-lg</code>. Default-tone icon badge migrated to
            <code>bg-blurple-100</code> / <code>text-blurple-700</code> (Strategy
            B sweep). Danger tone keeps the semantic <code>rose-100 / rose-700</code>.
            Backdrop is <code>bg-ink/40</code>. Inline snapshots below show
            both tones without the fixed-position overlay.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            {/* Default tone */}
            <div className="relative w-full max-w-md rounded-xl border border-[color:var(--sh-gray-200)] bg-surface p-4 shadow-brand-lg">
              <div className="flex items-start gap-3">
                <span className="bg-blurple-100 text-blurple-700 mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full text-sm">
                  ?
                </span>
                <div>
                  <h3 className="text-ink text-base font-semibold">
                    Submit for editorial review?
                  </h3>
                  <p className="text-navy-500 mt-1 text-sm">
                    The brief will be locked once submitted. Ali will be notified.
                  </p>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-end gap-2">
                <Button variant="secondary" size="md">
                  Cancel
                </Button>
                <Button variant="primary" size="md">
                  Submit
                </Button>
              </div>
            </div>

            {/* Danger tone */}
            <div className="relative w-full max-w-md rounded-xl border border-[color:var(--sh-gray-200)] bg-surface p-4 shadow-brand-lg">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-rose-100 text-sm text-rose-700">
                  !
                </span>
                <div>
                  <h3 className="text-ink text-base font-semibold">
                    Delete this blog?
                  </h3>
                  <p className="text-navy-500 mt-1 text-sm">
                    This action cannot be undone. All comments and history will
                    also be removed.
                  </p>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-end gap-2">
                <Button variant="secondary" size="md">
                  Cancel
                </Button>
                <Button variant="destructive" size="md">
                  Delete
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* ---- Phase 3.5: detail drawer primitive ---- */}
        <section className="mb-14">
          <SectionTitle>
            Phase 3.5 — detail drawer primitive
          </SectionTitle>
          <p
            style={{
              fontSize: 13,
              color: "var(--sh-navy-500)",
              marginBottom: 12,
              maxWidth: 640,
            }}
          >
            The drawer surface (panel, header, footer, sections, fields, quick
            actions) now runs on <code>bg-surface</code>, <code>text-ink</code>,
            <code>text-navy-500</code>, <code>--sh-gray-200</code> borders, and
            the navy-tinted <code>shadow-brand-lg</code>. The overlay backdrop
            uses <code>bg-ink/25</code>. Below is an inline static render of
            the drawer primitives — not the full fixed-position overlay.
          </p>
          <div
            className="max-w-md overflow-hidden rounded-lg border border-[color:var(--sh-gray-200)] bg-surface shadow-brand-lg"
          >
            <DetailDrawerHeader
              label="Details"
              title="Cut costs by 93%"
              subtitle="Blog post scheduled for April 22"
              onClose={() => {}}
            />
            <DetailDrawerBody className="flex flex-col gap-3">
              <DetailDrawerSection title="Brief" itemCount={3}>
                <div className="grid gap-3">
                  <DetailDrawerField label="Writer" value="Hari Ajmal" />
                  <DetailDrawerField label="Publisher" value="Ali Sohail" />
                  <DetailDrawerField
                    label="Scheduled publish"
                    value="Apr 22, 2026"
                  />
                </div>
              </DetailDrawerSection>
              <DetailDrawerSection title="Links" collapsible>
                <div className="grid gap-2">
                  <DetailDrawerQuickAction
                    label="Open Google Doc"
                    href="https://docs.google.com/"
                  />
                  <DetailDrawerQuickAction
                    label="Open Live URL"
                    href="https://www.sighthound.com/blog/"
                  />
                  <DetailDrawerQuickAction
                    label="Open Redactor doc"
                    disabled
                    disabledReason="Requires admin permission"
                  />
                </div>
              </DetailDrawerSection>
            </DetailDrawerBody>
            <DetailDrawerFooter>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-navy-500">Updated 2m ago</span>
                <Button variant="primary" size="sm">
                  Save
                </Button>
              </div>
            </DetailDrawerFooter>
          </div>
        </section>

        {/* ---- Phase 3.4: skeleton primitives ---- */}
        <section className="mb-14">
          <SectionTitle>
            Phase 3.4 — skeleton primitives
          </SectionTitle>
          <p
            style={{
              fontSize: 13,
              color: "var(--sh-navy-500)",
              marginBottom: 12,
              maxWidth: 640,
            }}
          >
            Skeletons now use <code>--sh-gray-200</code> as the base tone with
            a white shimmer highlight. Exported surfaces are the primitive
            <code>&lt;Skeleton&gt;</code>, plus the composed
            <code>&lt;TableSkeletonRow&gt;</code>, <code>&lt;TableSkeleton&gt;</code>,
            and <code>&lt;DetailSkeleton&gt;</code>. The shimmer is disabled
            when <code>prefers-reduced-motion</code> is set.
          </p>
          <div className="grid gap-8">
            <div>
              <Tag>&lt;Skeleton&gt; — raw bars</Tag>
              <div className="flex max-w-md flex-col gap-2">
                <Skeleton className="h-7 w-3/5" />
                <Skeleton className="h-4 w-11/12" />
                <Skeleton className="h-4 w-10/12" />
                <Skeleton className="h-4 w-9/12" />
              </div>
            </div>
            <div>
              <Tag>&lt;TableSkeletonRow&gt; — single-row placeholder</Tag>
              <div className="rounded-button-compact overflow-hidden border border-[color:var(--sh-gray-200)]">
                <TableSkeletonRow columns={[1, 2, 1, 1]} />
              </div>
            </div>
            <div>
              <Tag>&lt;TableSkeleton&gt; — 6-row table placeholder</Tag>
              <div className="rounded-button-compact overflow-hidden border border-[color:var(--sh-gray-200)]">
                <TableSkeleton rows={6} columns={[2, 1, 1, 1]} />
              </div>
            </div>
            <div>
              <Tag>&lt;DetailSkeleton&gt; — drawer / detail placeholder</Tag>
              <div className="rounded-button-compact max-w-xl border border-[color:var(--sh-gray-200)] bg-surface">
                <DetailSkeleton />
              </div>
            </div>
          </div>
        </section>

        {/* ---- Phase 3.3: tooltip primitives ---- */}
        <section className="mb-14">
          <SectionTitle>
            Phase 3.3 — tooltip primitives
          </SectionTitle>
          <p
            style={{
              fontSize: 13,
              color: "var(--sh-navy-500)",
              marginBottom: 12,
              maxWidth: 640,
            }}
          >
            Two tooltip surfaces are used across the app. Both migrated to
            Sighthound navy ink + white text + <code>shadow-brand-md</code>
            (navy-tinted). The CSS-only pattern is for simple inline hints;
            the <code>&lt;Tooltip&gt;</code> portal component is for anywhere
            overflow/clip would swallow a plain hover bubble.
          </p>
          <div className="grid gap-6">
            <div>
              <Tag>CSS-only (.tooltip-container / .tooltip-bubble)</Tag>
              <div className="flex flex-wrap items-center gap-6">
                <span className="tooltip-container cursor-help text-sm text-ink underline decoration-dotted underline-offset-4">
                  Hover me (CSS tooltip)
                  <span className="tooltip-bubble">Turning sight into insight.</span>
                </span>
                <span className="tooltip-container cursor-help text-sm text-ink underline decoration-dotted underline-offset-4">
                  Vehicle detection
                  <span className="tooltip-bubble">Make, model, colour, generation.</span>
                </span>
              </div>
            </div>
            <div>
              <Tag>Portal &lt;Tooltip&gt; component</Tag>
              <div className="flex flex-wrap items-center gap-3">
                <Tooltip content="Edit brief">
                  <Button variant="secondary" size="sm">
                    Hover / focus me
                  </Button>
                </Tooltip>
                <Tooltip content="Reopen brief for editing (admin only)">
                  <Button variant="icon" size="icon" aria-label="More">
                    ⋯
                  </Button>
                </Tooltip>
                <Tooltip content="Submit for editorial review">
                  <Button variant="primary" size="sm">
                    Submit
                  </Button>
                </Tooltip>
              </div>
            </div>
          </div>
        </section>

        {/* ---- Phase 3.2: input / .focus-field primitive ---- */}
        <section className="mb-14">
          <SectionTitle>
            Phase 3.2 — input focus (<code>.focus-field</code>)
          </SectionTitle>
          <p
            style={{
              fontSize: 13,
              color: "var(--sh-navy-500)",
              marginBottom: 12,
              maxWidth: 640,
            }}
          >
            Inputs across the app are styled with Tailwind utilities at the call
            site and share the global <code>.focus-field</code> utility for
            focus-visible state. The focus border + ring + subtle background
            tint now use <code>--color-brand</code> and
            <code>--shadow-brand-focus</code>. Tab through the inputs below
            to verify the Blurple focus treatment.
          </p>
          <div className="grid max-w-2xl gap-4">
            <label className="grid gap-1">
              <span className="text-xs font-medium text-navy-500 uppercase tracking-wide">
                Text input
              </span>
              <input
                type="text"
                placeholder="Talk to our team"
                className="focus-field rounded-button-compact border border-[color:var(--sh-gray-200)] bg-surface px-3 py-2 text-sm text-ink placeholder:text-navy-500"
              />
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-medium text-navy-500 uppercase tracking-wide">
                Email input
              </span>
              <input
                type="email"
                placeholder="name@sighthound.com"
                className="focus-field rounded-button-compact border border-[color:var(--sh-gray-200)] bg-surface px-3 py-2 text-sm text-ink placeholder:text-navy-500"
              />
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-medium text-navy-500 uppercase tracking-wide">
                Textarea
              </span>
              <textarea
                rows={3}
                placeholder="Redactor gives you full control over what stays visible…"
                className="focus-field rounded-button-compact border border-[color:var(--sh-gray-200)] bg-surface px-3 py-2 text-sm text-ink placeholder:text-navy-500"
              />
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-medium text-navy-500 uppercase tracking-wide">
                Select
              </span>
              <select
                className="focus-field rounded-button-compact border border-[color:var(--sh-gray-200)] bg-surface px-3 py-2 text-sm text-ink"
                defaultValue="alpr_plus"
              >
                <option value="alpr_plus">ALPR+</option>
                <option value="redactor">Redactor</option>
                <option value="hardware">Hardware</option>
                <option value="general">General / Company</option>
              </select>
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-medium text-navy-500 uppercase tracking-wide">
                Disabled input
              </span>
              <input
                type="text"
                placeholder="Locked at ready_to_publish"
                disabled
                className="focus-field rounded-button-compact border border-[color:var(--sh-gray-200)] bg-[color:var(--sh-gray)] px-3 py-2 text-sm text-navy-500 placeholder:text-navy-500 opacity-60"
              />
            </label>
          </div>
        </section>

        {/* ---- Phase 2: Tailwind utility smoke test ---- */}
        <section className="mb-14">
          <SectionTitle>
            Phase 2 — Tailwind utilities from <code>@theme inline</code>
          </SectionTitle>
          <div className="grid gap-6">
            <div>
              <Tag>Blurple scale (bg-blurple / -50 / -100 / -300 / -700 / -800)</Tag>
              <div className="flex flex-wrap gap-2">
                <span className="bg-blurple-50 text-navy rounded-md px-3 py-1 text-xs">
                  bg-blurple-50
                </span>
                <span className="bg-blurple-100 text-navy rounded-md px-3 py-1 text-xs">
                  bg-blurple-100
                </span>
                <span className="bg-blurple-300 rounded-md px-3 py-1 text-xs text-white">
                  bg-blurple-300
                </span>
                <span className="bg-blurple rounded-md px-3 py-1 text-xs text-white">
                  bg-blurple
                </span>
                <span className="bg-blurple-700 rounded-md px-3 py-1 text-xs text-white">
                  bg-blurple-700
                </span>
                <span className="bg-blurple-800 rounded-md px-3 py-1 text-xs text-white">
                  bg-blurple-800
                </span>
              </div>
            </div>

            <div>
              <Tag>Navy ramp (text-navy / -500 / -700 + bg-navy / -700)</Tag>
              <div className="flex flex-wrap items-center gap-4">
                <span className="text-navy text-sm">text-navy</span>
                <span className="text-navy-700 text-sm">text-navy-700</span>
                <span className="text-navy-500 text-sm">text-navy-500</span>
                <span className="bg-navy rounded-md px-3 py-1 text-xs text-white">
                  bg-navy
                </span>
                <span className="bg-navy-700 rounded-md px-3 py-1 text-xs text-white">
                  bg-navy-700
                </span>
              </div>
            </div>

            <div>
              <Tag>Orange accents (bg-orange-warm / -medium / -hot)</Tag>
              <div className="flex flex-wrap gap-2">
                <span className="bg-orange-warm text-navy rounded-md px-3 py-1 text-xs">
                  bg-orange-warm
                </span>
                <span className="bg-orange-medium rounded-md px-3 py-1 text-xs text-white">
                  bg-orange-medium
                </span>
                <span className="bg-orange-hot rounded-md px-3 py-1 text-xs text-white">
                  bg-orange-hot
                </span>
              </div>
            </div>

            <div>
              <Tag>
                Shadow utilities (shadow-brand-xs / -sm / -md / -lg / -focus)
              </Tag>
              <div className="flex flex-wrap items-end gap-5">
                <div className="shadow-brand-xs rounded-lg bg-white p-3 text-xs">
                  shadow-brand-xs
                </div>
                <div className="shadow-brand-sm rounded-lg bg-white p-3 text-xs">
                  shadow-brand-sm
                </div>
                <div className="shadow-brand-md rounded-lg bg-white p-3 text-xs">
                  shadow-brand-md
                </div>
                <div className="shadow-brand-lg rounded-lg bg-white p-3 text-xs">
                  shadow-brand-lg
                </div>
                <div className="shadow-brand-focus border-brand rounded-lg border bg-white p-3 text-xs">
                  shadow-brand-focus (focus ring)
                </div>
              </div>
            </div>

            <div>
              <Tag>
                Neutral Gray consumed via raw CSS var (bg-[var(--sh-gray-200)])
              </Tag>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className="rounded-md px-3 py-1 text-xs"
                  style={{ background: "var(--sh-gray)", color: "var(--sh-navy)" }}
                >
                  --sh-gray
                </span>
                <span
                  className="rounded-md px-3 py-1 text-xs"
                  style={{ background: "var(--sh-gray-200)", color: "var(--sh-navy)" }}
                >
                  --sh-gray-200
                </span>
                <span
                  className="rounded-md px-3 py-1 text-xs"
                  style={{ background: "var(--sh-gray-400)", color: "var(--sh-white)" }}
                >
                  --sh-gray-400
                </span>
                <span
                  className="rounded-md px-3 py-1 text-xs"
                  style={{ background: "var(--sh-gray-600)", color: "var(--sh-white)" }}
                >
                  --sh-gray-600
                </span>
              </div>
            </div>
          </div>
        </section>

        <footer
          style={{
            borderTop: "1px solid var(--sh-gray-200)",
            paddingTop: 24,
            fontSize: 12,
            color: "var(--sh-navy-500)",
          }}
        >
          Route is temporary. Remove in Phase 5 cleanup or keep under
          <code style={{ margin: "0 4px" }}>/design-system-preview</code>
          as an internal token reference.
        </footer>
      </div>
    </main>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        fontSize: 18,
        fontWeight: 500,
        lineHeight: 1.5,
        margin: "0 0 14px",
        color: "var(--sh-navy)",
      }}
    >
      {children}
    </h2>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        color: "var(--sh-navy-500)",
        marginBottom: 6,
      }}
    >
      {children}
    </div>
  );
}
