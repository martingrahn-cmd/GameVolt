# Adding a New Game to GameVolt

Step-by-step checklist for integrating a new game into the portal.

## Prerequisites

- Game folder at repo root: `/{game-id}/index.html`
- Thumbnail: `/assets/thumbnails/{game-id}.webp`
- (Optional) OG image: `/{game-id}/og-image.png`
- (Optional) Preview video: `/{game-id}/preview.mp4`

## 1. Game folder

Place the game in `/{game-id}/` at the repo root. The game player loads it via iframe at `/{game-id}/index.html`.

### SEO meta tags (required in game's `<head>`)

Every game page needs these in its `<head>`:

```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-PY073ZX38N"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-PY073ZX38N');
</script>

<!-- SEO -->
<title>Your Game — Free Tagline | GameVolt</title>
<meta name="description" content="Play Your Game free online — description here. No download needed.">
<meta name="keywords" content="your game, free browser game, etc">
<meta name="author" content="GameVolt">
<meta name="robots" content="index, follow">

<!-- Open Graph -->
<meta property="og:type" content="website">
<meta property="og:url" content="https://gamevolt.io/your-game/">
<meta property="og:title" content="Your Game — Free Tagline">
<meta property="og:description" content="Short description for social sharing.">
<meta property="og:image" content="https://gamevolt.io/assets/thumbnails/your-game.webp">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:site_name" content="GameVolt">

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Your Game — Free Tagline">
<meta name="twitter:description" content="Short description for social sharing.">
<meta name="twitter:image" content="https://gamevolt.io/assets/thumbnails/your-game.webp">

<!-- Canonical + Favicon -->
<link rel="canonical" href="https://gamevolt.io/your-game/">
<link rel="icon" type="image/png" href="/assets/favicon.png">
```

### postMessage bridge (required for iframe)

Add this script **before** your game script in `index.html`:

```html
<script>
function gvPost(action, payload) {
  if (window.parent !== window) {
    try { window.parent.postMessage({ type: 'gamevolt', action: action, gameId: 'YOUR_GAME_ID', payload: payload || {} }, '*'); } catch(e) {}
  }
}
// GA4 Game Event Tracker (iframe-safe)
var GameVoltTracker={gameName:null,startTime:null,hasTracked30s:false,hasTracked60s:false,timerInterval:null,
start:function(n){this.gameName=n;this.startTime=Date.now();this.hasTracked30s=false;this.hasTracked60s=false;this._send('game_start',{game_name:n});if(this.timerInterval)clearInterval(this.timerInterval);var self=this;this.timerInterval=setInterval(function(){self._checkMilestones();},5000);},
end:function(o){o=o||{};var t=this.startTime?Math.round((Date.now()-this.startTime)/1000):0;this._send('game_end',{game_name:this.gameName,play_time_seconds:t,score:o.score||null,level:o.level||null,outcome:o.outcome||'unknown'});if(this.timerInterval)clearInterval(this.timerInterval);},
_checkMilestones:function(){if(!this.startTime)return;var t=(Date.now()-this.startTime)/1000;if(t>=30&&!this.hasTracked30s){this.hasTracked30s=true;this._send('game_play_30s',{game_name:this.gameName});}if(t>=60&&!this.hasTracked60s){this.hasTracked60s=true;this._send('game_play_60s',{game_name:this.gameName});}},
_send:function(n,p){if(window.parent!==window){window.parent.postMessage({type:'gamevolt_ga4',event:n,params:p},'*');return;}if(typeof gtag==='function'){gtag('event',n,p);return;}}};
if(window.parent!==window){var s=document.getElementById('seo-content');if(s)s.style.display='none';}
</script>
```

## 2. Homepage — `/index.html`

### a) JSON-LD structured data (~line 55)

Add a `VideoGame` entry to the `ItemList` array. Increment position number.

```json
{
    "@type": "VideoGame",
    "position": 12,
    "name": "Your Game",
    "description": "Short description",
    "url": "https://gamevolt.io/your-game/",
    "genre": ["Puzzle"],
    "gamePlatform": "Web Browser"
}
```

### b) All Games grid (~line 1919)

Add a game card. Choose `data-category` from: `coffee-break`, `brain-challenge`, `action` (can combine with spaces).

