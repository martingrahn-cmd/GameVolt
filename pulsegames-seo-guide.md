# PulseGames.eu – SEO Implementation Guide

## Bakgrund & Mål

PulseGames.eu har 7 kvalitetsspel men **noll organic search traffic** eftersom:
1. Spelsidorna har nästan ingen indexerbar text (Snake-sidan har 3 ord)
2. Meta-titlar och descriptions är generiska eller saknas
3. Ingen structured data (JSON-LD) som hjälper Google förstå innehållet
4. Sitemap och robots.txt kan saknas

**Målet:** Varje spelsida ska ranka för de generiska söktermer folk faktiskt söker på ("play snake online free", "free solitaire browser" etc.).

---

## Sajten hostas på Netlify via GitHub

Struktur (bekräftad):
```
/
├── index.html          (startsidan)
├── snake/index.html
├── breakout/index.html
├── taprush/index.html
├── solitaire/index.html
├── pulseblocks/index.html
├── connect4/index.html
├── axeluga/index.html
├── about/index.html
├── contact/index.html
├── privacy/index.html
└── assets/
```

---

## 1. Filer att skapa i root

### robots.txt
```
User-agent: *
Allow: /

Sitemap: https://pulsegames.eu/sitemap.xml
```

### sitemap.xml
```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://pulsegames.eu/</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://pulsegames.eu/snake/</loc>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://pulsegames.eu/breakout/</loc>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://pulsegames.eu/taprush/</loc>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://pulsegames.eu/solitaire/</loc>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://pulsegames.eu/pulseblocks/</loc>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://pulsegames.eu/connect4/</loc>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://pulsegames.eu/axeluga/</loc>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://pulsegames.eu/about/</loc>
    <changefreq>yearly</changefreq>
    <priority>0.3</priority>
  </url>
  <url>
    <loc>https://pulsegames.eu/contact/</loc>
    <changefreq>yearly</changefreq>
    <priority>0.3</priority>
  </url>
  <url>
    <loc>https://pulsegames.eu/privacy/</loc>
    <changefreq>yearly</changefreq>
    <priority>0.2</priority>
  </url>
</urlset>
```

---

## 2. Meta-taggar per spelsida

Uppdatera `<head>` i varje spel-HTML. Kontrollera att Open Graph-taggar finns.

### snake/index.html
```html
<title>Play Snake Online Free – Classic Snake Game | PulseGames</title>
<meta name="description" content="Play Snake free in your browser! Three modes: retro Nokia 3310, synthwave Neo, and 16-bit Fruit Chain. No download, no signup – just classic snake gameplay.">
<meta name="keywords" content="snake game, play snake online, free snake game, browser snake, nokia snake, classic snake, retro snake game">
<link rel="canonical" href="https://pulsegames.eu/snake/">

<!-- Open Graph -->
<meta property="og:title" content="Play Snake Online Free – Classic Snake Game">
<meta property="og:description" content="Three unique modes: retro Nokia 3310, synthwave Neo, and 16-bit Fruit Chain. No download required.">
<meta property="og:image" content="https://pulsegames.eu/assets/thumbnails/snake.webp">
<meta property="og:url" content="https://pulsegames.eu/snake/">
<meta property="og:type" content="website">
```

### breakout/index.html
```html
<title>Play Breakout Online Free – Brick Breaker Game | PulseGames</title>
<meta name="description" content="Play Breakout free in your browser! Smash bricks, grab power-ups, beat levels and chase high scores in this classic brick breaker arcade game. No download needed.">
<meta name="keywords" content="breakout game, brick breaker, play breakout online, free breakout, browser breakout, arkanoid, arcade game">
<link rel="canonical" href="https://pulsegames.eu/breakout/">

<meta property="og:title" content="Play Breakout Online Free – Brick Breaker Game">
<meta property="og:description" content="Smash bricks, grab power-ups, beat levels and chase high scores. Free browser arcade game.">
<meta property="og:image" content="https://pulsegames.eu/assets/thumbnails/breakout.webp">
<meta property="og:url" content="https://pulsegames.eu/breakout/">
<meta property="og:type" content="website">
```

