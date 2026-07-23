/**
 * Verify that the One Stroke PWA shell is complete and internally consistent.
 * Run: node tools/verify_pwa_release.mjs
 * Optional verifier smoke test: node tools/verify_pwa_release.mjs --self-test
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const GAME_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SERVICE_WORKER = path.join(GAME_ROOT, "sw.js");
const REQUIRED_SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./manifest.json",
  "./src/main.js",
];

function normalizePrecacheUrl(url) {
  if (url === "./") return url;
  return `./${url.replace(/^\.?\//, "")}`;
}

function localPathFromUrl(url) {
  return path.join(GAME_ROOT, url.replace(/^\.?\//, ""));
}

async function readServiceWorkerConfig() {
  const source = await fs.readFile(SERVICE_WORKER, "utf8");
  const cacheMatch = source.match(/const CACHE_NAME = ["']one-stroke-v(\d+)["']/);
  const precacheMatch = source.match(/const PRECACHE_URLS = \[([\s\S]*?)\];/);
  if (!precacheMatch) {
    return { cacheVersion: null, precacheUrls: [], parseError: "Could not parse PRECACHE_URLS" };
  }
  const precacheUrls = [...precacheMatch[1].matchAll(/["']([^"']+)["']/g)]
    .map((match) => normalizePrecacheUrl(match[1]));
  return {
    cacheVersion: cacheMatch ? Number(cacheMatch[1]) : null,
    precacheUrls,
    parseError: cacheMatch ? null : "CACHE_NAME must match one-stroke-v<number>",
  };
}

async function collectModuleGraph(entryUrl) {
  const visited = new Set();
  const pending = [entryUrl];

  while (pending.length > 0) {
    const moduleUrl = pending.pop();
    if (visited.has(moduleUrl)) continue;
    visited.add(moduleUrl);
    const modulePath = localPathFromUrl(moduleUrl);
    const source = await fs.readFile(modulePath, "utf8");
    const imports = [...source.matchAll(/(?:from\s+|import\s*)["']([^"']+)["']/g)]
      .map((match) => match[1])
      .filter((specifier) => specifier.startsWith("."));
    for (const specifier of imports) {
      const resolvedPath = path.resolve(path.dirname(modulePath), specifier);
      const relative = path.relative(GAME_ROOT, resolvedPath).split(path.sep).join("/");
      pending.push(normalizePrecacheUrl(relative));
    }
  }

  return visited;
}

export async function verifyPwaRelease(overrides = {}) {
  const errors = [];
  const config = await readServiceWorkerConfig();
  const precacheUrls = overrides.precacheUrls ?? config.precacheUrls;
  const precacheSet = new Set(precacheUrls);

  if (config.parseError) errors.push(config.parseError);
  if (!Number.isInteger(config.cacheVersion) || config.cacheVersion < 1) {
    errors.push("Cache version must be a positive integer");
  }
  if (precacheSet.size !== precacheUrls.length) {
    errors.push("PRECACHE_URLS contains duplicate entries");
  }

  for (const required of REQUIRED_SHELL) {
    if (!precacheSet.has(required)) errors.push(`Required shell asset is not precached: ${required}`);
  }

  for (const url of precacheSet) {
    if (url === "./") continue;
    try {
      const stat = await fs.stat(localPathFromUrl(url));
      if (!stat.isFile()) errors.push(`Precache target is not a file: ${url}`);
    } catch {
      errors.push(`Precache target does not exist: ${url}`);
    }
  }

  const manifest = JSON.parse(await fs.readFile(path.join(GAME_ROOT, "manifest.json"), "utf8"));
  const manifestAssets = [
    normalizePrecacheUrl(manifest.start_url),
    ...(manifest.icons ?? []).map((icon) => normalizePrecacheUrl(icon.src)),
  ];
  for (const url of manifestAssets) {
    if (!precacheSet.has(url)) errors.push(`Manifest asset is not precached: ${url}`);
  }

  const moduleGraph = await collectModuleGraph("./src/main.js");
  for (const moduleUrl of moduleGraph) {
    if (!precacheSet.has(moduleUrl)) {
      errors.push(`Offline module dependency is not precached: ${moduleUrl}`);
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    summary: {
      cacheVersion: config.cacheVersion,
      precacheAssets: precacheUrls.length,
      moduleCount: moduleGraph.size,
      manifestAssets: manifestAssets.length,
    },
  };
}

function printResult(result) {
  if (!result.ok) {
    console.error("❌ PWA release verification failed:");
    result.errors.forEach((error) => console.error(`  - ${error}`));
    return;
  }
  console.log("✅ PWA release verification passed");
  console.log(`   Cache version: v${result.summary.cacheVersion}`);
  console.log(`   Precache assets: ${result.summary.precacheAssets}`);
  console.log(`   Offline modules: ${result.summary.moduleCount}`);
  console.log(`   Manifest assets: ${result.summary.manifestAssets}`);
}

async function main() {
  if (process.argv.includes("--self-test")) {
    const config = await readServiceWorkerConfig();
    const broken = config.precacheUrls.filter((url) => url !== "./src/game/app.js");
    const result = await verifyPwaRelease({ precacheUrls: broken });
    if (result.ok || !result.errors.some((error) => error.includes("app.js"))) {
      console.error("❌ Verifier self-test failed to catch a missing offline module");
      process.exitCode = 1;
      return;
    }
    console.log("✅ Verifier self-test caught an omitted offline module");
    return;
  }

  const result = await verifyPwaRelease();
  printResult(result);
  if (!result.ok) process.exitCode = 1;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
