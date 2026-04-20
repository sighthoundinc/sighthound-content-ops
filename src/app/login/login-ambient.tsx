// Server Component. Ambient backdrop for the login page.
//
// Three layers, from back to front:
//   1. A single soft Blurple radial glow anchored behind the auth card.
//      Replaces the previous banded `from-blurple-50 via-white to-white`
//      top-down gradient — a single focal blob reads as significantly more
//      premium and keeps the composition calm.
//   2. A low-opacity SVG grain overlay. Inlined as a data URI so the
//      background commits in the same paint as the page shell (no extra
//      network request, zero CLS risk).
//   3. A thin, slow-drifting gradient "wave" motif from the brand
//      (Blurple → Red-Orange). Kept at ~6% opacity and bottom-anchored so
//      it never competes with the form. Motion is gated on
//      `prefers-reduced-motion` per the Layout Invariants in AGENTS.md.
//
// Everything here is `pointer-events-none` and `aria-hidden` — it must
// never intercept clicks or be read by assistive tech.

const NOISE_DATA_URI =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 160 160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.1 0 0 0 0 0.11 0 0 0 0 0.22 0 0 0 0.6 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>";

export function LoginAmbient() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
    >
      {/* Layer 1 — soft Blurple radial glow centered behind the composition. */}
      <div
        className="absolute left-1/2 top-1/2 h-[720px] w-[720px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blurple-100/70 blur-3xl"
      />
      <div
        className="absolute left-[68%] top-[28%] h-[320px] w-[320px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blurple-200/40 blur-3xl"
      />

      {/* Layer 2 — grain overlay. 4% opacity is enough to kill the plasticky,
          flat-white feeling without introducing a visible texture. */}
      <div
        className="absolute inset-0 opacity-[0.04] mix-blend-multiply"
        style={{
          backgroundImage: `url("${NOISE_DATA_URI}")`,
          backgroundSize: "160px 160px",
          backgroundRepeat: "repeat",
        }}
      />

      {/* Layer 3 — Content Relay wave motif. Sits along the bottom third,
          full-bleed. Motion is a slow horizontal drift; the keyframe is
          defined locally via a <style> tag so we don't need to touch
          globals.css for a login-only ornament. `motion-reduce` collapses
          the animation to 0ms and removes the transform so users with
          reduced-motion preferences see a perfectly still curve. */}
      <style>{`
        @keyframes sh-login-wave-drift {
          0%   { transform: translate3d(-2%, 0, 0); }
          50%  { transform: translate3d(2%, 0, 0); }
          100% { transform: translate3d(-2%, 0, 0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .sh-login-wave {
            animation: none !important;
            transform: none !important;
          }
        }
      `}</style>
      <svg
        className="sh-login-wave absolute inset-x-0 bottom-0 h-[42vh] w-[110%] -translate-x-[5%]"
        style={{ animation: "sh-login-wave-drift 22s ease-in-out infinite" }}
        viewBox="0 0 1600 480"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="sh-login-wave-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#4f60dc" />
            <stop offset="55%" stopColor="#7a4fdc" />
            <stop offset="100%" stopColor="#f62470" />
          </linearGradient>
        </defs>
        <path
          d="M0,320 C220,260 420,380 640,320 C860,260 1060,380 1280,320 C1440,280 1520,300 1600,300"
          stroke="url(#sh-login-wave-grad)"
          strokeWidth="1.6"
          fill="none"
          opacity="0.08"
        />
        <path
          d="M0,380 C240,340 460,420 700,380 C940,340 1140,420 1360,380 C1480,360 1540,370 1600,370"
          stroke="url(#sh-login-wave-grad)"
          strokeWidth="1.2"
          fill="none"
          opacity="0.05"
        />
      </svg>
    </div>
  );
}