### taprush/index.html
```html
<title>Tap Rush – Free Reaction Speed Test Game Online | PulseGames</title>
<meta name="description" content="Test your reflexes in Tap Rush! Tap fast, avoid bombs, and race the clock. Free browser reaction game – no download, no signup.">
<meta name="keywords" content="reaction game, speed test, tap game, reflex test, reaction time, free browser game, tap rush">
<link rel="canonical" href="https://pulsegames.eu/taprush/">

<meta property="og:title" content="Tap Rush – Free Reaction Speed Test Game">
<meta property="og:description" content="Test your reflexes! Tap fast, avoid bombs, and race the clock. Free in your browser.">
<meta property="og:image" content="https://pulsegames.eu/assets/thumbnails/taprush.webp">
<meta property="og:url" content="https://pulsegames.eu/taprush/">
<meta property="og:type" content="website">
```

### solitaire/index.html
```html
<title>Free Solitaire Online – 6 Card Games with Leaderboards | PulseGames</title>
<meta name="description" content="Play Solitaire free online! Klondike, FreeCell, Spider, Pyramid, TriPeaks and Golf – all in one collection with global leaderboards. No download required.">
<meta name="keywords" content="free solitaire, play solitaire online, klondike solitaire, freecell, spider solitaire, pyramid solitaire, tripeaks, golf solitaire, card games, browser solitaire">
<link rel="canonical" href="https://pulsegames.eu/solitaire/">

<meta property="og:title" content="Free Solitaire Online – 6 Card Games Collection">
<meta property="og:description" content="Klondike, FreeCell, Spider, Pyramid, TriPeaks and Golf with global leaderboards. Play free in your browser.">
<meta property="og:image" content="https://pulsegames.eu/assets/thumbnails/solitaire.webp">
<meta property="og:url" content="https://pulsegames.eu/solitaire/">
<meta property="og:type" content="website">
```

### pulseblocks/index.html
```html
<title>PulseBlocks – Free Block Puzzle Game Online | PulseGames</title>
<meta name="description" content="Play PulseBlocks free in your browser! A synthwave-styled block puzzle game with Marathon, Sprint and Ultra modes plus global leaderboards. No download needed.">
<meta name="keywords" content="block puzzle, tetris-style game, free puzzle game, browser puzzle, block game online, falling blocks, puzzle game leaderboard">
<link rel="canonical" href="https://pulsegames.eu/pulseblocks/">

<meta property="og:title" content="PulseBlocks – Free Block Puzzle Game Online">
<meta property="og:description" content="Synthwave block puzzle with Marathon, Sprint and Ultra modes. Global leaderboards included.">
<meta property="og:image" content="https://pulsegames.eu/assets/thumbnails/pulseblocks.webp">
<meta property="og:url" content="https://pulsegames.eu/pulseblocks/">
<meta property="og:type" content="website">
```

### connect4/index.html
```html
<title>Play Connect 4 Online Free – Classic Strategy Game | PulseGames</title>
<meta name="description" content="Play Connect 4 free online in your browser! Challenge a friend or play against AI. Classic four-in-a-row strategy fun – no download, no signup needed.">
<meta name="keywords" content="connect 4, connect four, four in a row, play connect 4 online, free connect 4, 2 player game, strategy game, browser game">
<link rel="canonical" href="https://pulsegames.eu/connect4/">

<meta property="og:title" content="Play Connect 4 Online Free – Classic Strategy Game">
<meta property="og:description" content="Classic four-in-a-row fun! Play against a friend or challenge the AI. Free in your browser.">
<meta property="og:image" content="https://pulsegames.eu/assets/thumbnails/connect4-thumbnail.webp">
<meta property="og:url" content="https://pulsegames.eu/connect4/">
<meta property="og:type" content="website">
```

### axeluga/index.html
```html
<title>Axeluga – Free Space Shooter Game Online | PulseGames</title>
<meta name="description" content="Play Axeluga free in your browser! Vertical space shooter with 5 worlds, epic boss battles, power-ups and gamepad support. No download required.">
<meta name="keywords" content="space shooter, shoot em up, free shooter game, vertical shooter, browser space game, arcade shooter, boss battles, shmup">
<link rel="canonical" href="https://pulsegames.eu/axeluga/">

<meta property="og:title" content="Axeluga – Free Space Shooter Game Online">
<meta property="og:description" content="Battle through 5 worlds, defeat epic bosses and save the galaxy. Free browser shoot-em-up with gamepad support.">
<meta property="og:image" content="https://pulsegames.eu/assets/thumbnails/axeluga.webp">
<meta property="og:url" content="https://pulsegames.eu/axeluga/">
<meta property="og:type" content="website">
```

