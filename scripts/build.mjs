import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { notes } from '../data/notes.mjs';
import { BASE, FEED_PATH, REPOSITORY, SOURCE, TASKS, validateSnapshot } from './model.mjs';

const name = 'Victory Progress Watch';
const summary = 'Runtime milestones and dated notes from the public Leonida progress feed.';
const projectFile = (path) => fileURLToPath(new URL(`../${path}`, import.meta.url));
const absolute = (path = '') => new URL(path, BASE).href;
const feedLink = `${REPOSITORY}/blob/HEAD/${FEED_PATH}`;
const escape = (text) => String(text).replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[c]);
const format = new Intl.DateTimeFormat('en', {
  year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit',
  timeZone: 'America/New_York', timeZoneName: 'short',
});
const time = (stamp) => `<time datetime="${escape(stamp)}">${escape(format.format(new Date(stamp)))}</time>`;
const notePath = (note) => `news/${note.slug}/`;
const statusLabels = { completed: 'Checked', in_progress: 'In progress', pending: 'Pending' };

function page(path, title, description, body) {
  const prefix = '../'.repeat(path.split('/').length - 1);
  const home = prefix || './';
  const archive = `${prefix}news/`;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escape(title === name ? name : `${title} | ${name}`)}</title>
  <meta name="description" content="${escape(description)}">
  <link rel="canonical" href="${escape(absolute(path))}">
  <link rel="alternate" type="application/rss+xml" title="${name}" href="${absolute('rss.xml')}">
  <link rel="stylesheet" href="${prefix}style.css">
</head>
<body>
  <header class="bar"><a class="brand" href="${home}">${name}</a>
    <nav aria-label="Main"><a href="${home}"${path === '' ? ' aria-current="page"' : ''}>Status</a><a href="${archive}"${path === 'news/' ? ' aria-current="page"' : ''}>News</a><a href="${prefix}rss.xml">RSS</a></nav>
  </header>
  <main>${body}</main>
  <footer>Single-source tracker · <a href="${REPOSITORY}">${SOURCE}</a></footer>
</body>
</html>
`;
}

const noteList = (entries, prefix = '') => `<ul class="notes">${entries.map((note) => `
  <li>${time(note.publishedAt)}<h3><a href="${prefix}${notePath(note)}">${escape(note.title)}</a></h3><p>${escape(note.summary)}</p></li>`).join('')}
</ul>`;

function dashboard(snapshot, entries, rumbleBanner) {
  const { progress } = snapshot;
  const complete = Object.values(progress.tasks).filter((task) => task.checked).length;
  const tasks = Object.entries(progress.tasks).map(([id, task]) => `
      <li><span>${escape(TASKS[id])}</span><span class="badge ${task.status}">${statusLabels[task.status]}</span></li>`).join('');
  return page('', name, summary, `
    <section class="intro">
      <p class="eyebrow">Runtime status</p><h1>${name}</h1><p>${summary} Status reflects what the upstream project reported.</p>
    </section>
    ${rumbleBanner}
    <div class="grid">
      <section class="panel"><p class="eyebrow">Hardware intro only</p>
        <h2 class="metric">${escape(progress.hardwareIntro.fps)} FPS</h2><p>${escape(progress.hardwareIntro.frameTimeMs)} ms per frame in the short intro. This is not a gameplay benchmark.</p>
        <dl><dt>Rendered gameplay</dt><dd>${progress.renderedGameplayVerified ? 'Reported verified' : 'Not verified'}</dd>
        <dt>Independent reproduction</dt><dd>${progress.independentlyReproduced ? 'Reported' : 'Not reported'}</dd></dl>
      </section>
      <section class="panel"><h2>Runtime checklist</h2><p>${complete} of ${Object.keys(TASKS).length} tracked milestones checked</p><ul class="checklist">${tasks}
      </ul></section>
    </div>
    <p class="source"><a href="${feedLink}">Upstream progress feed</a> updated ${time(progress.updatedAt)}.<br>
    ${snapshot.archived ? 'Repository is archived. ' : ''}Latest repository push: ${time(snapshot.pushedAt)}.</p>
    <section><h2>Latest notes</h2>${entries.length ? noteList(entries.slice(0, 3)) : '<p>No published notes yet.</p>'}<p><a href="news/">News archive →</a></p></section>`);
}

export async function build(output = projectFile('dist'), snapshotPath = projectFile('data/snapshot.json')) {
  const snapshot = validateSnapshot(JSON.parse(await readFile(snapshotPath, 'utf8')));
  const entries = [...notes].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  const slugs = new Set();
  for (const note of entries) {
    if (!/^\d{4}-\d{2}-\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(note.slug) || slugs.has(note.slug) ||
        new Date(note.publishedAt).toISOString() !== note.publishedAt || !note.slug.startsWith(note.publishedAt.slice(0, 10))) {
      throw new Error('Invalid or duplicate news note');
    }
    slugs.add(note.slug);
  }

  const archive = page('news/', 'News archive', 'Dated runtime notes from Victory Progress Watch.', `
    <section class="intro"><p class="eyebrow">Field notes</p><h1>News archive</h1><p>Updates on reported measurements, checks, and open questions.</p></section>
    <section><h2>Published notes</h2>${entries.length ? noteList(entries, '../') : '<p>No published notes yet.</p>'}</section>`);
  const articles = entries.map((note) => [notePath(note), page(notePath(note), note.title, note.summary, `
    <article><header class="intro"><p class="eyebrow">Runtime note · ${time(note.publishedAt)}</p><h1>${escape(note.title)}</h1><p>${escape(note.summary)}</p></header>
    ${note.paragraphs.map((paragraph) => `<p>${escape(paragraph)}</p>`).join('\n    ')}
    <p><a href="${feedLink}">Upstream progress feed</a> · <a href="../">Back to news</a></p></article>`)]);
  const rumbleBanner = await readFile(projectFile('site/rumble-banner.html'), 'utf8');
  const pages = [['', dashboard(snapshot, entries, rumbleBanner)], ['news/', archive], ...articles];
  const declaration = '<?xml version="1.0" encoding="UTF-8"?>';
  const rss = `${declaration}
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel>
  <title>${name}</title><link>${BASE}</link><description>${escape(summary)}</description>
  <atom:link href="${absolute('rss.xml')}" rel="self" type="application/rss+xml"/>
${entries.map((note) => `  <item><title>${escape(note.title)}</title><link>${absolute(notePath(note))}</link><guid isPermaLink="true">${absolute(notePath(note))}</guid><pubDate>${new Date(note.publishedAt).toUTCString()}</pubDate><description>${escape(note.summary)}</description></item>`).join('\n')}
</channel></rss>\n`;
  const sitemap = `${declaration}
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map(([path]) => `  <url><loc>${absolute(path)}</loc></url>`).join('\n')}
</urlset>\n`;

  await rm(output, { recursive: true, force: true });
  for (const [path, contents] of [...pages.map(([path, html]) => [`${path}index.html`, html]),
    ['rss.xml', rss], ['sitemap.xml', sitemap], ['.nojekyll', '']]) {
    const destination = join(output, path);
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, contents);
  }
  await copyFile(projectFile('site/style.css'), join(output, 'style.css'));
  await writeFile(join(output, 'news', 'feed.xml'), rss);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await build();
  console.log('Built dist/');
}
