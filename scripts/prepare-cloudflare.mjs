// Runs after `next build`. Cloudflare's free plan serves at most 20,000 files per
// Worker, and Next.js writes about 9 files per page (the HTML plus navigation data).
// Links on this site are plain page loads, so only the HTML is needed: this removes
// the navigation data files and checks the total stays under the limit.
import fs from 'node:fs/promises';
import path from 'node:path';

const OUT_DIR = path.resolve('out');
const FILE_LIMIT = 20000;
const WARN_AT = 19000;

async function walk(dir, files = []) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(full, files);
    } else {
      files.push(full);
    }
  }
  return files;
}

function isNavigationData(file) {
  const rel = path.relative(OUT_DIR, file);
  if (rel.startsWith(`_next${path.sep}`)) {
    return false;
  }
  // page.txt and the per-segment page/__next.*.txt prefetch files
  return rel.endsWith('.txt') && rel !== 'robots.txt' && rel !== 'llms.txt';
}

async function removeEmptyDirs(dir) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      await removeEmptyDirs(path.join(dir, entry.name));
    }
  }
  if (dir !== OUT_DIR && (await fs.readdir(dir)).length === 0) {
    await fs.rmdir(dir);
  }
}

const before = await walk(OUT_DIR);
const removable = before.filter(isNavigationData);
await Promise.all(removable.map((file) => fs.rm(file)));
await removeEmptyDirs(OUT_DIR);

// Splitting into Workers by page type. The free plan allows 20,000 files per Worker
// (the limit is per Worker, not per account). Each group in cloudflare.config.json
// (brand pages, filter pages) gets its own Worker that Cloudflare routes by path;
// everything else stays in the main Worker. A group bigger than `splitAt` is split
// further by its next path segment, so growth never breaks a deploy.
const config = JSON.parse(await fs.readFile('cloudflare.config.json', 'utf8'));
const CONFIG_DIR = path.resolve('.cloudflare');
const COMPATIBILITY_DATE = '2026-11-01';

