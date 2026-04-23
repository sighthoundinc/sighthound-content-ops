// Cloudflare Worker — acceptmarkdown.com content negotiation + LLM assets
// Spec: https://acceptmarkdown.com/start
//
// Responsibilities:
// 1. Serve authoritative /llms.txt, /llms-full.txt, /robots.txt from repo-committed
//    content files (overriding CMS defaults on both Squarespace and Webflow).
// 2. When clients send Accept: text/markdown, fetch origin HTML and return Markdown.
// 3. Otherwise pass through HTML with Vary: Accept and add LLM discoverability headers
//    (X-LLMs-Txt and Link: rel="llms-help").
//
// Routes: www.sighthound.com/*, www.redactor.com/*, docs.redactor.com/* (see wrangler.toml)

import shLlms from './content/www.sighthound.com/llms.txt';
import shLlmsFull from './content/www.sighthound.com/llms-full.txt';
import shRobots from './content/www.sighthound.com/robots.txt';
import redLlms from './content/www.redactor.com/llms.txt';
import redLlmsFull from './content/www.redactor.com/llms-full.txt';
import redRobots from './content/www.redactor.com/robots.txt';
import redDocsLlms from './content/docs.redactor.com/llms.txt';
import redDocsLlmsFull from './content/docs.redactor.com/llms-full.txt';
import redDocsRobots from './content/docs.redactor.com/robots.txt';

const HOSTED_FILES = {
  'www.sighthound.com': {
    '/llms.txt':      { body: shLlms,     contentType: 'text/markdown; charset=utf-8' },
    '/llms-full.txt': { body: shLlmsFull, contentType: 'text/markdown; charset=utf-8' },
    '/robots.txt':    { body: shRobots,   contentType: 'text/plain; charset=utf-8' },
  },
  'www.redactor.com': {
    '/llms.txt':      { body: redLlms,     contentType: 'text/markdown; charset=utf-8' },
    '/llms-full.txt': { body: redLlmsFull, contentType: 'text/markdown; charset=utf-8' },
    '/robots.txt':    { body: redRobots,   contentType: 'text/plain; charset=utf-8' },
  },
  'docs.redactor.com': {
    '/llms.txt':      { body: redDocsLlms,     contentType: 'text/markdown; charset=utf-8' },
    '/llms-full.txt': { body: redDocsLlmsFull, contentType: 'text/markdown; charset=utf-8' },
    '/robots.txt':    { body: redDocsRobots,   contentType: 'text/plain; charset=utf-8' },
  },
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Only handle GET/HEAD. Other methods pass through.
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return fetch(request);
    }

    // 1. Serve hosted LLM/robots files before anything else.
    const hosted = HOSTED_FILES[url.hostname]?.[url.pathname];
    if (hosted) {
      const body = request.method === 'HEAD' ? null : hosted.body;
      return new Response(body, {
        status: 200,
        headers: {
          'Content-Type': hosted.contentType,
          'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
          'X-Served-By': 'accept-markdown-worker',
        },
      });
    }

    // Skip assets, APIs, sitemaps — Markdown/LLM headers make no sense for these.
    if (shouldSkip(url.pathname)) {
      return passThroughWithVary(await fetch(request));
    }

    const accept = request.headers.get('Accept') || '';

    // If the client sent an Accept header that excludes every type we can produce
    // (text/html, text/markdown), return 406 per RFC 9110 / acceptmarkdown.com spec.
    // We only 406 when Accept is explicit AND incompatible — absent or */* is fine.
    if (accept && !canProduceForAccept(accept)) {
      return new Response('Not Acceptable: server can produce text/html or text/markdown', {
        status: 406,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Vary': 'Accept',
        },
      });
    }

    const prefersMd = prefersMarkdownOverHtml(accept);

    // Fetch origin with Accept: text/html to force an HTML response (in case origin
    // also negotiates content, we want the HTML to convert).
    const originHeaders = new Headers(request.headers);
    originHeaders.set('Accept', 'text/html');
    const originReq = new Request(request.url, {
      method: 'GET',
      headers: originHeaders,
      redirect: 'follow',
    });

    let originResponse;
    try {
      originResponse = await fetch(originReq);
    } catch (err) {
      return new Response('Upstream fetch failed: ' + err.message, { status: 502 });
    }

    const originContentType = originResponse.headers.get('Content-Type') || '';
    if (!originContentType.toLowerCase().includes('text/html')) {
      return passThroughWithVary(originResponse);
    }

    if (prefersMd) {
      const html = await originResponse.text();
      const md = convertPageToMarkdown(html, url.toString());

      // If conversion produced something unusable, return 406 per spec
      if (!md || md.trim().length < 40) {
        return new Response('Not Acceptable: could not produce Markdown', {
          status: 406,
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Vary': 'Accept',
          },
        });
      }

      const cacheControl = originResponse.headers.get('Cache-Control') || 'public, max-age=300';
      const mdHeaders = new Headers({
        'Content-Type': 'text/markdown; charset=utf-8',
        'Vary': 'Accept',
        'Cache-Control': cacheControl,
        'X-Converted-By': 'accept-markdown-worker',
      });
      addLlmDiscoveryHeaders(mdHeaders);
      return new Response(md, {
        status: originResponse.status,
        headers: mdHeaders,
      });
    }

    // HTML pass-through with Vary: Accept merged in.
    return passThroughWithVary(originResponse);
  },
};

