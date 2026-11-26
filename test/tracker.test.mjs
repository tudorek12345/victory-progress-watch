import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { build } from '../scripts/build.mjs';
import { BASE, SOURCE } from '../scripts/model.mjs';
import { scout } from '../scripts/scout.mjs';

const api = 'https://api.github.com/repos/tudorek12345/Leonida';
const metadata = { full_name: SOURCE, private: false, archived: false, pushed_at: '2026-11-24T08:18:14Z' };
const fixture = () => ({
  schemaVersion: 1,
  updatedAt: '2026-11-24T03:00:00-05:00',
  repositories: [SOURCE, 'example/ignored-mirror'],
  mirrorIsSeparateEffort: false,
  rawGameEvidenceIncluded: false,
  validation: { independentlyReproduced: false, renderedGameplayVerified: false },
  observations: [{ kind: 'hardware-intro', fps: 30, frameTimeMs: 33.3, scope: 'short intro only; not gameplay' }],
  tasks: [
    { id: 'trace-single-list', status: 'completed', checked: true, title: '<script>discard me</script>' },
    { id: 'failure-diagnostics', status: 'completed', checked: true },
    { id: 'bounded-debug-repro', status: 'in_progress', checked: false },
    { id: 'verify-gameplay', status: 'pending', checked: false },
  ],
  unrelatedLinks: ['https://example.invalid/ignored'],
});

