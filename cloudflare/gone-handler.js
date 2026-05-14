// Cloudflare Worker: 410 Gone for legacy /game/, /tag/, /category/ paths
// Deploy: Workers & Pages > Create Worker > paste this code
// Route: gamevolt.io/game/*, gamevolt.io/tag/*, gamevolt.io/category/*

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;

    const gonePrefixes = ['/game/', '/tag/', '/category/'];
    if (gonePrefixes.some(p => path.startsWith(p))) {
      return new Response(
        `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="robots" content="noindex">
<title>Page Removed — GameVolt.io</title>
<style>
  body { font-family: system-ui, sans-serif; background: #0f1221; color: #a0a4c0; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
  .box { text-align: center; max-width: 480px; padding: 2rem; }
  h1 { color: #f0f0ff; font-size: 1.5rem; margin-bottom: 0.5rem; }
  a { color: #7c5cfc; text-decoration: none; }
  a:hover { text-decoration: underline; }
</style>
</head>
<body>
<div class="box">
  <h1>This page has been permanently removed</h1>
  <p>The game you're looking for is no longer available at this URL.</p>
  <p style="margin-top:1.5rem"><a href="https://gamevolt.io/">Browse all games at GameVolt.io</a></p>
</div>
</body>
</html>`,
        { status: 410, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      );
    }

    return fetch(request);
  }
};
