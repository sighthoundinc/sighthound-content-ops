import { open } from 'node:fs/promises';
import { constants } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { isDeepStrictEqual } from 'node:util';

// CLI: node scripts/debug/workflow-harness.mjs replay|live|differential scenario.json
// live uses WF_A_*, differential also WF_B_*. No dotenv loading or provisioning.
// Required per side: ORIGIN, DISPOSABLE=yes, NOTIFICATIONS_ISOLATED=yes,
// RECORD_<logical record>, ACTOR_<logical actor> (ordinary-user JWT).
// Optional state reads require SUPABASE_ORIGIN and PUBLIC_KEY (anon/publishable).
// USER_<actor> is an optional cross-check against the user JWT subject.
// Global live consent: WF_ALLOW_MUTATIONS=yes; exact remote origins must be in
// WF_ALLOWED_STAGING_ORIGINS (comma-separated, HTTPS only), including Supabase.
// Replay compares synthetic observations only; it does not invoke app handlers.
// Exit codes: 0 passed, 1 assertion/transport failure, 2 invalid fixture, 3 blocked.
const LIMIT = 64 * 1024;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NAME = /^[a-z][a-z0-9_]{0,47}$/;
const name = (value) => typeof value === 'string' && NAME.test(value);
const OPERATIONS = {
  social_transition: ['social-posts', 'transition', 'social_posts'],
  blog_transition: ['blogs', 'transition', 'blogs'],
  social_reopen: ['social-posts', 'reopen-brief', 'social_posts'],
};
const FIELDS = new Set([
  'status', 'assigned_to_user_id', 'worker_user_id', 'reviewer_user_id',
  'writer_status', 'publisher_status', 'writer_id', 'publisher_id',
  'title', 'caption', 'platforms', 'product', 'type', 'canva_url', 'canva_page',
  'scheduled_publish_date', 'display_published_date', 'actual_published_at',
  'scheduled_date', 'target_publish_date',
  'associated_blog_id', 'google_doc_url', 'live_url',
]);
export class HarnessError extends Error {
  constructor(code, exitCode = 2) { super(code); this.code = code; this.exitCode = exitCode; }
}
function requireThat(ok, code = 'INVALID_FIXTURE', exit = 2) {
  if (!ok) throw new HarnessError(code, exit);
}
const object = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
function keys(v, allowed) {
  requireThat(object(v) && Object.keys(v).every((k) => allowed.includes(k)));
}
export function rejectCredentials(value, depth = 0) {
  requireThat(depth < 24);
  if (typeof value === 'string') {
    requireThat(!/bearer\s|(?:authorization|cookie|set-cookie)\s*:|eyJ[\w-]+\.[\w-]+\.[\w-]+|sb_(?:secret|publishable)_/i.test(value),
      'CREDENTIAL_FIXTURE');
  } else if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      requireThat(!/authorization|cookie|password|secret|token|api.?key|headers/i.test(key),
        'CREDENTIAL_FIXTURE');
      rejectCredentials(child, depth + 1);
    }
  }
}
function stateShape(state) {
  requireThat(object(state) && Object.keys(state).length > 0);
  requireThat(Object.keys(state).every((k) => FIELDS.has(k)));
  for (const v of Object.values(state)) {
    if (object(v)) {
      keys(v, ['$actor']);
      requireThat(name(v.$actor));
    } else {
      requireThat(v === null || ['string', 'number', 'boolean'].includes(typeof v) ||
        (Array.isArray(v) && v.every((s) => typeof s === 'string')));
    }
  }
}
function observationShape(v) {
  keys(v, ['status', 'errorCode', 'state']);
  requireThat(Number.isInteger(v.status) && v.status >= 100 && v.status <= 599);
  requireThat(Object.hasOwn(v, 'errorCode') &&
    (v.errorCode === null || (typeof v.errorCode === 'string' && /^[A-Z][A-Z0-9_]{0,63}$/.test(v.errorCode))));
  if (v.state !== undefined) stateShape(v.state);
}
export function validateFixture(fixture) {
  rejectCredentials(fixture);
  keys(fixture, ['version', 'synthetic', 'scenarios']);
  requireThat(fixture.version === 1 && fixture.synthetic === true);
  requireThat(Array.isArray(fixture.scenarios) && fixture.scenarios.length > 0 &&
    fixture.scenarios.length <= 50);
  const ids = new Set();
  for (const s of fixture.scenarios) {
    keys(s, ['id', 'operation', 'actor', 'record', 'body', 'expected', 'observed']);
    requireThat(name(s.id) && !ids.has(s.id));
    ids.add(s.id);
    requireThat(Object.hasOwn(OPERATIONS, s.operation) && name(s.actor) && name(s.record));
    requireThat(object(s.body));
    observationShape(s.expected);
    if (s.observed !== undefined) observationShape(s.observed);
  }
  return fixture;
}
export async function loadFixture(file) {
  let handle;
  try {
    handle = await open(file, constants.O_RDONLY | constants.O_NONBLOCK);
    const info = await handle.stat();
    requireThat(info.isFile(), 'FIXTURE_NOT_REGULAR_FILE');
    requireThat(info.size <= LIMIT, 'FIXTURE_TOO_LARGE');
    const data = Buffer.alloc(LIMIT + 1);
    let size = 0;
    while (size < data.length) {
      const { bytesRead } = await handle.read(data, size, data.length - size, null);
      if (!bytesRead) break;
      size += bytesRead;
    }
    requireThat(size <= LIMIT, 'FIXTURE_TOO_LARGE');
    return validateFixture(JSON.parse(data.subarray(0, size).toString('utf8')));
  } catch (error) {
    if (error instanceof HarnessError) throw error;
    throw new HarnessError('FIXTURE_UNREADABLE');
  } finally { await handle?.close(); }
}
export function safeOrigin(raw, env) {
  requireThat(raw, 'MISSING_ORIGIN', 3);
  let url;
  try { url = new URL(raw); } catch { throw new HarnessError('UNSAFE_ORIGIN', 3); }
  requireThat(!url.username && !url.password && url.pathname === '/' && !url.search && !url.hash,
    'UNSAFE_ORIGIN', 3);
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  const allowed = (env.WF_ALLOWED_STAGING_ORIGINS || '').split(',').map((s) => s.trim());
  requireThat((local && ['http:', 'https:'].includes(url.protocol)) ||
    (url.protocol === 'https:' && allowed.includes(url.origin)), 'UNSAFE_ORIGIN', 3);
  return url.origin;
}
function jwtClaims(token) {
  try {
    requireThat(typeof token === 'string' && token.length <= 16384 && token.split('.').length === 3);
    return JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
  } catch { throw new HarnessError('INVALID_USER_CREDENTIAL', 3); }
}
function userToken(token) {
  requireThat(token, 'MISSING_ACTOR', 3);
  const claims = jwtClaims(token);
  requireThat(object(claims) && claims.role === 'authenticated' && UUID.test(claims.sub),
    'ORDINARY_USER_REQUIRED', 3);
  return claims.sub;
}
export function configuration(fixture, side, env) {
  requireThat(env.WF_ALLOW_MUTATIONS === 'yes', 'MUTATION_CONSENT_REQUIRED', 3);
  const get = (name) => env[`WF_${side}_${name}`];
  requireThat(get('DISPOSABLE') === 'yes' && get('NOTIFICATIONS_ISOLATED') === 'yes',
    'ISOLATED_FIXTURES_REQUIRED', 3);
  const origin = safeOrigin(get('ORIGIN'), env);
  const actors = {}, records = {}, users = {};
  for (const s of fixture.scenarios) {
    const actorNames = [s.actor, ...Object.values(s.expected.state || {})
      .filter(object).map((v) => v.$actor)];
    for (const actor of actorNames) {
      const token = get(`ACTOR_${actor.toUpperCase()}`);
      users[actor] = userToken(token);
      actors[actor] = token;
      const configuredId = get(`USER_${actor.toUpperCase()}`);
      requireThat(!configuredId || configuredId === users[actor], 'ACTOR_ID_MISMATCH', 3);
    }
    const id = get(`RECORD_${s.record.toUpperCase()}`);
    requireThat(UUID.test(id || ''), 'MISSING_RECORD', 3);
    records[s.record] = id.toLowerCase();
  }
  // Ambiguous logical identities make normalization unreliable.
  requireThat(new Set(Object.values(users)).size === Object.keys(users).length,
    'DUPLICATE_ACTOR', 3);
  let supabaseOrigin, publicKey;
  if (fixture.scenarios.some((s) => s.expected.state)) {
    supabaseOrigin = safeOrigin(get('SUPABASE_ORIGIN'), env);
    publicKey = get('PUBLIC_KEY');
    requireThat(publicKey, 'MISSING_PUBLIC_KEY', 3);
    requireThat(publicKey.startsWith('sb_publishable_') || jwtClaims(publicKey).role === 'anon',
      'PUBLIC_KEY_REQUIRED', 3);
  }
  return { origin, actors, records, users, supabaseOrigin, publicKey };
}
export function ensureIndependent(fixture, a, b) {
  // Refuse overlapping IDs even with differing hostnames (aliases/shared DB).
  const first = new Set(fixture.scenarios.map((s) =>
    `${OPERATIONS[s.operation][2]}:${a.records[s.record]}`));
  requireThat(fixture.scenarios.every((s) =>
    !first.has(`${OPERATIONS[s.operation][2]}:${b.records[s.record]}`)), 'SAME_TARGET_RECORD', 3);
}
export async function boundedJson(url, init, fetcher = fetch, timeoutMs = 8000) {
  const controller = new AbortController();
  let timer;
  let activeReader;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new HarnessError('REQUEST_TIMEOUT', 1));
    }, timeoutMs);
  });
  const operation = async () => {
    const response = await fetcher(url, {
      ...init, redirect: 'error', signal: controller.signal,
    });
    requireThat(!response.redirected && !(response.status >= 300 && response.status < 400),
      'REDIRECT_REFUSED', 1);
    requireThat(Number(response.headers.get('content-length') || 0) <= LIMIT,
      'RESPONSE_TOO_LARGE', 1);
    const reader = response.body?.getReader();
    activeReader = reader;
    const chunks = [];
    let length = 0;
    try {
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          length += value.byteLength;
          requireThat(length <= LIMIT, 'RESPONSE_TOO_LARGE', 1);
          chunks.push(Buffer.from(value));
        }
      }
    } finally {
      if (reader) await reader.cancel().catch(() => {});
    }
    const text = Buffer.concat(chunks).toString('utf8');
    return { status: response.status, body: text ? JSON.parse(text) : null };
  };
  try { return await Promise.race([operation(), timeout]); }
  catch (error) {
    controller.abort();
    if (error instanceof HarnessError) throw error;
    throw new HarnessError('REQUEST_FAILED', 1);
  } finally {
    clearTimeout(timer);
    if (activeReader) void activeReader.cancel().catch(() => {});
  }
}
function normalizeState(state, config) {
  return Object.fromEntries(Object.entries(state).map(([key, value]) => {
    const actor = key.endsWith('_id') && Object.keys(config.users).find((a) => config.users[a] === value);
    return [key, actor ? { $actor: actor } : value];
  }));
}
export function compare(expected, actual) {
  const failures = [];
  if (actual.status !== expected.status) failures.push('http_status');
  if (actual.errorCode !== expected.errorCode) failures.push('error_code');
  if (expected.state) {
    if (!actual.state || Object.entries(expected.state)
      .some(([k, v]) => !Object.hasOwn(actual.state, k) || !isDeepStrictEqual(v, actual.state[k]))) {
      failures.push('persisted_state');
    }
  }
  return failures;
}
export function differential(expected, a, b) {
  const left = compare(expected, a), right = compare(expected, b);
  const projection = (v) => ({
    status: v.status, errorCode: v.errorCode,
    state: expected.state ? Object.fromEntries(Object.keys(expected.state)
      .map((k) => [k, v.state?.[k]])) : undefined,
  });
  return { left, right, equivalent: isDeepStrictEqual(projection(a), projection(b)),
    passed: !left.length && !right.length && isDeepStrictEqual(projection(a), projection(b)) };
}
async function observe(s, config, fetcher) {
  const [route, action, table] = OPERATIONS[s.operation];
  const id = config.records[s.record];
  const headers = { Authorization: `Bearer ${config.actors[s.actor]}`, 'Content-Type': 'application/json' };
  const response = await boundedJson(`${config.origin}/api/${route}/${id}/${action}`, {
    method: 'POST', headers, body: JSON.stringify(s.body),
  }, fetcher);
  const actual = { status: response.status, errorCode: response.body?.errorCode ?? null };
  if (s.expected.state) {
    const url = new URL(`/rest/v1/${table}`, config.supabaseOrigin);
    url.searchParams.set('id', `eq.${id}`);
    url.searchParams.set('select', Object.keys(s.expected.state).join(','));
    url.searchParams.set('limit', '2');
    const persisted = await boundedJson(url, {
      method: 'GET', headers: { ...headers, apikey: config.publicKey },
    }, fetcher);
    requireThat(persisted.status === 200 && Array.isArray(persisted.body) &&
      persisted.body.length === 1 && object(persisted.body[0]), 'STATE_READ_FAILED', 1);
    actual.state = normalizeState(persisted.body[0], config);
  }
  return actual;
}
export async function run(mode, fixture, env = process.env, fetcher = fetch) {
  validateFixture(fixture);
  requireThat(['replay', 'live', 'differential'].includes(mode), 'INVALID_MODE');
  // Preflight ALL configuration and both targets before the first mutation.
  const a = mode !== 'replay' ? configuration(fixture, 'A', env) : null;
  const b = mode === 'differential' ? configuration(fixture, 'B', env) : null;
  if (b) ensureIndependent(fixture, a, b);
  const results = [];
  for (const s of fixture.scenarios) {
    if (mode === 'replay') {
      requireThat(s.observed, 'MISSING_REPLAY_OBSERVATION', 3);
      const failures = compare(s.expected, s.observed);
      results.push({ scenario: s.id, passed: failures.length === 0, failures });
    } else {
      const left = await observe(s, a, fetcher);
      if (b) results.push({ scenario: s.id, ...differential(s.expected, left, await observe(s, b, fetcher)) });
      else {
        const failures = compare(s.expected, left);
        results.push({ scenario: s.id, passed: failures.length === 0, failures });
      }
    }
    // No retries and no further mutations after an assertion failure.
    if (!results.at(-1).passed) break;
  }
  return { coverage: mode === 'replay' ? 'synthetic-comparison-only' : 'api-with-optional-user-state-read',
    rlsVerified: false, passed: results.every((r) => r.passed), results };
}
export async function cli(args, env = process.env) {
  try {
    requireThat(args.length === 2, 'USAGE_MODE_AND_SCENARIO_REQUIRED', 3);
    const result = await run(args[0], await loadFixture(args[1]), env);
    return { exitCode: result.passed ? 0 : 1, output: result };
  } catch (error) {
    // Never serialize raw response bodies, credentials, URLs, errors, or stacks.
    return { exitCode: error instanceof HarnessError ? error.exitCode : 1,
      output: { passed: false, code: error instanceof HarnessError ? error.code : 'HARNESS_FAILED' } };
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = await cli(process.argv.slice(2));
  console.log(JSON.stringify(result.output));
  process.exitCode = result.exitCode;
}
