// Server Component. Small muted footer strip below the auth card.
//
// Left:  Sighthound · {short-sha}
//        Mirrors the sidebar version footer so operators can sanity-check
//        which build is live before authenticating. Uses the existing
//        `NEXT_PUBLIC_GIT_COMMIT` env contract (see
//        `src/components/sidebar-version-footer.tsx`).
//
// Right: Privacy · Terms
//        Links point at the authoritative legal pages on sighthound.com and
//        open in a new tab per the Link Target Behavior rule (external
//        links always open in a new tab with safe rel attributes).

const PRIVACY_URL = "https://www.sighthound.com/privacy";
const TERMS_URL = "https://www.sighthound.com/terms";

export function LoginFooter() {
  const commit = process.env.NEXT_PUBLIC_GIT_COMMIT;
  const shortSha = commit && commit !== "unknown" ? commit.slice(0, 7) : null;

  return (
    <footer className="mt-10 flex flex-col items-center justify-between gap-2 text-[11px] font-medium text-navy-500/60 sm:flex-row">
      <p className="flex items-center gap-1.5">
        <span>Sighthound</span>
        {shortSha ? (
          <>
            <span aria-hidden>·</span>
            <span className="text-[10.5px] tabular-nums tracking-tight">
              {shortSha}
            </span>
          </>
        ) : null}
      </p>
      <nav aria-label="Legal" className="flex items-center gap-3">
        <a
          href={PRIVACY_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="transition hover:text-ink"
        >
          Privacy
        </a>
        <span aria-hidden>·</span>
        <a
          href={TERMS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="transition hover:text-ink"
        >
          Terms
        </a>
      </nav>
    </footer>
  );
}
