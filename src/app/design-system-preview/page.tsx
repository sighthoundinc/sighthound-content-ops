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