async function scratch(t) {
  const directory = await mkdtemp(join(tmpdir(), 'victory-watch-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  return directory;
}

function fetchPair(feedResponse) {
  const calls = [];
  return {
    calls,
    fetchImpl: async (url, options) => {
      calls.push(url);
      assert.equal(options.redirect, 'error');
      assert.ok(options.signal instanceof AbortSignal);
      assert.equal(Object.hasOwn(options.headers, 'authorization'), false);
      if (url === api) return Response.json(metadata);
      assert.equal(url, `${api}/contents/tracking/runtime-progress.json`);
      assert.equal(options.headers.accept, 'application/vnd.github.raw+json');
      return feedResponse();
    },
  };
}

test('Scout projects the two allowlisted responses and leaves unchanged data untouched', async (t) => {
  const snapshotPath = join(await scratch(t), 'snapshot.json');
  const feed = fixture();
  const { calls, fetchImpl } = fetchPair(() => Response.json(feed));
  assert.equal(await scout({ fetchImpl, snapshotPath }), true);
  assert.deepEqual(calls, [api, `${api}/contents/tracking/runtime-progress.json`]);
  const raw = await readFile(snapshotPath, 'utf8');
  assert.doesNotMatch(raw, /<script>|ignored|https:/);
  const saved = JSON.parse(raw);
  assert.equal(saved.progress.updatedAt, '2026-11-24T08:00:00.000Z');
  assert.deepEqual(saved.progress.hardwareIntro, { fps: 30, frameTimeMs: 33.3 });
  const before = await stat(snapshotPath);
  feed.tasks.reverse();
  assert.equal(await scout({ fetchImpl, snapshotPath }), false);
  assert.equal((await stat(snapshotPath)).mtimeMs, before.mtimeMs);
  feed.tasks.find((task) => task.id === 'bounded-debug-repro').status = 'completed';
  feed.tasks.find((task) => task.id === 'bounded-debug-repro').checked = true;
  assert.equal(await scout({ fetchImpl, snapshotPath }), true);
  assert.equal(JSON.parse(await readFile(snapshotPath, 'utf8')).progress.tasks['bounded-debug-repro'].checked, true);
});

test('failed feeds preserve the seeded snapshot byte-for-byte', async (t) => {
  const dir = await scratch(t);
  const snapshotPath = join(dir, 'snapshot.json');
  const original = await readFile(new URL('../data/snapshot.json', import.meta.url));
  await writeFile(snapshotPath, original);
  const contradictory = fixture();
  contradictory.tasks[0].checked = false;
  const wrongScope = fixture();
  wrongScope.observations[0].scope = 'gameplay';
  const failures = [
    [() => new Response('rate limited', { status: 429 }), /HTTP 429/],
    [() => new Response('{'), /Invalid progress feed JSON/],
    [() => new Response('x'.repeat(128 * 1024 + 1)), /response size/],
    [() => Response.json(contradictory), /Invalid task/],
    [() => Response.json(wrongScope), /Invalid hardware intro scope/],
  ];
  for (const [respond, expected] of failures) {
    await assert.rejects(scout({ ...fetchPair(respond), snapshotPath }), expected);
    assert.deepEqual(await readFile(snapshotPath), original);
  }
  assert.deepEqual(await readdir(dir), ['snapshot.json']);
});

test('offline build ties the dashboard, dated article, RSS and sitemap to the Pages path', async (t) => {
  const dir = await scratch(t);
  const out = join(dir, 'dist');
  const snapshotPath = join(dir, 'snapshot.json');
  await scout({ ...fetchPair(() => Response.json(fixture())), snapshotPath });
  await build(out, snapshotPath);
  const read = (path) => readFile(join(out, path), 'utf8');
  const articlePath = 'news/2026-11-24-intro-and-world-entry/';
  const localArticlePath = 'news/2026-11-26-software-world-transition/';
  const [home, archive, article, localArticle, rss, sitemap] = await Promise.all([
    read('index.html'), read('news/index.html'), read(`${articlePath}index.html`),
    read(`${localArticlePath}index.html`), read('rss.xml'), read('sitemap.xml'),
  ]);
  assert.match(home, /30 FPS/);
  assert.match(home, /Development continues in <a href="https:\/\/github\.com\/tudorek12345\/VictoryIsInOurName\.hep">/);
  assert.match(home, /Historical hardware intro/);
  assert.match(home, /Historical runtime checklist/);
  assert.match(home, /GitHub blocked access to the source repository on November 24, 2026/);
  assert.match(home, /https:\/\/github\.com\/github\/dmca\/blob\/master\/2026\/11\/2026-11-24-take-two\.md/);
  assert.match(home, /hep-rumble-stream/);
  assert.match(home, /2026-11-26T04:00:00\+01:00/);
  assert.match(home, /https:\/\/rumble\.com\/user\/hepdev/);
  assert.match(home, /2 of 4 tracked milestones checked/);
  assert.match(home, /Rendered gameplay<\/dt><dd>Not verified/);
  assert.match(home, /not a gameplay benchmark/);
  assert.ok(archive.includes(`href="../${articlePath}"`));
  assert.ok(archive.includes(`href="../${localArticlePath}"`));
  assert.match(localArticle, /D3D12 WARP software rendering/);
  assert.match(localArticle, /Controllable gameplay remains unverified/);
  assert.doesNotMatch(localArticle, /Historical progress feed/);
  assert.ok(article.includes(`rel="canonical" href="${BASE}${articlePath}"`));
  assert.match(article, /href="\.\.\/\.\.\/style\.css"/);
  await read('style.css');
  assert.ok(rss.includes(`<guid isPermaLink="true">${BASE}${articlePath}</guid>`));
  assert.ok(rss.includes(`<guid isPermaLink="true">${BASE}${localArticlePath}</guid>`));
  assert.ok(rss.includes(`href="${BASE}rss.xml"`));
  assert.equal(await read('news/feed.xml'), rss);
  assert.match(archive, /3:41 AM EST/);
  assert.deepEqual([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]),
    [BASE, `${BASE}news/`, `${BASE}${localArticlePath}`, `${BASE}news/2026-11-24-guest-submission-and-hardware-repro/`, `${BASE}${articlePath}`]);
  assert.doesNotMatch([archive, article, localArticle, rss, sitemap].join(''), /VictoryIsInOurName\.hep|portwatch-vi/i);
  assert.doesNotMatch(home, /portwatch-vi/i);
});
