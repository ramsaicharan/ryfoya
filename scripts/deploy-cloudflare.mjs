// Deploys every Worker that scripts/prepare-cloudflare.mjs wrote to .cloudflare/.
// Page-type Workers go first and the main Worker last, so when routes are attached
// ("live": true) the pages a route points to are already there.
// Needs CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID, from the environment
// (GitHub Actions secrets) or from .env on this machine.
import fs from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

async function loadCloudflareEnv() {
  let text = '';
  try {
    text = await fs.readFile('.env', 'utf8');
  } catch {
    return;
  }
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*(CLOUDFLARE_[A-Z_]+)\s*=\s*(.*?)\s*$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
    }
  }
}

await loadCloudflareEnv();

for (const name of ['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ACCOUNT_ID']) {
  if (!process.env[name]) {
    console.error(`Missing ${name}. Set it in .env (this machine) or as a GitHub secret.`);
    process.exit(1);
  }
}

const manifest = JSON.parse(await fs.readFile('.cloudflare/manifest.json', 'utf8'));
const ordered = [...manifest.workers.slice(1), manifest.workers[0]];

for (const worker of ordered) {
  console.log(`\nDeploying ${worker.name} (${worker.config})${manifest.live ? ` with routes: ${worker.routes.join(', ')}` : ''}`);
  const result = spawnSync('npx', ['wrangler', 'deploy', '-c', worker.config], { stdio: 'inherit', env: process.env });
  if (result.status !== 0) {
    console.error(`Deploying ${worker.name} failed.`);
    process.exit(result.status || 1);
  }
}

// A Worker left over from an earlier split keeps its routes until it is deleted.
// Most-specific routes still win, but list them so they can be removed.
try {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/workers/scripts`,
    { headers: { Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}` } }
  );
  const body = await response.json();
  const prefix = manifest.workers[0].name;
  const current = new Set(manifest.workers.map((worker) => worker.name));
  const stale = (body.result || [])
    .map((script) => script.id)
    .filter((id) => (id === prefix || id.startsWith(`${prefix}-`)) && !current.has(id));
  if (stale.length > 0) {
    console.warn(`\nWorkers no longer used by this build: ${stale.join(', ')}. Delete them with: npx wrangler delete --name <name>`);
  }
} catch {
  // Listing is only a hint; a failure here doesn't affect the deploy.
}

console.log(`\nDeployed ${ordered.length} Worker(s).${manifest.live ? '' : ' Routes are not attached yet ("live": false); pages are on the workers.dev addresses.'}`);
