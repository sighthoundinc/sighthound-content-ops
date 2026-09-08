import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  boundedJson, cli, compare, configuration, differential, ensureIndependent,
  loadFixture, rejectCredentials, run, safeOrigin, validateFixture,
} from '../../scripts/debug/workflow-harness.mjs';

const fixturePath = new URL('./scenarios.json', import.meta.url);
const source = await loadFixture(fixturePath);
const fixture = () => structuredClone(source);
const uuid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
// Deliberately unsigned synthetic strings, used only by injected in-memory fetch.
const jwt = (role, n) => `e30.${Buffer.from(JSON.stringify({ role, sub: uuid(n) })).toString('base64url')}.fake`;
function environment(side = 'A', offset = 0) {
  return {
    WF_ALLOW_MUTATIONS: 'yes',
    [`WF_${side}_DISPOSABLE`]: 'yes',
    [`WF_${side}_NOTIFICATIONS_ISOLATED`]: 'yes',
    [`WF_${side}_ORIGIN`]: 'http://127.0.0.1:3000',
    [`WF_${side}_SUPABASE_ORIGIN`]: 'http://127.0.0.1:54321',
    [`WF_${side}_PUBLIC_KEY`]: jwt('anon', 99),
    [`WF_${side}_ACTOR_WORKER`]: jwt('authenticated', 1 + offset),
    [`WF_${side}_ACTOR_OUTSIDER`]: jwt('authenticated', 2 + offset),
    [`WF_${side}_RECORD_SOCIAL_DRAFT`]: uuid(10 + offset),
    [`WF_${side}_RECORD_BLOG_DRAFT`]: uuid(11 + offset),
    [`WF_${side}_RECORD_SOCIAL_READY`]: uuid(12 + offset),
  };
}
const hasCode = (code) => (e) => e.code === code;

