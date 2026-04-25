# Upstream snapshots

Read-only mirrors of `llms.txt` and `llms-full.txt` as currently merged on
the `main` branch of the two upstream MkDocs repositories that ship
those files to production.

| Site | Upstream repo | Path |
| --- | --- | --- |
| `docs.redactor.com` | [`sighthoundinc/redactor-mkdocs`](https://github.com/sighthoundinc/redactor-mkdocs) | `docs/llms.txt`, `docs/llms-full.txt` |
| `dev.sighthound.com` | [`sighthoundinc/developer-portal-mkdocs`](https://github.com/sighthoundinc/developer-portal-mkdocs) | `docs/llms.txt`, `docs/llms-full.txt` |

## Why these exist

- Visibility: a single place inside this repo to see exactly what the
  upstream sites are serving for AI agent discovery, without needing to
  open each repo.
- Drift detection: after Brent or anyone else edits the upstream files,
  refresh and `git diff` to see what changed.
- **Not** part of the Cloudflare Worker bundle. The Worker only serves
  files under `infra/cloudflare-workers/accept-markdown/src/content/`.

## Refresh

```bash
scripts/pull-upstream-llms.sh
git status snapshots/
git --no-pager diff snapshots/
```

The script uses the `gh` CLI's auth, so no extra setup is needed if you
can already access both repos via `gh`.

## Editing rules

Do not edit files under `snapshots/` by hand. Open a PR against the
relevant upstream repo instead, then re-run the refresh script.