```html
<a href="/play/?game=your-game" class="game-card" data-category="brain-challenge">
    <div class="game-thumbnail">
        <img src="/assets/thumbnails/your-game.webp" alt="Your Game" loading="lazy">
        <span class="game-badge new">NEW</span>        <!-- optional -->
        <span class="game-bolt">⚡</span>              <!-- if SDK integrated -->
    </div>
    <div class="game-info">
        <h3 class="game-title">Your Game</h3>
        <p class="game-description">Full marketing description.</p>
        <div class="game-tags">
            <span class="tag">Tag1</span>
            <span class="tag">Tag2</span>
        </div>
        <span class="play-btn">▶ Play Now</span>
    </div>
</a>
```

If you have a preview video, add `data-preview="/your-game/preview.mp4"` on the `<a>` tag and add this inside the thumbnail div (`.game-thumbnail`, `.ec-thumb`, or `.powered-thumb`):
```html
<video class="preview-video" muted loop playsinline preload="none"></video>
```
Do this for **all** card types where the game appears: Editor's Choice (`ec-card`), Just Launched / Powered Up (`powered-card`), and All Games (`game-card`).

### c) GAME_META object (~line 2268)

```js
"your-game": { name: "Your Game", thumb: "/assets/thumbnails/your-game.webp" }
```

Add `preview: "/your-game/preview.mp4"` if you have a video.

### d) Hero stat "Games Available"

Update the number in the hero section (search for `stat-number`):

```html
<span class="stat-number">N</span>  <!-- increment this -->
<span class="stat-label">Games Available</span>
```

### d2) Search catalog — `/js/gv-search.js`

Add the game to the `GAMES` array in the search script so it appears in search results:

```js
{ id: 'your-game', name: 'Your Game', cat: 'Puzzle', thumb: '/assets/thumbnails/your-game.webp', tags: 'puzzle logic keywords' },
```

### e) Category pill counts (~line 1901)

Update the `pill-count` numbers in the category filter buttons. Increment "All Games" and whichever categories your game belongs to (`coffee-break`, `brain-challenge`, `action`).

### f) Featured sections (if SDK-integrated)

**Just Launched**: New games section. Add a `powered-card` here for newly released games.

**Powered Up**: All SDK-integrated games with cloud save, leaderboard, and trophies. Add a `powered-card` if the game has full SDK integration.

**Trending**: Populated dynamically from GV-tracker data — add the game to the `GAME_DATA` object in the trending script at the bottom of `index.html`.

### g) Footer games list

Add `<a href="/play/?game=your-game">Your Game</a>` in the footer Games column.

## 3. Game Player — `/play/index.html`

### a) Page title names (~line 604)

```js
'your-game': 'Your Game — Free Tagline Here'
```

### b) GAMES object (~line 656)

```js
"your-game": { name: "Your Game", category: "Puzzle", path: "/your-game/", thumb: "/assets/thumbnails/your-game.webp" }
```

Add `landscape: true` if the game requires landscape orientation.

## 4. Profile Page — `/profile/index.html`

### a) GAME_NAMES (~line 797)

```js
'your-game': 'Your Game'
```

### b) GAME_THUMBS (~line 811)

```js
'your-game': '/assets/thumbnails/your-game.webp'
```

### c) TROPHY_CATALOG (~line 825)

Add trophy definitions (31 total: 15 bronze, 10 silver, 5 gold, 1 platinum):

```js
'your-game': [
    { id:'your-game-achievement_id', icon:'🏆', name:'Trophy Name', desc:'Description', tier:'bronze' },
    // ... 31 total
]
```

## 5. Category Page

Add the game to the appropriate category page(s):
- `/puzzle-games/index.html`
- `/arcade-games/index.html`
- `/action-games/index.html`
- `/board-games/index.html`

In each category page, update:
1. JSON-LD `ItemList` — add a `VideoGame` entry
2. Games grid — add a game card (use `<h2>` for title, not `<h3>`)
3. Footer — add game link

## 6. Leaderboards — `/leaderboards/index.html`

If the game has SDK leaderboard support, add a filter pill:

```html
<button class="filter-pill" data-game="your-game">Your Game</button>
```

Also update the footer.

## 7. All footers

Add `<a href="/play/?game=your-game">Your Game</a>` to the Games column in the footer of ALL pages:
- `/index.html`
- `/play/index.html` (no footer, skip)
- `/profile/index.html`
- `/leaderboards/index.html`
- `/puzzle-games/index.html`
- `/arcade-games/index.html`
- `/action-games/index.html`
- `/board-games/index.html`

