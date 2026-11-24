export const SOURCE = 'tudorek12345/Leonida';
export const REPOSITORY = `https://github.com/${SOURCE}`;
export const FEED_PATH = 'tracking/runtime-progress.json';
export const BASE = 'https://tudorek12345.github.io/victory-progress-watch/';
export const TASKS = Object.freeze({
  'trace-single-list': 'Trace the device removal in a single submission list',
  'failure-diagnostics': 'Distinguish guest and presenter failures in diagnostics',
  'bounded-debug-repro': 'Complete a bounded debug run through world entry',
  'verify-gameplay': 'Verify controllable hardware gameplay',
});

export function requireShape(condition, field) {
  if (!condition) throw new Error(`Invalid ${field}`);
}

const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const number = (value, max) => Number.isFinite(value) && value > 0 && value <= max;

function timestamp(value, field) {
  const parts = typeof value === 'string' &&
    /^(\d{4}-\d{2}-\d{2})T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.exec(value);
  requireShape(parts && Number.isFinite(Date.parse(value)), field);
  const day = new Date(`${parts[1]}T00:00:00Z`);
  requireShape(Number.isFinite(+day) && day.toISOString().startsWith(`${parts[1]}T`), field);
  return new Date(value).toISOString();
}

export function validateSnapshot(value) {
  requireShape(object(value) && value.schemaVersion === 1 && value.repository === SOURCE, 'snapshot identity');
  requireShape(typeof value.archived === 'boolean', 'repository archive status');
  const progress = value.progress;
  requireShape(object(progress) && object(progress.tasks) && object(progress.hardwareIntro), 'progress');
  const tasks = Object.fromEntries(Object.keys(TASKS).map((id) => {
    const task = progress.tasks[id];
    requireShape(object(task) && ['completed', 'in_progress', 'pending'].includes(task.status) &&
      task.checked === (task.status === 'completed'), `task ${id}`);
    return [id, { status: task.status, checked: task.checked }];
  }));
  const { fps, frameTimeMs } = progress.hardwareIntro;
  requireShape(number(fps, 1000) && number(frameTimeMs, 10000), 'hardware intro measurement');
  requireShape(typeof progress.independentlyReproduced === 'boolean' &&
    typeof progress.renderedGameplayVerified === 'boolean', 'verification status');
  return {
    schemaVersion: 1,
    repository: SOURCE,
    archived: value.archived,
    pushedAt: timestamp(value.pushedAt, 'repository push timestamp'),
    progress: {
      updatedAt: timestamp(progress.updatedAt, 'feed update timestamp'),
      tasks,
      hardwareIntro: { fps, frameTimeMs },
      independentlyReproduced: progress.independentlyReproduced,
      renderedGameplayVerified: progress.renderedGameplayVerified,
    },
  };
}

export function sanitize(metadata, feed) {
  requireShape(object(metadata) && metadata.full_name === SOURCE && metadata.private === false, 'public repository identity');
  requireShape(object(feed) && feed.schemaVersion === 1 && Array.isArray(feed.repositories) &&
    feed.repositories.includes(SOURCE) && feed.mirrorIsSeparateEffort === false &&
    feed.rawGameEvidenceIncluded === false, 'feed identity and scope');
  requireShape(Array.isArray(feed.tasks) && feed.tasks.length <= 32, 'feed tasks');
  const tasks = Object.fromEntries(Object.keys(TASKS).map((id) => {
    const matches = feed.tasks.filter((task) => object(task) && task.id === id);
    requireShape(matches.length === 1, `unique task ${id}`);
    return [id, matches[0]];
  }));
  requireShape(object(feed.validation) && Array.isArray(feed.observations) && feed.observations.length <= 32, 'feed observations and validation');
  const intro = feed.observations.filter((entry) => object(entry) && entry.kind === 'hardware-intro');
  requireShape(intro.length === 1 && intro[0].scope === 'short intro only; not gameplay', 'hardware intro scope');
  return validateSnapshot({
    schemaVersion: 1,
    repository: SOURCE,
    archived: metadata.archived,
    pushedAt: metadata.pushed_at,
    progress: {
      updatedAt: feed.updatedAt,
      tasks,
      hardwareIntro: intro[0],
      independentlyReproduced: feed.validation.independentlyReproduced,
      renderedGameplayVerified: feed.validation.renderedGameplayVerified,
    },
  });
}