test('replay is synthetic-only and never invokes transport', async () => {
  const result = await run('replay', fixture(), {}, () => assert.fail('network'));
  assert.equal(result.passed, true);
  assert.equal(result.rlsVerified, false);
  assert.equal(result.coverage, 'synthetic-comparison-only');
  assert.equal(result.results.length, 3);
});
test('credential-bearing fixtures are rejected recursively', () => {
  for (const key of ['Authorization', 'Cookie', 'set-cookie', 'access_token', 'apiKey', 'headers']) {
    assert.throws(() => rejectCredentials({ body: { [key]: 'hidden' } }), hasCode('CREDENTIAL_FIXTURE'));
  }
  for (const value of ['Bearer hidden', 'eyJhbGc.abc.def', 'sb_secret_hidden', 'Cookie: session=hidden']) {
    assert.throws(() => rejectCredentials({ body: { reason: value } }), hasCode('CREDENTIAL_FIXTURE'));
  }
});
test('fixture schema rejects missing expectations, unknown operations and duplicate IDs', () => {
  for (const mutate of [
    (f) => { delete f.scenarios[0].expected.errorCode; },
    (f) => { f.scenarios[0].operation = 'delete'; },
    (f) => { f.scenarios[0].expected.state = { password_hash: 'hidden' }; },
    (f) => { f.scenarios[1].id = f.scenarios[0].id; },
    (f) => { f.synthetic = false; },
    (f) => { delete f.scenarios[0].actor; },
  ]) {
    const f = fixture(); mutate(f);
    assert.throws(() => validateFixture(f));
  }
});
test('origin gate requires exact HTTPS staging allowlist or loopback', () => {
  assert.equal(safeOrigin('http://localhost:3000', {}), 'http://localhost:3000');
  assert.equal(safeOrigin('https://staging.example.test', {
    WF_ALLOWED_STAGING_ORIGINS: 'https://staging.example.test',
  }), 'https://staging.example.test');
  for (const origin of ['https://production.test', 'http://staging.example.test',
    'https://localhost.evil.test', 'http://localhost@evil.test', 'http://localhost/path',
    'http://localhost?key=hidden', 'file:///tmp/data']) {
    assert.throws(() => safeOrigin(origin, {}), hasCode('UNSAFE_ORIGIN'));
  }
});
test('live fails closed before fetch for consent, identities, records or state configuration', async () => {
  for (const key of ['WF_ALLOW_MUTATIONS', 'WF_A_DISPOSABLE', 'WF_A_NOTIFICATIONS_ISOLATED',
    'WF_A_ACTOR_WORKER', 'WF_A_RECORD_SOCIAL_READY', 'WF_A_PUBLIC_KEY', 'WF_A_SUPABASE_ORIGIN']) {
    const env = environment(); delete env[key];
    await assert.rejects(run('live', fixture(), env, () => assert.fail('network')), (e) => e.exitCode === 3);
  }
});
test('service-role credentials cannot act or read persisted state', () => {
  for (const key of ['WF_A_ACTOR_WORKER', 'WF_A_PUBLIC_KEY']) {
    const env = environment(); env[key] = jwt('service_role', 1);
    assert.throws(() => configuration(fixture(), 'A', env), (e) => e.exitCode === 3);
  }
});
test('same targets refused across aliases and cross-scenario bindings', async () => {
  const env = { ...environment(), ...environment('B') };
  await assert.rejects(run('differential', fixture(), env, () => assert.fail('network')),
    hasCode('SAME_TARGET_RECORD'));
  const a = configuration(fixture(), 'A', env);
  const b = configuration(fixture(), 'B', { ...env, ...environment('B', 100) });
  b.records.social_ready = a.records.social_draft;
  assert.throws(() => ensureIndependent(fixture(), a, b), hasCode('SAME_TARGET_RECORD'));
});
test('identical wrong differential results fail independently', () => {
  const expected = { status: 403, errorCode: 'FORBIDDEN' };
  const wrong = { status: 200, errorCode: null };
  const result = differential(expected, wrong, wrong);
  assert.equal(result.equivalent, true);
  assert.equal(result.passed, false);
  assert.deepEqual(result.left, ['http_status', 'error_code']);
  assert.deepEqual(result.right, result.left);
});
test('state comparison preserves null, missing, ownership and array order', () => {
  const expected = { status: 200, errorCode: null, state: { assigned_to_user_id: null, platforms: ['linkedin'] } };
  assert.deepEqual(compare(expected, expected), []);
  for (const state of [{ platforms: ['linkedin'] }, { assigned_to_user_id: uuid(1), platforms: ['linkedin'] },
    { assigned_to_user_id: null, platforms: [] }]) {
    assert.deepEqual(compare(expected, { ...expected, state }), ['persisted_state']);
  }
});
test('bounded transport refuses redirects, oversized bodies, invalid JSON and raw errors', async () => {
  for (const [response, code] of [
    [new Response('', { status: 302 }), 'REDIRECT_REFUSED'],
    [new Response('x'.repeat(65537)), 'RESPONSE_TOO_LARGE'],
    [new Response('{}', { headers: { 'content-length': '65537' } }), 'RESPONSE_TOO_LARGE'],
    [new Response('<html>private error</html>'), 'REQUEST_FAILED'],
  ]) {
    await assert.rejects(boundedJson('http://unused.test', {}, async (_, options) => {
      assert.equal(options.redirect, 'error'); return response;
    }), hasCode(code));
  }
  await assert.rejects(boundedJson('http://unused.test', {}, async () => {
    throw new Error('secret detail');
  }), (e) => e.message === 'REQUEST_FAILED');
});
test('timeout bounds transport even when injected fetch ignores abort', async () => {
  await assert.rejects(boundedJson('http://unused.test', {}, () => new Promise(() => {}), 10),
    hasCode('REQUEST_TIMEOUT'));
});
test('mocked live request asserts user REST state, exact route and no credential output', async () => {
  const f = fixture(); f.scenarios = [f.scenarios[0]];
  const calls = [];
  const result = await run('live', f, environment(), async (url, options) => {
    calls.push([String(url), options]);
    if (options.method === 'GET') {
      assert.equal(options.headers.Authorization, `Bearer ${environment().WF_A_ACTOR_OUTSIDER}`);
      assert.equal(options.headers.apikey, environment().WF_A_PUBLIC_KEY);
      return Response.json([{ status: 'draft', assigned_to_user_id: uuid(1) }]);
    }
    return Response.json({ errorCode: 'FORBIDDEN', error: 'private internal detail' }, { status: 403 });
  });
  assert.equal(result.passed, true);
  assert.match(calls[0][0], /\/api\/social-posts\/[\w-]+\/transition$/);
  assert.match(calls[1][0], /\/rest\/v1\/social_posts\?id=eq\./);
  assert.equal(JSON.stringify(result).includes('private'), false);
  assert.equal(JSON.stringify(result).includes('Bearer'), false);
});
test('unreadable persisted row fails, not a false denied-write pass', async () => {
  const f = fixture(); f.scenarios = [f.scenarios[0]];
  await assert.rejects(run('live', f, environment(), async (_, options) =>
    options.method === 'GET' ? Response.json([]) :
      Response.json({ errorCode: 'FORBIDDEN' }, { status: 403 })), hasCode('STATE_READ_FAILED'));
});
test('differential normalizes identities but still checks each side', async () => {
  const f = fixture(); f.scenarios = [f.scenarios[0]];
  const env = { ...environment(), ...environment('B', 100) };
  const result = await run('differential', f, env, async (url, options) => {
    if (options.method === 'GET') {
      return Response.json([{ status: 'draft',
        assigned_to_user_id: String(url).includes(uuid(110)) ? uuid(101) : uuid(1) }]);
    }
    return Response.json({ errorCode: 'FORBIDDEN' }, { status: 403 });
  });
  assert.equal(result.passed, true);
});
test('assertion failure stops subsequent requests without retry', async () => {
  const f = fixture();
  delete f.scenarios[0].expected.state;
  let calls = 0;
  const result = await run('live', f, environment(), async () => {
    calls++; return Response.json({}, { status: 200 });
  });
  assert.equal(calls, 1);
  assert.equal(result.passed, false);
});
test('CLI missing config is distinctly blocked and never prints raw path errors', async () => {
  assert.equal((await cli([])).exitCode, 3);
  assert.equal((await cli(['live', fixturePath], {})).exitCode, 3);
  const result = await cli(['replay', '/private/nonexistent-scenario.json']);
  assert.equal(result.exitCode, 2);
  assert.deepEqual(result.output, { passed: false, code: 'FIXTURE_UNREADABLE' });
});

