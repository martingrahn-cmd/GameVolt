/**
 * Cloudflare Worker — legacy path 410 + redirect bundle
 *
 * Deploy this as a Worker on the gamevolt.io zone, then bind a route:
 *
 *   Route: gamevolt.io/*    Worker: legacy-paths-410
 *
 * It only intercepts the paths it cares about. Everything else is
 * passed straight through to GitHub Pages.
 *
 * Handles three things in one Worker:
 *
 * 1. 410 Gone for legacy third-party feed paths
 *    /game/*, /tag/*, /category/*  →  410 with a polite HTML body
 *
 * 2. www → non-www canonicalisation
 *    https://www.gamevolt.io/<path>  →  301  https://gamevolt.io/<path>
 *
 * 3. Pass-through for everything else
 *    Returns fetch(request) unchanged so GitHub Pages keeps serving.
 *
 * Note: gone-410 fires BEFORE www-redirect on purpose — if a bot
 * arrives at https://www.gamevolt.io/game/something we want them to
 * see 410, not bounce twice.
 */

const LEGACY_PREFIXES = ['/game/', '/tag/', '/category/'];

const GONE_BODY = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Gone — GameVolt</title>
  <meta name="robots" content="noindex,follow">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
    body{font-family:system-ui,-apple-system,sans-serif;background:#0f1221;color:#f0f0ff;margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}
    .card{max-width:480px;text-align:center;background:rgba(25,30,55,0.7);border:1px solid rgba(124,92,252,0.15);border-radius:16px;padding:36px}
    h1{font-size:1.4rem;margin:0 0 12px;color:#a78bfa}
    p{color:#a0a4c0;line-height:1.6;margin:0 0 24px}
    a{display:inline-block;background:linear-gradient(135deg,#7c5cfc,#38bdf8);color:#fff;text-decoration:none;padding:12px 24px;border-radius:10px;font-weight:700}
  </style>
</head>
<body>
  <div class="card">
    <h1>This page is permanently gone</h1>
    <p>It was part of an older version of the site that no longer exists. GameVolt now hosts only original indie games — feel free to browse them.</p>
    <a href="https://gamevolt.io/">Go to GameVolt &rarr;</a>
  </div>
</body>
</html>`;

export default {
  async fetch(request) {
    const url = new URL(request.url);

    // 1. Legacy paths from the old third-party feed era
    if (LEGACY_PREFIXES.some(p => url.pathname.startsWith(p))) {
      return new Response(GONE_BODY, {
        status: 410,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'X-Robots-Tag': 'noindex, follow',
          'Cache-Control': 'public, max-age=86400'
        }
      });
    }

    // 2. www → non-www, preserving path + query
    if (url.hostname === 'www.gamevolt.io') {
      url.hostname = 'gamevolt.io';
      return Response.redirect(url.toString(), 301);
    }

    // 3. Everything else: pass through to origin (GitHub Pages)
    return fetch(request);
  }
};
