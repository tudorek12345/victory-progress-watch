import { mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FEED_PATH, SOURCE, requireShape, sanitize } from './model.mjs';

const API = `https://api.github.com/repos/${SOURCE}`;
const SNAPSHOT = fileURLToPath(new URL('../data/snapshot.json', import.meta.url));
const LIMIT = 128 * 1024;
const TIMEOUT_MS = 10_000;

async function request(fetchImpl, label, url, accept) {
  const response = await fetchImpl(url, {
    headers: { accept, 'user-agent': 'victory-progress-watch', 'x-github-api-version': '2022-11-28' },
    redirect: 'error',
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok || !response.body) {
    await response.body?.cancel();
    throw new Error(`${label} request failed (HTTP ${response.status})`);
  }
  const reader = response.body.getReader();
  const chunks = [];
  let bytes = 0;
  try {
    requireShape(Number(response.headers.get('content-length')) <= LIMIT, `${label} response size`);
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      requireShape(bytes <= LIMIT, `${label} response size`);
      chunks.push(value);
    }
  } catch (error) {
    await reader.cancel().catch(() => {});
    throw error;
  } finally {
    reader.releaseLock();
  }
  try {
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks, bytes)));
  } catch {
    throw new Error(`Invalid ${label} JSON`);
  }
}

export async function scout({ fetchImpl = fetch, snapshotPath = SNAPSHOT } = {}) {
  const metadata = await request(fetchImpl, 'repository metadata', API, 'application/vnd.github+json');
  const feed = await request(fetchImpl, 'progress feed', `${API}/contents/${FEED_PATH}`, 'application/vnd.github.raw+json');
  const next = `${JSON.stringify(sanitize(metadata, feed), null, 2)}\n`;
  const previous = await readFile(snapshotPath, 'utf8').catch((error) => {
    if (error.code !== 'ENOENT') throw error;
    return null;
  });
  if (previous === next) return false;

  const temporary = await mkdtemp(join(dirname(snapshotPath), '.scout-'));
  try {
    const staged = join(temporary, 'snapshot.json');
    await writeFile(staged, next, { flag: 'wx' });
    await rename(staged, snapshotPath);
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
  return true;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    console.log(await scout() ? 'Updated data/snapshot.json' : 'Snapshot is unchanged');
  } catch (error) {
    console.error(`Scout failed: ${error.message}`);
    process.exitCode = 1;
  }
}
