/**
 * Verify the static contract between One Stroke HTML, JavaScript and ARIA.
 * Run: node tools/verify_dom_contract.mjs
 * Optional verifier smoke test: node tools/verify_dom_contract.mjs --self-test
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const GAME_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const HTML_FILE = path.join(GAME_ROOT, "index.html");
const SCRIPT_FILES = [
  path.join(GAME_ROOT, "src/main.js"),
  path.join(GAME_ROOT, "src/game/app.js"),
];
const IDREF_ATTRIBUTES = [
  "aria-activedescendant",
  "aria-controls",
  "aria-describedby",
  "aria-details",
  "aria-errormessage",
  "aria-flowto",
  "aria-labelledby",
  "aria-owns",
  "for",
];

function collectMatches(source, pattern) {
  return [...source.matchAll(pattern)].map((match) => match[1]);
}

export async function verifyDomContract(overrides = {}) {
  const errors = [];
  const html = overrides.html ?? await fs.readFile(HTML_FILE, "utf8");
  const scripts = overrides.scripts ?? await Promise.all(
    SCRIPT_FILES.map((file) => fs.readFile(file, "utf8")),
  );
  const combinedScripts = `${scripts.join("\n")}\n${html}`;
  const ids = collectMatches(html, /\bid=["']([^"']+)["']/g);
  const idSet = new Set(ids);
  const duplicateIds = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
  duplicateIds.forEach((id) => errors.push(`Duplicate HTML id: #${id}`));

  const jsIdReferences = new Set([
    ...collectMatches(combinedScripts, /getElementById\(\s*["']([^"']+)["']\s*\)/g),
    ...collectMatches(combinedScripts, /querySelector\(\s*["']#([a-zA-Z][\w:-]*)["']\s*\)/g),
  ]);
  for (const id of jsIdReferences) {
    if (!idSet.has(id)) errors.push(`JavaScript references missing element: #${id}`);
  }

  const idRefPattern = new RegExp(
    `\\b(?:${IDREF_ATTRIBUTES.join("|")})=["']([^"']+)["']`,
    "g",
  );
  const ariaReferences = collectMatches(html, idRefPattern)
    .flatMap((value) => value.trim().split(/\s+/))
    .filter(Boolean);
  for (const id of ariaReferences) {
    if (!idSet.has(id)) errors.push(`HTML IDREF points to missing element: #${id}`);
  }

  const fragmentReferences = collectMatches(html, /\bhref=["']#([^"']+)["']/g);
  for (const id of fragmentReferences) {
    if (!idSet.has(id)) errors.push(`Fragment link points to missing element: #${id}`);
  }

  return {
    ok: errors.length === 0,
    errors,
    summary: {
      htmlIds: ids.length,
      jsIdReferences: jsIdReferences.size,
      ariaReferences: ariaReferences.length,
      fragmentReferences: fragmentReferences.length,
    },
  };
}

function printResult(result) {
  if (!result.ok) {
    console.error("❌ DOM contract verification failed:");
    result.errors.forEach((error) => console.error(`  - ${error}`));
    return;
  }
  console.log("✅ DOM contract verification passed");
  console.log(`   HTML ids: ${result.summary.htmlIds}`);
  console.log(`   JavaScript id references: ${result.summary.jsIdReferences}`);
  console.log(`   ARIA/label references: ${result.summary.ariaReferences}`);
  console.log(`   Fragment references: ${result.summary.fragmentReferences}`);
}

async function main() {
  if (process.argv.includes("--self-test")) {
    const html = await fs.readFile(HTML_FILE, "utf8");
    const broken = html.replace('id="levelName"', 'id="levelName-broken"');
    const result = await verifyDomContract({ html: broken });
    if (result.ok || !result.errors.some((error) => error.includes("#levelName"))) {
      console.error("❌ Verifier self-test failed to catch a stale JavaScript ID reference");
      process.exitCode = 1;
      return;
    }
    console.log("✅ Verifier self-test caught a stale JavaScript ID reference");
    return;
  }

  const result = await verifyDomContract();
  printResult(result);
  if (!result.ok) process.exitCode = 1;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