---

## 3. JSON-LD Structured Data per spelsida

Lägg till ett `<script type="application/ld+json">` i `<head>` på varje spelsida. Detta hjälper Google visa rich results.

### snake/
```json
{
  "@context": "https://schema.org",
  "@type": "VideoGame",
  "name": "Snake Neo",
  "description": "Classic snake game with three unique modes – Nokia 3310 retro, synthwave Neo, and 16-bit Fruit Chain. Play free in your browser.",
  "url": "https://pulsegames.eu/snake/",
  "image": "https://pulsegames.eu/assets/thumbnails/snake.webp",
  "genre": ["Arcade", "Retro", "Puzzle"],
  "gamePlatform": "Web Browser",
  "applicationCategory": "Game",
  "operatingSystem": "Any",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD"
  },
  "author": {
    "@type": "Organization",
    "name": "PulseGames",
    "url": "https://pulsegames.eu"
  },
  "aggregateRating": null,
  "numberOfPlayers": {
    "@type": "QuantitativeValue",
    "value": 1
  },
  "playMode": "SinglePlayer"
}
```

### breakout/
```json
{
  "@context": "https://schema.org",
  "@type": "VideoGame",
  "name": "Breakout Neon Drift",
  "description": "Classic brick breaker arcade game with power-ups, multiple levels and high scores. Play free in your browser.",
  "url": "https://pulsegames.eu/breakout/",
  "image": "https://pulsegames.eu/assets/thumbnails/breakout.webp",
  "genre": ["Arcade", "Classic", "Action"],
  "gamePlatform": "Web Browser",
  "applicationCategory": "Game",
  "operatingSystem": "Any",
  "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
  "author": { "@type": "Organization", "name": "PulseGames", "url": "https://pulsegames.eu" },
  "numberOfPlayers": { "@type": "QuantitativeValue", "value": 1 },
  "playMode": "SinglePlayer"
}
```

### taprush/
```json
{
  "@context": "https://schema.org",
  "@type": "VideoGame",
  "name": "Tap Rush",
  "description": "Fast-paced reaction game. Tap quickly, avoid bombs, and test your reflexes against the clock. Free browser game.",
  "url": "https://pulsegames.eu/taprush/",
  "image": "https://pulsegames.eu/assets/thumbnails/taprush.webp",
  "genre": ["Arcade", "Reaction", "Casual"],
  "gamePlatform": "Web Browser",
  "applicationCategory": "Game",
  "operatingSystem": "Any",
  "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
  "author": { "@type": "Organization", "name": "PulseGames", "url": "https://pulsegames.eu" },
  "numberOfPlayers": { "@type": "QuantitativeValue", "value": 1 },
  "playMode": "SinglePlayer"
}
```

### solitaire/
```json
{
  "@context": "https://schema.org",
  "@type": "VideoGame",
  "name": "Solitaire Collection",
  "description": "Six classic card games in one: Klondike, FreeCell, Spider, Pyramid, TriPeaks and Golf. Global leaderboards. Play free online.",
  "url": "https://pulsegames.eu/solitaire/",
  "image": "https://pulsegames.eu/assets/thumbnails/solitaire.webp",
  "genre": ["Card Game", "Classic", "Puzzle"],
  "gamePlatform": "Web Browser",
  "applicationCategory": "Game",
  "operatingSystem": "Any",
  "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
  "author": { "@type": "Organization", "name": "PulseGames", "url": "https://pulsegames.eu" },
  "numberOfPlayers": { "@type": "QuantitativeValue", "value": 1 },
  "playMode": "SinglePlayer"
}
```

### pulseblocks/
```json
{
  "@context": "https://schema.org",
  "@type": "VideoGame",
  "name": "PulseBlocks",
  "description": "Synthwave-styled block puzzle game with Marathon, Sprint and Ultra modes. Global leaderboards. Play free in your browser.",
  "url": "https://pulsegames.eu/pulseblocks/",
  "image": "https://pulsegames.eu/assets/thumbnails/pulseblocks.webp",
  "genre": ["Puzzle", "Arcade", "Strategy"],
  "gamePlatform": "Web Browser",
  "applicationCategory": "Game",
  "operatingSystem": "Any",
  "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
  "author": { "@type": "Organization", "name": "PulseGames", "url": "https://pulsegames.eu" },
  "numberOfPlayers": { "@type": "QuantitativeValue", "value": 1 },
  "playMode": "SinglePlayer"
}
```

