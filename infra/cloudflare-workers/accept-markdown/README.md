# Accept-Markdown Worker

Cloudflare Worker implementing the [acceptmarkdown.com](https://acceptmarkdown.com/start) content-negotiation spec for `www.sighthound.com` and `www.redactor.com`, plus authoritative hosting of `/llms.txt`, `/llms-full.txt`, and `/robots.txt` for both domains.

## What it does

1. **Serves hosted LLM/robots files** at fixed paths from repo-committed content (`src/content/<host>/*.txt`). Overrides CMS defaults on both Squarespace and Webflow.
   - `GET /llms.txt` → Deft dashdash v0.2.0 Markdown + YAML front matter
   - `GET /llms-full.txt` → concatenated canonical content bundle for one-shot agent ingestion
   - `GET /robots.txt` → explicit AI-bot allowlist + scraper blocklist
2. **Content negotiation** on every other page: `Accept: text/markdown` → HTML fetched from origin, extracted (`<main>` / `<article>`), converted to Markdown with YAML front matter (url, title, description, author, date), returned as `text/markdown; charset=utf-8` with `Vary: Accept`.
3. **LLM discoverability headers** on every response this Worker touches:
   - `X-LLMs-Txt: /llms.txt`
   - `Link: </llms.txt>; rel="llms-help"`

## Why

- Lets LLMs (ChatGPT browse, Claude tools, Cursor, Perplexity, Copilot) consume our content without parsing full HTML + scripts + analytics chrome.
- Gives us version-controlled `llms.txt`, `llms-full.txt`, and `robots.txt` in Git, bypassing Webflow/Squarespace CMS field limitations.
- Same URL serves both HTML and Markdown — no separate `.md` URL space to maintain.
- Single source of truth; edit in one PR, deploys to both domains.

## Content files

```
src/content/
├── www.sighthound.com/
│   ├── llms.txt           # Deft v0.2.0 Markdown with YAML front matter
│   ├── llms-full.txt      # Single-shot content bundle
│   └── robots.txt         # AI-bot allowlist + scraper blocklist
└── www.redactor.com/
    ├── llms.txt
    ├── llms-full.txt
    └── robots.txt
```

To edit any of these, change the file and redeploy — no CMS touch needed.

## Local development

```shell
cd infra/cloudflare-workers/accept-markdown
npm install
npm run dev
```

Then in another shell:

```shell
# HTML request (default)
curl -sI http://127.0.0.1:8787/blog/campus-vehicle-tracking-privacy-ethics

# Markdown request
curl -sI -H 'Accept: text/markdown' http://127.0.0.1:8787/blog/campus-vehicle-tracking-privacy-ethics

# Fetch the actual Markdown body
curl -sL -H 'Accept: text/markdown' http://127.0.0.1:8787/blog/campus-vehicle-tracking-privacy-ethics
```

`wrangler dev` proxies requests through Cloudflare's dev environment so it talks to the real `sighthound.com` origin.

## Deploy

Requires a Cloudflare account with Workers enabled and the `sighthound.com` zone present.

```shell
# One-time
npx wrangler login

# Deploy
npm run deploy
```

First deploy will prompt Cloudflare to attach the route pattern declared in `wrangler.toml` (`www.sighthound.com/*`) to the `sighthound.com` zone.

### Redactor

The `www.redactor.com/*` route is commented out in `wrangler.toml`. Enable it only after confirming `redactor.com` nameservers point to Cloudflare:

```shell
dig redactor.com NS +short
```

Expected output: two `*.cloudflare.com` entries. If it's still on Webflow's default nameservers, you need to move the zone to Cloudflare first (free plan is fine). Once the nameservers are Cloudflare:

1. Uncomment the `[[routes]]` block for `www.redactor.com/*` in `wrangler.toml`.
2. `npm run deploy` again.

## Validation

After deploy, verify both representations come back from the same URL:

```shell
# Expect Content-Type: text/html and Vary: Accept
curl -sI -H 'Accept: text/html' https://www.sighthound.com/blog/campus-vehicle-tracking-privacy-ethics

# Expect Content-Type: text/markdown; charset=utf-8 and Vary: Accept
curl -sI -H 'Accept: text/markdown' https://www.sighthound.com/blog/campus-vehicle-tracking-privacy-ethics

# Fetch the rendered Markdown
curl -sL -H 'Accept: text/markdown' https://www.sighthound.com/ | head -40
```

Then run the interactive prober at https://acceptmarkdown.com/#tester against each domain — expect green.

## Scope / behavior

- Only GET and HEAD are handled; other methods pass straight to origin.
- Assets (images, JS, CSS, fonts, video, PDFs) pass through untouched.
- `robots.txt`, `sitemap*.xml`, `/llms.txt`, `/llms-full.txt`, `/api/*` pass through untouched.
- If origin returns a non-HTML `Content-Type`, pass through untouched.
- If Markdown conversion yields an empty/near-empty body, respond `406 Not Acceptable` per spec.
- `Cache-Control` is inherited from origin; falls back to `public, max-age=300`.

## Rollback

Workers deploys are immediate and reversible. To remove:

```shell
# Remove one route
npx wrangler routes delete <route-id> --zone-name sighthound.com

# Or delete the Worker entirely
npx wrangler delete
```

Or comment the routes out of `wrangler.toml` and redeploy — the Worker stays but no longer runs on those hostnames.

## Costs

Cloudflare Workers free tier: 100,000 requests/day, 10ms CPU time per request.
Paid ($5/month): 10M requests/day, 50ms CPU.

Typical HTML→Markdown conversion is ~5–15ms CPU. Free tier is fine for current traffic; upgrade if we start getting sustained agent crawl traffic.

## Follow-ups (out of scope for first ship)

- Swap the regex-based converter for a proper streaming parser (`node-html-markdown` or `@mozilla/readability` + markdown writer) for better quality on complex content.
- Precompute Markdown for top URLs into Cloudflare KV and serve from there (sub-10ms, zero per-request CPU).
- Add per-path templates (e.g., product pages get a structured Markdown with feature lists extracted from schema.org JSON-LD).
- Add a `/.well-known/accept-markdown` probe endpoint for automated discovery.