function mb(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

async function countFiles(target) {
  const stat = await fs.stat(target);
  return stat.isDirectory() ? (await walk(target)).length : 1;
}

async function describe(dir) {
  const files = await walk(dir);
  const sizes = await Promise.all(files.map(async (file) => ({ file, size: (await fs.stat(file)).size })));
  return {
    files: files.length,
    pages: files.filter((file) => file.endsWith('.html')).length,
    bytes: sizes.reduce((sum, item) => sum + item.size, 0),
    largest: sizes.sort((a, b) => b.size - a.size)[0]
  };
}

// Children of a group folder: "chemical.html" and the "chemical/" folder are one
// URL prefix (/…/chemical and /…/chemical/*), so they always move together.
async function listChildren(groupDir) {
  const byName = new Map();
  for (const entry of await fs.readdir(groupDir, { withFileTypes: true })) {
    const name = entry.isDirectory() ? entry.name : entry.name.replace(/\.html$/, '');
    const child = byName.get(name) || { name, entries: [], files: 0 };
    child.entries.push(entry.name);
    child.files += await countFiles(path.join(groupDir, entry.name));
    byName.set(name, child);
  }
  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
}

// Greedy packing in name order keeps the split stable between builds.
function packChildren(children, limit) {
  const bins = [];
  let current = null;
  for (const child of children) {
    if (child.files > limit) {
      throw new Error(`/${child.name} alone has ${child.files} files, over ${limit}. Add a deeper split.`);
    }
    if (!current || current.files + child.files > limit) {
      current = { children: [], files: 0 };
      bins.push(current);
    }
    current.children.push(child);
    current.files += child.files;
  }
  return bins;
}

async function moveInto(shardDir, relPath) {
  const target = path.join(shardDir, relPath);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.rename(path.join(OUT_DIR, relPath), target);
}

console.log(`Removed ${removable.length} navigation data files.`);

await fs.rm(CONFIG_DIR, { recursive: true, force: true });
await fs.mkdir(CONFIG_DIR, { recursive: true });
// Re-running without a fresh build: move pages split off last time back into out/.
async function restoreInto(fromDir, toDir) {
  for (const entry of await fs.readdir(fromDir, { withFileTypes: true })) {
    const from = path.join(fromDir, entry.name);
    const to = path.join(toDir, entry.name);
    const exists = await fs.access(to).then(() => true, () => false);
    if (entry.isDirectory() && exists) {
      await restoreInto(from, to);
    } else if (!exists) {
      await fs.rename(from, to);
    }
  }
}

for (const entry of await fs.readdir('.')) {
  if (entry.startsWith('out-')) {
    await restoreInto(path.resolve(entry), OUT_DIR);
    await fs.rm(entry, { recursive: true, force: true });
  }
}

const shards = [];

for (const group of config.groups) {
  const groupDir = path.join(OUT_DIR, group.path);
  try {
    await fs.access(groupDir);
  } catch {
    console.warn(`No pages under /${group.path}; no Worker for "${group.name}".`);
    continue;
  }

  const total = await countFiles(groupDir);
  const bins =
    total <= config.splitAt
      ? [{ whole: true }]
      : packChildren(await listChildren(groupDir), config.splitAt);

  for (const [index, bin] of bins.entries()) {
    const name = bins.length === 1 ? group.name : `${group.name}-${index + 1}`;
    const dir = path.resolve(`out-${name}`);
    const routes = [];

    if (bin.whole) {
      await moveInto(dir, group.path);
      routes.push(`${config.hostname}/${group.path}/*`);
    } else {
      for (const child of bin.children) {
        for (const entry of child.entries) {
          await moveInto(dir, path.join(group.path, entry));
        }
        routes.push(`${config.hostname}/${group.path}/${child.name}`, `${config.hostname}/${group.path}/${child.name}/*`);
      }
    }

    await fs.copyFile(path.join(OUT_DIR, '404.html'), path.join(dir, '404.html'));
    shards.push({ name, worker: `${config.workerPrefix}-${name}`, dir, routes });
  }
}

// The main Worker takes every other path on the hostname. Cloudflare sends each
// request to the most specific matching route, so the group routes win.
shards.unshift({ name: 'main', worker: config.workerPrefix, dir: OUT_DIR, routes: [`${config.hostname}/*`] });

let failed = false;
const manifest = { live: config.live, zone: config.zone, workers: [] };

for (const shard of shards) {
  const info = await describe(shard.dir);
  const label = path.relative(process.cwd(), shard.dir);
  console.log(
    `${shard.worker} <- ${label}/: ${info.files} files (${info.pages} pages), ${mb(info.bytes)}; largest ${path.relative(shard.dir, info.largest.file)} (${(info.largest.size / 1024).toFixed(0)} KB)`
  );

  if (info.largest.size > 25 * 1024 * 1024) {
    console.error(`  a file is over Cloudflare's 25 MiB per-file limit.`);
    failed = true;
  }
  if (info.files > config.fileLimit) {
    console.error(`  over the free limit of ${config.fileLimit} files per Worker.`);
    failed = true;
  }

  const wranglerConfig = {
    name: shard.worker,
    compatibility_date: COMPATIBILITY_DATE,
    assets: {
      directory: path.relative(CONFIG_DIR, shard.dir),
      html_handling: 'drop-trailing-slash',
      not_found_handling: '404-page'
    },
    workers_dev: true,
    preview_urls: true,
    // Routes are attached only once cloudflare.config.json says "live": true.
    routes: config.live ? shard.routes.map((pattern) => ({ pattern, zone_name: config.zone })) : []
  };
  const configPath = path.join(CONFIG_DIR, `wrangler.${shard.name}.json`);
  await fs.writeFile(configPath, `${JSON.stringify(wranglerConfig, null, 2)}\n`);
  manifest.workers.push({ name: shard.worker, config: path.relative(process.cwd(), configPath), routes: shard.routes });
}

await fs.writeFile(path.join(CONFIG_DIR, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Wrote ${shards.length} Worker config(s) to .cloudflare/ (routes ${config.live ? 'attached' : 'not attached: live is false'}).`);

if (failed) {
  process.exit(1);
}