function passThroughWithVary(response) {
  const headers = new Headers(response.headers);
  headers.set('Vary', combineVary(headers.get('Vary'), 'Accept'));
  addLlmDiscoveryHeaders(headers);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

// Announce llms.txt per acceptmarkdown.com + Deft dashdash v0.2.0 §3.5.
// Applied to every response this Worker touches so agents can discover the help file
// without fetching the HTML first.
function addLlmDiscoveryHeaders(headers) {
  headers.set('X-LLMs-Txt', '/llms.txt');
  const existingLink = headers.get('Link');
  const llmLink = '</llms.txt>; rel="llms-help"';
  if (!existingLink) {
    headers.set('Link', llmLink);
  } else if (!existingLink.includes('rel="llms-help"')) {
    headers.set('Link', existingLink + ', ' + llmLink);
  }
}

function shouldSkip(pathname) {
  const skipExt = /\.(xml|txt|ico|png|jpe?g|gif|webp|avif|svg|pdf|mp4|webm|mov|mp3|ogg|js|css|json|woff2?|ttf|otf|eot|zip|gz|map)$/i;
  if (skipExt.test(pathname)) return true;
  const skipPaths = ['/sitemap', '/robots.txt', '/llms.txt', '/llms-full.txt', '/wp-admin', '/api/', '/favicon'];
  return skipPaths.some((p) => pathname.startsWith(p));
}

// Returns true when the Accept header advertises at least one type we can serve.
// We can produce text/html (pass-through) and text/markdown (converted). Wildcards
// (*/*, text/*) are acceptable. Explicit-but-incompatible headers trigger 406.
function canProduceForAccept(accept) {
  if (!accept) return true; // absent header → server picks default
  const types = accept
    .split(',')
    .map((s) => s.trim().split(';')[0].trim().toLowerCase())
    .filter(Boolean);
  if (types.length === 0) return true;
  return types.some(
    (t) => t === '*/*' || t === 'text/*' || t === 'text/html' || t === 'text/markdown',
  );
}

function prefersMarkdownOverHtml(accept) {
  if (!accept) return false;

  const entries = accept.split(',').map((s) => {
    const parts = s.trim().split(';');
    const type = parts[0].trim().toLowerCase();
    const qPart = parts.find((p) => p.trim().toLowerCase().startsWith('q='));
    const q = qPart ? parseFloat(qPart.split('=')[1]) : 1.0;
    return { type, q: Number.isNaN(q) ? 1.0 : q };
  });

  let mdQ = -1;
  let htmlQ = -1;

  for (const e of entries) {
    if (e.type === 'text/markdown' || e.type === 'text/*') mdQ = Math.max(mdQ, e.q);
    if (e.type === 'text/html' || e.type === 'text/*' || e.type === '*/*') htmlQ = Math.max(htmlQ, e.q);
  }

  if (mdQ < 0) return false;
  if (htmlQ < 0) return true;
  return mdQ > htmlQ;
}

function combineVary(existing, toAdd) {
  if (!existing) return toAdd;
  const parts = existing.split(',').map((s) => s.trim()).filter(Boolean);
  if (parts.some((p) => p.toLowerCase() === toAdd.toLowerCase())) return existing;
  parts.push(toAdd);
  return parts.join(', ');
}

// ───────────────────────── HTML → Markdown ─────────────────────────

function convertPageToMarkdown(html, pageUrl) {
  const titleMatch = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? decodeEntities(stripTags(titleMatch[1])).trim() : '';

  const descMatch =
    html.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i) ||
    html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']*)["']/i);
  const description = descMatch ? decodeEntities(descMatch[1]).trim() : '';

  const dateMatch =
    html.match(/<meta\s+itemprop=["']datePublished["']\s+content=["']([^"']*)["']/i) ||
    html.match(/<meta\s+property=["']article:published_time["']\s+content=["']([^"']*)["']/i);
  const datePublished = dateMatch ? dateMatch[1].trim() : '';

  const authorMatch =
    html.match(/<meta\s+itemprop=["']author["']\s+content=["']([^"']*)["']/i) ||
    html.match(/<meta\s+name=["']author["']\s+content=["']([^"']*)["']/i);
  const author = authorMatch ? decodeEntities(authorMatch[1]).trim() : '';

  const main = extractMainContent(html);
  const body = htmlToMarkdown(main);

  // YAML front matter for grounded context
  const fm = ['---'];
  fm.push(`url: ${pageUrl}`);
  if (title) fm.push(`title: ${escapeYaml(title)}`);
  if (description) fm.push(`description: ${escapeYaml(description)}`);
  if (author) fm.push(`author: ${escapeYaml(author)}`);
  if (datePublished) fm.push(`datePublished: ${datePublished}`);
  fm.push('content-type: text/markdown');
  fm.push('generator: accept-markdown-worker');
  fm.push('---');

  return fm.join('\n') + '\n\n' + body;
}

function extractMainContent(html) {
  let m = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i);
  if (m) return m[1];

  m = html.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i);
  if (m) return m[1];

  let body = html;
  const bodyMatch = html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch) body = bodyMatch[1];

  body = body.replace(/<nav\b[^>]*>[\s\S]*?<\/nav>/gi, '');
  body = body.replace(/<header\b[^>]*>[\s\S]*?<\/header>/gi, '');
  body = body.replace(/<footer\b[^>]*>[\s\S]*?<\/footer>/gi, '');
  body = body.replace(/<aside\b[^>]*>[\s\S]*?<\/aside>/gi, '');
  return body;
}

function htmlToMarkdown(html) {
  let md = html;

  // Remove non-content blocks
  md = md.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
  md = md.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '');
  md = md.replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, '');
  md = md.replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, '');
  md = md.replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, '');
  md = md.replace(/<!--[\s\S]*?-->/g, '');

  // Headings
  md = md.replace(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi, '\n\n# $1\n\n');
  md = md.replace(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi, '\n\n## $1\n\n');
  md = md.replace(/<h3\b[^>]*>([\s\S]*?)<\/h3>/gi, '\n\n### $1\n\n');
  md = md.replace(/<h4\b[^>]*>([\s\S]*?)<\/h4>/gi, '\n\n#### $1\n\n');
  md = md.replace(/<h5\b[^>]*>([\s\S]*?)<\/h5>/gi, '\n\n##### $1\n\n');
  md = md.replace(/<h6\b[^>]*>([\s\S]*?)<\/h6>/gi, '\n\n###### $1\n\n');

  // Paragraphs
  md = md.replace(/<p\b[^>]*>([\s\S]*?)<\/p>/gi, '\n\n$1\n\n');

  // Links (handle alt and href in any order)
  md = md.replace(/<a\b[^>]*\bhref=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (m, href, text) => {
    const cleanText = stripTags(text).trim() || href;
    return `[${cleanText}](${href})`;
  });

  // Images (alt and src in either order)
  md = md.replace(/<img\b[^>]*\balt=["']([^"']*)["'][^>]*\bsrc=["']([^"']+)["'][^>]*\/?>/gi, '![$1]($2)');
  md = md.replace(/<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*\balt=["']([^"']*)["'][^>]*\/?>/gi, '![$2]($1)');
  md = md.replace(/<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*\/?>/gi, '![]($1)');

  // Emphasis
  md = md.replace(/<(strong|b)\b[^>]*>([\s\S]*?)<\/\1>/gi, '**$2**');
  md = md.replace(/<(em|i)\b[^>]*>([\s\S]*?)<\/\1>/gi, '*$2*');

  // Code
  md = md.replace(/<pre\b[^>]*>([\s\S]*?)<\/pre>/gi, (m, inner) => {
    const clean = stripTags(inner);
    return '\n\n```\n' + decodeEntities(clean) + '\n```\n\n';
  });
  md = md.replace(/<code\b[^>]*>([\s\S]*?)<\/code>/gi, '`$1`');

  // Blockquote
  md = md.replace(/<blockquote\b[^>]*>([\s\S]*?)<\/blockquote>/gi, (m, c) => {
    const cleaned = stripTags(c).trim();
    const quoted = cleaned
      .split(/\n+/)
      .map((l) => '> ' + l.trim())
      .filter((l) => l.trim() !== '>')
      .join('\n');
    return '\n\n' + quoted + '\n\n';
  });

  // Lists (flat; nested rarely used in CMS blog output)
  md = md.replace(/<li\b[^>]*>([\s\S]*?)<\/li>/gi, '- $1\n');
  md = md.replace(/<\/?(ul|ol)\b[^>]*>/gi, '\n');

  // Line breaks and horizontal rules
  md = md.replace(/<br\s*\/?>/gi, '  \n');
  md = md.replace(/<hr\s*\/?>/gi, '\n\n---\n\n');

  // Strip remaining tags
  md = md.replace(/<\/?[^>]+>/g, '');

  // Entities
  md = decodeEntities(md);

  // Collapse whitespace
  md = md.replace(/[ \t]+/g, ' ');
  md = md.replace(/\n[ \t]+/g, '\n');
  md = md.replace(/\n{3,}/g, '\n\n');

  return md.trim();
}

function stripTags(str) {
  return str.replace(/<\/?[^>]+>/g, '');
}

function decodeEntities(str) {
  return str
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&mdash;/g, '\u2014')
    .replace(/&ndash;/g, '\u2013')
    .replace(/&hellip;/g, '\u2026')
    .replace(/&lsquo;/g, '\u2018')
    .replace(/&rsquo;/g, '\u2019')
    .replace(/&ldquo;/g, '\u201C')
    .replace(/&rdquo;/g, '\u201D')
    .replace(/&#(\d+);/g, (m, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (m, n) => String.fromCharCode(parseInt(n, 16)));
}

function escapeYaml(str) {
  if (/[:\n#&*!|>{}[\],'"%@`]/.test(str)) {
    return '"' + str.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
  }
  return str;
}