### connect4/
```json
{
  "@context": "https://schema.org",
  "@type": "VideoGame",
  "name": "Connect 4",
  "description": "Classic four-in-a-row strategy game. Play against a friend or challenge the AI. Free browser game.",
  "url": "https://pulsegames.eu/connect4/",
  "image": "https://pulsegames.eu/assets/thumbnails/connect4-thumbnail.webp",
  "genre": ["Strategy", "Classic", "Board Game"],
  "gamePlatform": "Web Browser",
  "applicationCategory": "Game",
  "operatingSystem": "Any",
  "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
  "author": { "@type": "Organization", "name": "PulseGames", "url": "https://pulsegames.eu" },
  "numberOfPlayers": { "@type": "QuantitativeValue", "minValue": 1, "maxValue": 2 },
  "playMode": ["SinglePlayer", "MultiPlayer"]
}
```

### axeluga/
```json
{
  "@context": "https://schema.org",
  "@type": "VideoGame",
  "name": "Axeluga",
  "description": "Vertical space shooter with 5 worlds, epic boss battles, power-ups and gamepad support. Play free in your browser.",
  "url": "https://pulsegames.eu/axeluga/",
  "image": "https://pulsegames.eu/assets/thumbnails/axeluga.webp",
  "genre": ["Shooter", "Arcade", "Action"],
  "gamePlatform": "Web Browser",
  "applicationCategory": "Game",
  "operatingSystem": "Any",
  "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
  "author": { "@type": "Organization", "name": "PulseGames", "url": "https://pulsegames.eu" },
  "numberOfPlayers": { "@type": "QuantitativeValue", "value": 1 },
  "playMode": "SinglePlayer"
}
```

---

## 4. SEO-textinnehåll per spelsida

Lägg till en sektion **under spelcanvasen** (ovanför footern) på varje spelsida. Sektionen ska vara synlig HTML – INTE display:none. Använd en diskret men läsbar styling, t.ex. en container med class `game-info` eller liknande.

### Designförslag (CSS)
```css
.game-info {
  max-width: 800px;
  margin: 3rem auto 0;
  padding: 2rem;
  color: #b0b0b0;
  font-size: 0.95rem;
  line-height: 1.7;
}

.game-info h1 {
  color: #e0e0e0;
  font-size: 1.6rem;
  margin-bottom: 0.5rem;
}

.game-info h2 {
  color: #d0d0d0;
  font-size: 1.15rem;
  margin-top: 1.5rem;
  margin-bottom: 0.5rem;
}

.game-info p {
  margin-bottom: 1rem;
}
```

Anpassa färgerna till respektive spels tema. Poängen är att texten finns, är läsbar, men inte stör spelupplevelsen visuellt.

---

### SNAKE — SEO-text (`snake/index.html`)

```html
<section class="game-info">
  <h1>Play Snake Online – Free Classic Snake Game</h1>
  <p>
    Relive the golden age of mobile gaming with Snake Neo – a free browser snake game 
    inspired by the iconic Nokia phone classic. Guide your snake, eat food, grow longer 
    and try not to crash. Simple rules, endless fun, and zero downloads needed.
  </p>

  <h2>Three Unique Game Modes</h2>
  <p>
    <strong>Nokia 3310 Mode</strong> – Pixel-perfect retro gameplay that looks and feels 
    just like the original Nokia snake from the late 90s. Monochrome graphics, chunky pixels, 
    and that satisfying classic speed. Pure nostalgia.
  </p>
  <p>
    <strong>Neo Mode</strong> – A modern take on classic snake with synthwave aesthetics, 
    neon glow effects and a pulsing electronic soundtrack. Progress through levels as the 
    speed and challenge increase.
  </p>
  <p>
    <strong>16-bit Endless Mode</strong> – Colorful retro-styled endless snake gameplay 
    with wraparound mechanics. The snake exits one side of the screen and enters from the 
    other – a fun twist that changes your strategy completely.
  </p>

  <h2>How to Play</h2>
  <p>
    Use arrow keys or swipe on mobile to change direction. Eat the food to grow your snake 
    and increase your score. Avoid hitting the walls (in classic modes) or your own tail. 
    The longer your snake gets, the harder it becomes. Works on desktop, tablet and phone.
  </p>

  <h2>Why Play Snake on PulseGames?</h2>
  <p>
    PulseGames is 100% free with no ads, no account required and no downloads. Just open 
    your browser and start playing. Our Snake game runs smoothly on any device and saves 
    your high score locally so you can keep trying to beat your best.
  </p>
</section>
```