## 8. Database — Supabase SQL Editor

**IMPORTANT: The game ID must be identical everywhere** — `GameVolt.init()`, `gvPost()`, `games` table, `achievement_defs` ID prefix, and `schema.sql`. A mismatch causes FK violations on score/achievement inserts and null entries in the activity feed.

### a) Add game to `games` table

```sql
INSERT INTO games (id, title, thumbnail_url) VALUES
  ('your-game', 'Your Game', '/assets/thumbnails/your-game.webp')
ON CONFLICT (id) DO NOTHING;
```

### b) Add achievement definitions (31 rows)

The `id` column must use the format `{game-id}-{trophy-id}` where `{game-id}` matches the `games` table ID exactly. The SDK constructs this same format when calling `GameVolt.achievements.unlock(trophyId)`.

```sql
INSERT INTO achievement_defs (id, game_id, title, description, icon, tier, sort_order) VALUES
  ('your-game-achievement_1', 'your-game', 'Trophy Name', 'Description', '🏆', 'bronze', 1),
  -- ... 31 total (15 bronze, 10 silver, 5 gold, 1 platinum)
  ('your-game-platinum',      'your-game', 'Master',      'Unlock all other trophies', '👑', 'platinum', 31)
ON CONFLICT (id) DO NOTHING;
```

### c) Update `/sql/schema.sql`

Add the same INSERT statements to `schema.sql` so the schema file stays in sync. The file is idempotent (safe to re-run).

## 9. Sitemap — `/sitemap.xml`

Add a new `<url>` entry for the game:

```xml
<url>
    <loc>https://gamevolt.io/your-game/</loc>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
</url>
```

---

## Quick Reference — Category Values

| data-category   | Description              |
|-----------------|--------------------------|
| coffee-break    | Quick-play casual games  |
| brain-challenge | Puzzle / strategy games  |
| action          | Action / fast-paced      |

| GAMES.category  | Description              |
|-----------------|--------------------------|
| Arcade          | Classic arcade style     |
| Puzzle          | Puzzle / brain games     |
| Action          | Action / shooters        |
| Board           | Board / card games       |

## Checklist

- [ ] Game folder at `/{game-id}/`
- [ ] Thumbnail at `/assets/thumbnails/{game-id}.webp` (filename must match game-id!)
- [ ] Preview video at `/{game-id}/preview.mp4` (optional, for hover preview on cards)
- [ ] SEO meta tags in game's `<head>` (GA4, OG, Twitter, canonical, favicon)
- [ ] postMessage + GA4 tracker in game's `index.html` (before game script)
- [ ] SDK script `<script src="/sdk/gamevolt.js"></script>` before game script (see `docs/sdk-integration.md`)
- [ ] If adding SDK to an existing game: sync local trophies on `auth.onStateChange` (see `docs/sdk-integration.md`)
- [ ] Game ID is identical in: `GameVolt.init()`, `gvPost()`, `games` table, `achievement_defs` prefix, `schema.sql`
- [ ] `/index.html` — JSON-LD, game card, GAME_META (incl. `preview` if video exists), hero stat, pill counts, footer
- [ ] `/index.html` — `data-preview` + `<video>` tag on all card types if preview video exists (ec-card, powered-card, game-card)
- [ ] `/index.html` — Featured sections if applicable (Just Launched, Powered Up)
- [ ] `/index.html` — Trending `GAME_DATA` object (at bottom of page)
- [ ] `/js/gv-search.js` — add game to `GAMES` array for search
- [ ] Game's OG image is correct (not a placeholder from another game!)
- [ ] `/play/index.html` — names, GAMES object
- [ ] `/profile/index.html` — GAME_NAMES, GAME_THUMBS, TROPHY_CATALOG
- [ ] Category page(s) — JSON-LD, game card, footer
- [ ] `/leaderboards/index.html` — filter pill, footer
- [ ] All other page footers updated
- [ ] Supabase — `INSERT INTO games` + `INSERT INTO achievement_defs` (31 rows)
- [ ] `/sql/schema.sql` — add same INSERTs to keep schema in sync
- [ ] `/sitemap.xml` — add `<url>` entry for the game
