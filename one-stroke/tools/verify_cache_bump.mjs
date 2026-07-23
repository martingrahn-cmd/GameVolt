/**
 * Require a service-worker cache bump whenever a precached runtime file changes.
 *
 * CI:    node tools/verify_cache_bump.mjs --base <git-sha>
 * Local: node tools/verify_cache_bump.mjs --base HEAD --include-worktree
 * Test:  node tools/verify_cache_bump.mjs --self-test
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SW_REPO_PATH = "one-stroke/sw.js";
const SW_FILE = path.join(REPO_ROOT, SW_REPO_PATH);

function parseServiceWorker(source) {
  const versionMatch = source.match(/const CACHE_NAME = ["']one-stroke-v(\d+)["']/);
  const precacheMatch = source.match(/const PRECACHE_URLS = \[([\s\S]*?)\];/);
  if (!versionMatch || !precacheMatch) {
    throw new Error("Could not parse cache version or PRECACHE_URLS");
  }
  const urls = [...precacheMatch[1].matchAll(/["']([^"']+)["']/g)].map((match) => match[1]);
  return { version: Number(versionMatch[1]), urls };
}

function repoPathForPrecacheUrl(url) {
  if (url === "./") return "one-stroke/index.html";
  return `one-stroke/${url.replace(/^\.?\//, "")}`;
}

export function evaluateCacheBump({
  baseVersion,
  currentVersion,
  changedFiles,
  precachedFiles,
}) {
  const relevantFiles = new Set([...precachedFiles, SW_REPO_PATH]);
  const changedRuntimeFiles = changedFiles.filter((file) => relevantFiles.has(file));
  const errors = [];
  if (changedRuntimeFiles.length > 0 && currentVersion <= baseVersion) {
    errors.push(
      `Precached runtime changed without cache bump: v${baseVersion} → v${currentVersion}`,
    );
  }
  if (currentVersion < baseVersion) {
    errors.push(`Cache version moved backwards: v${baseVersion} → v${currentVersion}`);
  }
  return {
    ok: errors.length === 0,
    errors,
    summary: {
      baseVersion,
      currentVersion,
      changedRuntimeFiles,
      bumpRequired: changedRuntimeFiles.length > 0,
    },
  };
}

function git(args) {
  return execFileSync("git", args, {
    cwd: REPO_ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

async function verifyAgainstBase(base, includeWorktree) {
  const current = parseServiceWorker(await fs.readFile(SW_FILE, "utf8"));
  const baseSource = git(["show", `${base}:${SW_REPO_PATH}`]);
  const previous = parseServiceWorker(baseSource);
  const diffTarget = includeWorktree ? base : `${base}..HEAD`;
  const changed = git(["diff", "--name-only", diffTarget])
    .split("\n")
    .filter(Boolean);
  if (includeWorktree) {
    const untracked = git(["ls-files", "--others", "--exclude-standard", "one-stroke"])
      .split("\n")
      .filter(Boolean);
    changed.push(...untracked);
  }
  const precachedFiles = new Set(
    [...previous.urls, ...current.urls].map(repoPathForPrecacheUrl),
  );
  return evaluateCacheBump({
    baseVersion: previous.version,
    currentVersion: current.version,
    changedFiles: [...new Set(changed)],
    precachedFiles,
  });
}

function printResult(result) {
  if (!result.ok) {
    console.error("❌ Cache bump verification failed:");
    result.errors.forEach((error) => console.error(`  - ${error}`));
    result.summary.changedRuntimeFiles.forEach((file) => console.error(`    ${file}`));
    return;
  }
  const requirement = result.summary.bumpRequired
    ? `${result.summary.changedRuntimeFiles.length} runtime file(s) changed`
    : "no precached runtime files changed";
  console.log("✅ Cache bump verification passed");
  console.log(`   Cache version: v${result.summary.baseVersion} → v${result.summary.currentVersion}`);
  console.log(`   Change scope: ${requirement}`);
}

async function main() {
  if (process.argv.includes("--self-test")) {
    const result = evaluateCacheBump({
      baseVersion: 18,
      currentVersion: 18,
      changedFiles: ["one-stroke/src/game/app.js"],
      precachedFiles: new Set(["one-stroke/src/game/app.js"]),
    });
    if (result.ok || !result.errors.some((error) => error.includes("without cache bump"))) {
      console.error("❌ Verifier self-test failed to catch a missing cache bump");
      process.exitCode = 1;
      return;
    }
    console.log("✅ Verifier self-test caught a changed runtime file without a cache bump");
    return;
  }

  const baseIndex = process.argv.indexOf("--base");
  const base = baseIndex >= 0 ? process.argv[baseIndex + 1] : null;
  if (!base) {
    console.error("Usage: verify_cache_bump.mjs --base <git-sha> [--include-worktree]");
    process.exitCode = 1;
    return;
  }
  const result = await verifyAgainstBase(base, process.argv.includes("--include-worktree"));
  printResult(result);
  if (!result.ok) process.exitCode = 1;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