**Target keywords:** snake game, play snake online, free snake game, nokia snake, classic snake, browser snake game, retro snake


---

### BREAKOUT — SEO-text (`breakout/index.html`)

```html
<section class="game-info">
  <h1>Play Breakout Online – Free Brick Breaker Game</h1>
  <p>
    Smash your way through colorful bricks in this free browser version of the classic 
    Breakout arcade game. Control your paddle, bounce the ball and clear every level. 
    With power-ups, increasing difficulty and satisfying brick-smashing action, this 
    is the brick breaker game you've been looking for.
  </p>

  <h2>Classic Arcade Gameplay</h2>
  <p>
    Breakout Neon Drift brings the timeless Breakout formula to your browser with a 
    neon visual twist. Move your paddle left and right to keep the ball in play. 
    Each brick you break earns points, and some bricks drop power-ups that expand 
    your paddle, add extra balls or boost your score. Clear all the bricks to advance 
    to the next level.
  </p>

  <h2>How to Play</h2>
  <p>
    Use your mouse, touch screen or arrow keys to move the paddle. The ball bounces 
    automatically – your job is to keep it from falling past your paddle while aiming 
    for the bricks above. Grab power-ups as they fall for an extra edge. The game 
    gets faster and trickier as you progress through levels.
  </p>

  <h2>Free, Instant, No Download</h2>
  <p>
    No app to install, no signup needed. Breakout runs directly in your browser on 
    desktop, tablet or phone. PulseGames offers all games completely free – just 
    click and play.
  </p>
</section>
```

**Target keywords:** breakout game, brick breaker, play breakout online, free breakout game, arkanoid, arcade brick breaker, browser breakout


---

### TAP RUSH — SEO-text (`taprush/index.html`)

```html
<section class="game-info">
  <h1>Tap Rush – Free Online Reaction Speed Game</h1>
  <p>
    How fast are your reflexes? Tap Rush is a free reaction time game that challenges 
    you to tap as quickly as possible while avoiding bombs. It's fast, intense and 
    surprisingly addictive – perfect for a quick break or a serious high-score chase.
  </p>

  <h2>Test Your Reflexes</h2>
  <p>
    Targets appear on screen and you need to tap or click them before time runs out. 
    But watch out – bombs are mixed in, and hitting one costs you dearly. The faster 
    you react, the higher your score. Can you beat your own best time?
  </p>

  <h2>How to Play</h2>
  <p>
    Click or tap the targets as fast as you can. Avoid the bombs. Your score depends 
    on speed and accuracy. Works on any device – desktop mouse or mobile touchscreen.
  </p>

  <h2>Quick, Free, Browser-Based</h2>
  <p>
    Tap Rush runs instantly in your browser. No download, no account, no ads. 
    Just pure reflex-testing fun from PulseGames.
  </p>
</section>
```

**Target keywords:** reaction game, speed test game, reflex test, tap game, reaction time test, fast tap game, free reaction game


---

### SOLITAIRE — SEO-text (`solitaire/index.html`)

