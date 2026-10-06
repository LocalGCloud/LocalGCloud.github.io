// Keeps the previous deploy's hashed bundles online for one more deploy. A page that was
// open or prefetched before a deploy still references the old /_astro/ CSS and JS; without
// them it renders unstyled or its search client fails to load.
//
//   node scripts/asset-manifest.mjs write
//     Last build step: list every /_astro/ file in dist/asset-manifest.json.
//   node scripts/asset-manifest.mjs carry [--live-url https://local.cloud/asset-manifest.json]
//     Just before deploying: download each file the live manifest lists that this build lacks
//     into dist/_astro/. A failed fetch is a warning, not a failure. The manifest is not
//     rewritten, so carried files drop out on the following deploy (one generation only).
//
// --dist <dir> overrides the default dist/ directory.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const manifestFile = 'asset-manifest.json';
export const liveManifestUrl = 'https://local.cloud/asset-manifest.json';
const assetPath = /^\/_astro\/(?:[A-Za-z0-9_@-][A-Za-z0-9._@-]*\/)*[A-Za-z0-9_@-][A-Za-z0-9._@-]*$/;
// Generous ceilings: a normal build has a few dozen bundles of well under 1 MB in total.
const maxCarriedFiles = 500;
const maxCarriedBytes = 25_000_000;

// Every file under dist/_astro/, as sorted site paths.
export const listAstroAssets = (dist) => {
  const root = join(dist, '_astro');
  const walk = (directory) => readdirSync(directory, { withFileTypes: true }).flatMap((entry) => entry.isDirectory()
    ? walk(join(directory, entry.name))
    : [join(directory, entry.name)]);
  return walk(root).map((file) => `/_astro/${file.slice(root.length + 1).split('\\').join('/')}`).sort();
};

export const serializeManifest = (files) => `${JSON.stringify({ version: 1, files }, null, 2)}\n`;

// The manifest's file list. Anything other than plain /_astro/ paths makes the whole manifest
// untrusted, so a malformed or hostile file can never write outside dist/_astro/.
export const parseManifest = (text) => {
  const manifest = JSON.parse(text);
  if (manifest?.version !== 1 || !Array.isArray(manifest.files)) throw new Error('not a version 1 asset manifest');
  for (const file of manifest.files) {
    if (typeof file !== 'string' || !assetPath.test(file)) throw new Error(`invalid asset path ${JSON.stringify(file)}`);
  }
  return [...new Set(manifest.files)];
};

// Files the previous deploy served that this build neither lists nor already has on disk.
export const planCarryOver = (previousFiles, currentFiles, existsInDist = () => false) => {
  const current = new Set(currentFiles);
  return [...new Set(previousFiles)].filter((file) => !current.has(file) && !existsInDist(file));
};

export const writeManifest = (dist) => {
  const files = listAstroAssets(dist);
  if (!files.length) throw new Error(`No /_astro/ files found in ${dist}`);
  writeFileSync(join(dist, manifestFile), serializeManifest(files));
  return files;
};

export const carryPreviousAssets = async ({ dist, liveUrl = liveManifestUrl, fetchImpl = fetch, log = console.log }) => {
  const current = parseManifest(readFileSync(join(dist, manifestFile), 'utf8'));
  const request = (url) => fetchImpl(url, { signal: AbortSignal.timeout(20_000), headers: { 'User-Agent': 'localcloud-site-deploy' } });
  let previous;
  try {
    const response = await request(liveUrl);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    previous = parseManifest(await response.text());
  } catch (error) {
    log(`::warning::Not carrying previous bundles: could not read ${liveUrl} (${error instanceof Error ? error.message : error}).`);
    return { carried: [], failed: [] };
  }
  const plan = planCarryOver(previous, current, (file) => existsSync(join(dist, file)));
  if (plan.length > maxCarriedFiles) {
    log(`::warning::Not carrying previous bundles: the live manifest lists ${plan.length} files this build lacks (limit ${maxCarriedFiles}).`);
    return { carried: [], failed: plan };
  }
  const carried = [];
  const failed = [];
  let bytes = 0;
  for (const file of plan) {
    try {
      const response = await request(new URL(file, liveUrl));
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const body = Buffer.from(await response.arrayBuffer());
      if (bytes + body.length > maxCarriedBytes) throw new Error(`carrying it would exceed ${maxCarriedBytes} bytes`);
      bytes += body.length;
      const target = join(dist, file);
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, body);
      carried.push(file);
    } catch (error) {
      failed.push(file);
      log(`::warning::Could not carry ${file} from the previous deploy (${error instanceof Error ? error.message : error}).`);
    }
  }
  log(`Carried ${carried.length} of ${plan.length} previous-deploy bundles into dist/_astro/ (${bytes} bytes); ${current.length} bundles are this build's own.`);
  return { carried, failed };
};

const option = (args, name, fallback) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : fallback;
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [command, ...args] = process.argv.slice(2);
  const dist = option(args, '--dist', fileURLToPath(new URL('../dist/', import.meta.url)));
  if (command === 'write') {
    console.log(`Listed ${writeManifest(dist).length} /_astro/ files in dist/${manifestFile}.`);
  } else if (command === 'carry') {
    await carryPreviousAssets({ dist, liveUrl: option(args, '--live-url', liveManifestUrl) });
  } else {
    console.error('Usage: node scripts/asset-manifest.mjs write|carry [--dist <dir>] [--live-url <url>]');
    process.exitCode = 2;
  }
}
