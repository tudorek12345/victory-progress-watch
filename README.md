# Victory Progress Watch

An original static dashboard for the public runtime progress reported by `tudorek12345/Leonida`. The short hardware intro measurement is scoped to the intro; the gameplay and independent-reproduction flags are displayed separately.

## Local use (Node.js 22)

```sh
node --test
node scripts/build.mjs
node scripts/scout.mjs
```

`build` works offline and regenerates `dist/` from the checked-in snapshot and editorial notes. `scout` makes two unauthenticated GitHub API requests: repository metadata and `tracking/runtime-progress.json` from its default branch. Each request rejects redirects and is capped at 128 KiB and 10 seconds. Scout projects only the allowlisted fields into `data/snapshot.json`; it discards upstream prose, links, mirror metadata and unrelated observations. Invalid or unavailable responses exit nonzero and leave the last good file in place. Identical normalized responses do not rewrite the file. Updates to `data/notes.mjs` are editorial and become articles, archive entries, and RSS items.

## GitHub Pages setup

In the new `tudorek12345/victory-progress-watch` repository, use `main` as the default branch and set **Settings → Pages → Build and deployment → Source** to **GitHub Actions**. The Pages base is `https://tudorek12345.github.io/victory-progress-watch/`.

**Site deploy** runs on `main` pushes, manually on `main`, and as a reusable workflow. **Scout** runs at minute 17 every three hours (UTC), or manually on `main`. If the snapshot changes, Scout commits only `data/snapshot.json`, pushes to `main`, and calls **Site deploy** directly because pushes from the workflow token do not trigger another push workflow. The repository’s branch rules must permit that narrowly scoped automation push. Scout’s upstream reads do not use the workflow token.

A manual Scout run also deploys when the snapshot is unchanged. Generated outputs include the news archive and dated article pages, `rss.xml` (also available as `news/feed.xml`), and `sitemap.xml`. No third-party indexing credentials or ownership files are reused. This is a single-project progress site, not a public leak or download crawler.
