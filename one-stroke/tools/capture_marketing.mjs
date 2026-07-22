import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:5173";
const OUT_DIR = path.resolve(process.cwd(), "assets/marketing");

async function openGame(page) {
  await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#board .cell.playable", { timeout: 15_000 });
  const title = await page.title();
  if (!title.includes("One Stroke")) {
    throw new Error(`Expected One Stroke, received page title: ${title}`);
  }
  await page.addStyleTag({
    content: `
      #gv-user-widget { display: none !important; }
      *, *::before, *::after {
        animation-delay: 0s !important;
        animation-duration: 0s !important;
        transition-duration: 0s !important;
      }
    `,
  });
  await page.evaluate(() => document.fonts?.ready);
  await page.evaluate(() => {
    window.__oneStroke?.loadCampaignLevel(84, {
      bypassLock: true,
      announce: false,
    });
  });
}

async function drawPartialSolution(page, ratio = 0.72) {
  await page.evaluate((pathRatio) => {
    const app = window.__oneStroke;
    const level = app?.state?.level;
    if (!app || !level?.solution || !Array.isArray(level.start)) return;
    app.resetLevel();
    let [x, y] = level.start;
    const moves = level.solution.slice(0, Math.max(1, Math.floor(level.solution.length * pathRatio)));
    const delta = { R: [1, 0], L: [-1, 0], U: [0, -1], D: [0, 1] };
    for (const move of moves) {
      const [dx, dy] = delta[move];
      x += dx;
      y += dy;
      app.handleCellInput(`${x},${y}`);
    }
    app.setStatus("One line. Every node. No repeats.");
  }, ratio);
}

async function captureDesktop(browser) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await openGame(page);
  await drawPartialSolution(page, 0.58);
  await page.screenshot({ path: path.join(OUT_DIR, "screenshot-desktop.png") });
  await page.close();
}

async function captureAction(browser) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await openGame(page);
  await drawPartialSolution(page, 0.82);
  await page.locator(".board-panel").screenshot({
    path: path.join(OUT_DIR, "screenshot-action.png"),
  });
  await page.close();
}

async function captureMobile(browser) {
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  });
  await openGame(page);
  await drawPartialSolution(page, 0.66);
  await page.locator(".board-panel").screenshot({
    path: path.join(OUT_DIR, "screenshot-mobile.png"),
  });
  await page.close();
}

async function captureOgImage(browser) {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  await openGame(page);
  await drawPartialSolution(page, 0.72);
  await page.evaluate(() => {
    const style = document.createElement("style");
    style.textContent = `
      .marketing-shade { position: fixed; inset: 0; z-index: 9990; pointer-events: none;
        background: linear-gradient(90deg, rgba(5,16,22,.92) 0%, rgba(5,16,22,.58) 42%, transparent 72%); }
      .marketing-copy { position: fixed; z-index: 9991; left: 54px; top: 72px; width: 440px;
        color: #eefbff; font-family: "Oxanium", sans-serif; text-shadow: 0 5px 24px #000; }
      .marketing-copy h2 { margin: 0; font-size: 70px; line-height: .95; letter-spacing: -.04em; }
      .marketing-copy p { margin: 22px 0 0; color: #a9c0cd; font: 600 25px/1.35 "Plus Jakarta Sans", sans-serif; }
      .marketing-copy strong { color: #1ed6a5; }
    `;
    document.head.append(style);
    const shade = document.createElement("div");
    shade.className = "marketing-shade";
    const copy = document.createElement("div");
    copy.className = "marketing-copy";
    copy.innerHTML = "<h2>ONE<br>STROKE</h2><p>Visit every node.<br><strong>Draw one perfect path.</strong></p>";
    document.body.append(shade, copy);
  });
  await page.screenshot({ path: path.join(OUT_DIR, "og-image.png") });
  await page.close();
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    await captureDesktop(browser);
    await captureAction(browser);
    await captureMobile(browser);
    await captureOgImage(browser);
  } finally {
    await browser.close();
  }
  console.log(`Saved One Stroke marketing assets to ${OUT_DIR}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