```html
<section class="game-info">
  <h1>Free Solitaire Online – 6 Classic Card Games</h1>
  <p>
    Play Solitaire free in your browser with six beloved card games in one collection. 
    Whether you're a Klondike purist, a FreeCell strategist or a Spider Solitaire fan, 
    PulseGames has you covered – complete with global leaderboards to see how you 
    stack up against players worldwide.
  </p>

  <h2>Six Games Included</h2>
  <p>
    <strong>Klondike</strong> – The classic solitaire everyone knows. Draw cards from 
    the stock and build four foundation piles from Ace to King.
  </p>
  <p>
    <strong>FreeCell</strong> – All cards are dealt face-up in this strategic variant. 
    Use the four free cells wisely to move cards and clear the tableau.
  </p>
  <p>
    <strong>Spider Solitaire</strong> – Build descending sequences of the same suit 
    across the tableau. Available in one-suit, two-suit and four-suit difficulty.
  </p>
  <p>
    <strong>Pyramid</strong> – Remove pairs of cards that add up to 13 from the 
    pyramid-shaped layout. A satisfying puzzle-style solitaire game.
  </p>
  <p>
    <strong>TriPeaks</strong> – Clear three peaks of cards by selecting cards one 
    higher or lower than the current card. Fast-paced and great for quick sessions.
  </p>
  <p>
    <strong>Golf Solitaire</strong> – Remove all cards from the tableau by playing 
    cards one rank higher or lower. Simple rules, surprisingly deep strategy.
  </p>

  <h2>Global Leaderboards</h2>
  <p>
    Every game tracks your score and time. Compete on the global leaderboard and 
    see where you rank among solitaire players around the world.
  </p>

  <h2>Play Free, No Download</h2>
  <p>
    No app needed, no registration. PulseGames Solitaire runs smoothly on desktop, 
    tablet and mobile browsers. Enjoy a clean, ad-free card game experience.
  </p>
</section>
```

**Target keywords:** free solitaire, play solitaire online, klondike solitaire, freecell online, spider solitaire, pyramid solitaire, tripeaks, card games free, browser solitaire


---

### PULSEBLOCKS — SEO-text (`pulseblocks/index.html`)

```html
<section class="game-info">
  <h1>PulseBlocks – Free Online Block Puzzle Game</h1>
  <p>
    PulseBlocks is a free falling-block puzzle game with a synthwave aesthetic 
    and a pumping electronic soundtrack. If you enjoy Tetris-style games, you'll 
    love the fast-paced action and the competitive leaderboards that keep you 
    coming back for one more round.
  </p>

  <h2>Three Game Modes</h2>
  <p>
    <strong>Marathon</strong> – The classic experience. Clear lines, level up, and 
    play as long as you can as the speed gradually increases.
  </p>
  <p>
    <strong>Sprint</strong> – Race to clear 40 lines as fast as possible. Every 
    second counts on the leaderboard.
  </p>
  <p>
    <strong>Ultra</strong> – Score as many points as you can within a fixed time 
    limit. Combos and back-to-back clears are key to a top score.
  </p>

  <h2>How to Play</h2>
  <p>
    Use arrow keys to move and rotate falling blocks. Complete horizontal lines 
    to clear them from the board. The game speeds up as you progress. Works on 
    desktop and mobile with touch controls.
  </p>

  <h2>Compete Globally</h2>
  <p>
    Every mode has its own global leaderboard. Submit your score and see how 
    you compare to block puzzle players around the world. PulseBlocks is 100% 
    free with no download needed.
  </p>
</section>
```

**Target keywords:** block puzzle, tetris-style game, falling blocks, free puzzle game, block game online, puzzle game browser, tetris free


---

### CONNECT 4 — SEO-text (`connect4/index.html`)

```html
<section class="game-info">
  <h1>Play Connect 4 Online Free – Four in a Row</h1>
  <p>
    Play the classic Connect 4 strategy game free in your browser. Drop your discs, 
    line up four in a row horizontally, vertically or diagonally, and outsmart your 
    opponent. Challenge a friend on the same device or test your skills against the AI.
  </p>

  <h2>Two Ways to Play</h2>
  <p>
    <strong>vs Friend</strong> – Two players take turns on the same screen. Great 
    for a quick head-to-head match.
  </p>
  <p>
    <strong>vs AI</strong> – Play against the computer. The AI provides a solid 
    challenge for both beginners and experienced Connect 4 players.
  </p>

  <h2>How to Play</h2>
  <p>
    Click or tap a column to drop your disc. Discs fall to the lowest available 
    spot. The first player to connect four discs in a row wins. Plan ahead, block 
    your opponent and set up multiple winning threats at once.
  </p>

  <h2>Free Browser Game</h2>
  <p>
    No download, no signup, no ads. PulseGames Connect 4 works on any device – 
    desktop, tablet or phone. Just open and play.
  </p>
</section>
```

**Target keywords:** connect 4, connect four, four in a row, play connect 4 online, free connect 4, 2 player game, strategy game browser