test('blog transition and reopen route selection use explicit scenario payloads', async () => {
  const f = fixture(); f.scenarios = f.scenarios.slice(1);
  const routes = [];
  const result = await run('live', f, environment(), async (url, options) => {
    routes.push(String(url));
    const reopen = String(url).endsWith('/reopen-brief');
    assert.deepEqual(JSON.parse(options.body), reopen ?
      { reason: 'Synthetic regression case' } : { publisher_status: 'completed' });
    return Response.json({ errorCode: reopen ? 'FORBIDDEN' : 'BAD_REQUEST' },
      { status: reopen ? 403 : 400 });
  });
  assert.equal(result.passed, true);
  assert.match(routes[0], /\/api\/blogs\/[\w-]+\/transition$/);
  assert.match(routes[1], /\/api\/social-posts\/[\w-]+\/reopen-brief$/);
});
test('differential blocks both sides before transport when second-side config is missing', async () => {
  await assert.rejects(run('differential', fixture(), environment(), () => assert.fail('network')),
    (e) => e.exitCode === 3);
});
test('streaming response timeout also bounds slow body reads', async () => {
  const body = new ReadableStream({ start() {} });
  await assert.rejects(boundedJson('http://unused.test', {}, async () => new Response(body), 10),
    hasCode('REQUEST_TIMEOUT'));
});
test('fixture reads reject oversized and non-regular files', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'workflow-harness-'));
  try {
    const path = join(dir, 'oversized.json');
    await writeFile(path, ' '.repeat(65537));
    await assert.rejects(loadFixture(path), hasCode('FIXTURE_TOO_LARGE'));
    await assert.rejects(loadFixture(dir), hasCode('FIXTURE_NOT_REGULAR_FILE'));
  } finally { await rm(dir, { recursive: true, force: true }); }
});
