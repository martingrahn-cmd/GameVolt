# Cloudflare setup — redirect & 410 rules

These three SEO checklist items live entirely in DNS / Cloudflare, not in the GitHub Pages repo. They have to be configured in the Cloudflare dashboard.

> **Prerequisite:** `gamevolt.io` (and ideally `pulsegames.eu`) are added to Cloudflare and their nameservers point at Cloudflare. If they aren't on Cloudflare yet, do that first ("Add a site" → free plan is fine → update nameservers at your registrar).

---

## 1.1 — `www.gamevolt.io` → `gamevolt.io` (301)

GitHub Pages can already do this if the DNS is right, but Cloudflare gives a cleaner, faster 301 and avoids surprises.

### Step 1 — DNS

In Cloudflare → **DNS** for the `gamevolt.io` zone, make sure both records exist:

| Type  | Name | Content                       | Proxy           |
|-------|------|-------------------------------|-----------------|
| A or CNAME | `gamevolt.io` (`@`) | GitHub Pages IPs / `martingrahn-cmd.github.io` | Proxied (orange cloud) |
| CNAME | `www`             | `gamevolt.io`                                  | Proxied (orange cloud) |

GitHub Pages' four A records: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`.

### Step 2 — Bulk Redirects (recommended)

Cloudflare → **Rules** → **Redirect Rules** → **Create rule**.

- **Rule name:** `Canonicalise www to non-www`
- **When incoming requests match:** Custom filter expression
  - `(http.host eq "www.gamevolt.io")`
- **Then:**
  - URL redirect → Static → `https://gamevolt.io${http.request.uri.path}` (use the Dynamic option if asked, the value is `concat("https://gamevolt.io", http.request.uri.path)`)
  - Status code: `301`
  - Preserve query string: `On`
- Deploy

### Step 3 — Verify

```sh
curl -I https://www.gamevolt.io/snake/
# Expected:
#   HTTP/2 301
#   location: https://gamevolt.io/snake/
```

---

## 1.2 — `pulsegames.eu` → `gamevolt.io` (301, path-preserving)

This one assumes `pulsegames.eu` is also on Cloudflare. If it isn't, the simplest alternative is your registrar's built-in domain forwarding (Loopia, Namecheap, GoDaddy, etc. all have a "forward this domain" toggle — set it to *301 with path forwarding* and you're done; skip the rest of this section).

### Step 1 — DNS

In Cloudflare for the `pulsegames.eu` zone:

- An `A` record at `@` pointing at any IP (Cloudflare needs a target to proxy through; `192.0.2.1` is fine — it's a docs/test IP). Proxy: **on**.
- A CNAME `www` → `pulsegames.eu`. Proxy: **on**.

The Worker / Redirect Rule below intercepts the request before it reaches that "phantom" IP, so the IP never has to actually answer.

### Step 2 — Redirect Rule

Cloudflare → **Rules** → **Redirect Rules** for the `pulsegames.eu` zone → **Create rule**.

- **Rule name:** `pulsegames.eu → gamevolt.io`
- **Filter:**
  - `(http.host eq "pulsegames.eu") or (http.host eq "www.pulsegames.eu")`
- **Then:**
  - URL redirect → Dynamic → `concat("https://gamevolt.io", http.request.uri.path)`
  - Status: `301`
  - Preserve query string: `On`
- Deploy

### Step 3 — Verify

```sh
curl -I https://pulsegames.eu/snake/
curl -I https://www.pulsegames.eu/

# Both should return 301 with location headers pointing into gamevolt.io.
```

---

## 3.1 — 410 Gone for legacy `/game/*`, `/tag/*`, `/category/*`

These are leftover URLs from when the site was a third-party game feed (PulseGames era). robots.txt already disallows them, but Google can't see a 410 if the path is blocked from crawling — we need to **stop disallowing them** AND **return 410** so Google can re-crawl, see "permanently gone", and drop them from the index.

The `cloudflare/legacy-paths-410.js` Worker in this repo handles both 1.1 and 3.1 in one deployment. Use this if you want a single Worker; otherwise the Redirect Rule above for 1.1 is fine and you can use a Bulk-Redirect-style approach for 3.1.

### Step 1 — Deploy the Worker

1. Cloudflare → **Workers & Pages** → **Create application** → **Create Worker**
2. Name: `legacy-paths-410`
3. **Quick Edit** → paste the contents of `cloudflare/legacy-paths-410.js` from this repo
4. **Save and Deploy**

### Step 2 — Bind a route

In the Worker's settings → **Triggers** → **Add route**:

- Route: `gamevolt.io/*`
- Zone: `gamevolt.io`
- Add another route for `www.gamevolt.io/*` (so the www → non-www redirect inside the Worker fires too)

The Worker only acts on legacy paths and on `www.*` — everything else falls through `fetch(request)` to GitHub Pages.

### Step 3 — Update robots.txt (this repo)

Once 410 is live, the robots.txt `Disallow: /game/` lines become harmful — they prevent Google from re-crawling and seeing the 410. **Remove them after the Worker is verified live.** Recommended timing:

1. Deploy Worker (above)
2. Verify with curl (below) — wait until verification passes for ≥1 hour
3. Edit `robots.txt`: remove `Disallow: /game/`, `Disallow: /tag/`, `Disallow: /category/` lines
4. Commit + push, wait for Pages deploy
5. Submit `robots.txt` for re-crawling in GSC (it auto-detects within a day or two)

### Step 4 — Verify

```sh
curl -I https://gamevolt.io/game/dogecoin-clicker
# Expected:
#   HTTP/2 410
#   x-robots-tag: noindex, follow
#   content-type: text/html; charset=utf-8

curl -I https://gamevolt.io/tag/cook
# Same: 410

curl -I https://gamevolt.io/snake/
# Should still be 200 — Worker passes through

curl -I https://www.gamevolt.io/snake/
# Should be 301 to https://gamevolt.io/snake/
```

### Step 5 — Submit removals in GSC

After 410s are confirmed:

- Search Console → **Indexing → Removals → New request → Remove URL**
- Submit each ghost URL one by one (the ones GSC flagged): `/game/dogecoin-clicker`, `/game/squidgame-multiplayer`, `/tag/cook`, etc. This tells Google to drop them from the index immediately rather than waiting for the next crawl.

---

## Order of operations (recommended)

1. **Now:** deploy Worker, verify 410 + www-redirect with curl. *robots.txt still has the Disallow lines — that's fine for one or two days.*
2. **+1 day:** edit `robots.txt` in this repo, push, wait for Pages deploy.
3. **+1 day:** GSC → Sitemaps → resubmit `sitemap.xml`. Removals → submit each ghost URL.
4. **+1 week:** check GSC Pages report — "Discovered, not indexed" should drop and "Indexed" should climb.
5. **Optional:** add `pulsegames.eu` to Cloudflare and configure its redirect rule.

---

## If you don't want Cloudflare at all

The next best fallback is a static `/game/index.html` and `/tag/index.html` with a `noindex,follow` meta tag and a refresh redirect to `/`. It's not a true 410 — Google treats it as "soft 404" — but it gets the URLs out of the index over weeks rather than hours. Say the word and I can drop those files in.