---

### AXELUGA — SEO-text (`axeluga/index.html`)

```html
<section class="game-info">
  <h1>Axeluga – Free Online Space Shooter Game</h1>
  <p>
    Axeluga is a vertical space shooter you can play free in your browser. Battle 
    through five unique worlds, face epic boss fights, collect power-ups and save 
    the galaxy. With gamepad support and smooth touch controls, it plays great on 
    any device.
  </p>

  <h2>Five Worlds, Epic Bosses</h2>
  <p>
    Each world features distinct enemies, environments and a challenging boss battle 
    at the end. From asteroid fields to alien strongholds, every stage brings new 
    threats and new strategies. Upgrade your weapons and earn bombs to survive the 
    toughest waves.
  </p>

  <h2>How to Play</h2>
  <p>
    Use arrow keys to move and spacebar to fire. Press B to launch a bomb that 
    clears the screen. Gamepad is fully supported – just connect a controller and 
    play. On mobile, touch controls are automatic. The game is designed for 
    vertical/portrait play.
  </p>

  <h2>Shoot-Em-Up Arcade Action</h2>
  <p>
    If you enjoy classic shoot-em-up games like Galaga, 1942 or Space Invaders, 
    Axeluga delivers that same arcade thrill in a modern browser package. No 
    download, no signup – just pure shmup action from PulseGames.
  </p>
</section>
```

**Target keywords:** space shooter, shoot em up, shmup, vertical shooter, free shooter game, arcade shooter online, space game browser, boss battles


---

## 5. Startsidans `<head>` (index.html)

```html
<title>PulseGames – Free Online Games | Play Instantly in Your Browser</title>
<meta name="description" content="Play free online games instantly – Snake, Solitaire, Breakout, Connect 4, Space Shooter and more. No downloads, no signups, just fun. Made in Sweden.">
<meta name="keywords" content="free online games, browser games, play free games, no download games, arcade games, card games, puzzle games">
<link rel="canonical" href="https://pulsegames.eu/">

<meta property="og:title" content="PulseGames – Free Online Games">
<meta property="og:description" content="Play free browser games instantly. Snake, Solitaire, Breakout, Connect 4 and more. No download needed.">
<meta property="og:image" content="https://pulsegames.eu/assets/og-image.jpg">
<meta property="og:url" content="https://pulsegames.eu/">
<meta property="og:type" content="website">
```

Startsidan kan också ha JSON-LD för WebSite:
```json
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "PulseGames",
  "url": "https://pulsegames.eu/",
  "description": "Free online browser games. Play Snake, Solitaire, Breakout, Connect 4 and more. No download needed.",
  "publisher": {
    "@type": "Organization",
    "name": "PulseGames",
    "url": "https://pulsegames.eu"
  }
}
```

---

## 6. Checklista efter implementation

- [ ] Verifiera pulsegames.eu i **Google Search Console**
- [ ] Skicka in sitemap.xml via Search Console
- [ ] Kör "URL Inspection" på alla 7 spelsidor för att trigga indexering
- [ ] Testa structured data med **Google Rich Results Test** (https://search.google.com/test/rich-results)
- [ ] Testa Open Graph-taggar med **Facebook Sharing Debugger** (https://developers.facebook.com/tools/debug/)
- [ ] Kontrollera att alla `<link rel="canonical">` pekar på rätt URL
- [ ] Se till att varje sida har unika title och description (inga dubbletter)
- [ ] Bekräfta att SEO-texterna syns i rendered HTML (inte dolda med CSS display:none)

---

## 7. Implementationsanteckningar för kodläget

**Viktig kontext att ge Claude i kodläget:**

> "Sajten hostas på Netlify, deployad via GitHub. Varje spel har sin egen mapp med en index.html. SEO-textsektionerna ska läggas till under spelcontainern/canvasen men ovanför footern. CSS-klassen `.game-info` ska läggas till i respektive spels stylesheet eller i en gemensam CSS-fil."

**Prioritetsordning:**
1. `robots.txt` + `sitemap.xml` (skapas i root)
2. Meta-taggar i `<head>` (alla 8 sidor inkl. startsidan)
3. JSON-LD structured data (alla 8 sidor)
4. SEO-textinnehåll under varje spel (7 sidor)
5. Google Search Console-verifiering (manuellt efter deploy)
