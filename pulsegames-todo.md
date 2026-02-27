# PulseGames – Improvements & Bug Fixes Roadmap

> Full audit performed 2026-02-24. Last updated 2026-02-24. Prioritized by SEO & user impact.

---

## CRITICAL – Fix Now

### 1. Game pages missing footer with category links
**Status:** Done
**Files:** All game pages (`snake/index.html`, `breakout/index.html`, `taprush/index.html`, `solitaire/index.html`, `pulseblocks/index.html`, `connect4/index.html`, `axeluga/index.html`)
**Issue:** The homepage now has a footer with Games + Categories + Info columns, but none of the individual game pages have this updated footer. Some game pages have minimal or no footer at all.
**Fix:** Add the standardized footer (matching homepage) to all game pages for consistent navigation and internal linking. This is a big SEO win since internal links from every page strengthen category page authority.

### 2. Solitaire variant pages missing SEO content & H1
**Status:** Done
**Files:** `solitaire/klondike.html`, `solitaire/freecell.html`, `solitaire/spider.html`, `solitaire/pyramid.html`, `solitaire/tripeaks.html`, `solitaire/golf.html`
**Issue:** None of the 6 solitaire variant pages have:
- A proper SEO H1 tag (klondike only has `<h1>You Win!</h1>` in a modal, the rest have zero H1s)
- A `.game-info` SEO content section (200-300 words) like all other game pages have
- Unique, descriptive meta titles (current format: `"Solitaire | PulseGames - Free Online [Variant]"` – should lead with variant name)
**Fix:** Add unique SEO H1, 200-word content section, and rewrite meta titles for each variant. Example title: `"Play Klondike Solitaire Free Online | PulseGames"`.

### 3. Missing Twitter Card tags on some solitaire variants
**Status:** Done
**Files:** `solitaire/pyramid.html`, `solitaire/tripeaks.html`, `solitaire/golf.html`
**Issue:** These files have `twitter:card` but are missing `twitter:description` and possibly `twitter:title`. Spider has partial Twitter tags.
**Fix:** Add complete Twitter Card meta tags to all variant pages.

---

## HIGH PRIORITY – SEO & Structure

### 4. Create a 404 error page
**Status:** Done
**File:** `404.html` (does not exist)
**Issue:** No custom 404 page. Users hitting a broken link see a generic error. Google also penalizes sites without proper error handling.
**Fix:** Create a styled 404 page matching the site design with:
- "Page not found" message
- Links to homepage and game categories
- Search-friendly meta tags (noindex)
- Same header/footer as rest of site

### 5. Add breadcrumb navigation to game pages
**Status:** Done
**Files:** All 7 game page `index.html` files
**Issue:** Category pages have breadcrumbs (`Home / Arcade Games`) but individual game pages don't. Breadcrumbs help Google understand site hierarchy and can appear as rich snippets in search results.
**Fix:** Add breadcrumb navigation + BreadcrumbList JSON-LD schema to each game page. Example: `Home / Arcade / Snake Neo`.

### 6. Add "Related Games" section to game pages
**Status:** Done
**Files:** All 13 game pages (7 main + 6 solitaire variants)
**Implementation:** Added "You Might Also Like" section with 3 genre-relevant game cards (thumbnail, title, category) between SEO content and footer on every game page. Games are cross-linked by genre similarity.

### 7. Game pages should link to their category
**Status:** Done (via breadcrumbs)
**Files:** All 7 game page `index.html` files
**Issue:** No game page links to its parent category page. The category pages link to the games, but not the other way around. Two-way linking strengthens both pages.
**Fix:** Add category tag/link in game info or breadcrumb. Example: Snake page should link to `/arcade-games/`.

### 8. Add JSON-LD structured data to solitaire variant pages
**Status:** Done
**Files:** `solitaire/klondike.html`, `solitaire/freecell.html`, `solitaire/spider.html`, `solitaire/pyramid.html`, `solitaire/tripeaks.html`, `solitaire/golf.html`
**Issue:** The main solitaire hub and all other game pages have VideoGame JSON-LD schema, but individual solitaire variants don't.
**Fix:** Add VideoGame schema to each variant with unique name, description, genre, etc.

---

## MEDIUM PRIORITY – Performance & Technical

### 9. Image optimization – switch to WebP
**Status:** Done
**Files:** `assets/thumbnails/*.webp`
**Implementation:** Converted all 7 thumbnails from JPG/PNG to WebP (38% smaller total). Updated all references across 18 HTML files. Removed original files.

### 10. Add `<link rel="preload">` for critical assets
**Status:** Done
**Files:** All pages
**Implementation:** Added `<link rel="preload" as="style">` for Google Fonts CSS on all 20 pages. Replaced `loading="lazy"` with `fetchpriority="high"` on above-the-fold thumbnails (homepage + 4 category pages). Added image preload for first homepage thumbnail.

### 11. Consider extracting shared CSS to external stylesheet
**Status:** Not done
**Issue:** Every page (especially the new category pages) has the full CSS inlined in `<style>` tags. This means:
- CSS is re-downloaded on every page navigation (not cacheable)
- Harder to maintain – changes need to be made in every file
**Fix:** Extract the shared design system (header, footer, cards, typography, colors) into a shared `assets/styles.css` file. Keep only page-specific styles inline. Note: inline CSS does have the advantage of no extra HTTP request, so this is a trade-off. Consider extracting only if you plan to update the design frequently.

### 12. Inconsistent PWA manifest
**Status:** Inconsistent
**Issue:** Some game pages (Connect 4, Axeluga) reference a PWA manifest, but others (Snake, Breakout, Tap Rush) don't. Either add it to all pages or remove it for consistency.
**Fix:** If PWA is desired, add manifest.json + service worker to all pages. If not, remove PWA references for consistency.

---

## LOW PRIORITY – Polish & Nice-to-Have

### 13. Add FAQ schema to game pages
**Status:** Not done
**Issue:** FAQ structured data can generate rich snippets in Google (expandable Q&A directly in search results). Questions like "Is Snake free?", "Do I need to download anything?", "What devices does it work on?" are natural FAQ candidates.
**Fix:** Add FAQPage JSON-LD schema with 3-4 relevant Q&As per game page.

### 14. Add `hreflang` if targeting multiple languages
**Status:** Not applicable yet
**Issue:** The site content is in English but the domain is `.eu` and tagline says "Made in Sweden". If you ever add Swedish language versions, add `hreflang` tags.
**Fix:** Only needed if/when multi-language support is added.

### 15. Accessibility improvements
**Status:** Not audited in depth
**Issue:** Potential issues include:
- Missing ARIA labels on game canvas elements and interactive buttons
- Color contrast ratios on muted text (`#626580` on `#0f1221` may not meet WCAG AA)
- Keyboard navigation in games
**Fix:** Run Lighthouse accessibility audit and fix reported issues. At minimum, add `aria-label` to all interactive elements and ensure focus states are visible.

### 16. Open Graph images per category
**Status:** Not done
**Issue:** All category pages use the generic `og-image.jpg`. Custom OG images per category would improve social sharing appearance.
**Fix:** Create unique 1200x630 OG images for each category page showing the games in that category.

### 17. Fix `lang="sv"` on Tap Rush page – BUG
**Status:** Done
**File:** `taprush/index.html` (line 20)
**Issue:** Tap Rush has `<html lang="sv">` (Swedish) instead of `<html lang="en">`. All other pages correctly use `lang="en"`. This signals the wrong language to Google and screen readers.
**Fix:** Change `lang="sv"` to `lang="en"` in `taprush/index.html`.

---

## COMPLETED (This Session)

- [x] Fix duplicate H1 tags on game pages (snake, taprush, pulseblocks, solitaire, connect4)
- [x] Create Arcade category page (`/arcade-games/`) – Snake, Breakout
- [x] Create Action category page (`/action-games/`) – Axeluga, Tap Rush
- [x] Create Puzzle category page (`/puzzle-games/`) – PulseBlocks
- [x] Create Board Games category page (`/board-games/`) – Solitaire, Connect 4
- [x] Add Categories column to homepage footer
- [x] Update sitemap with 4 new category URLs
- [x] All category pages have: JSON-LD (CollectionPage + BreadcrumbList), unique meta tags, SEO content, cross-category navigation
- [x] Solitaire variant SEO: H1 tags, 200-word game-info sections, unique meta titles (all 6 pages)
- [x] Standardized footer with Games + Categories + Info on all game pages (#1)
- [x] 404 error page with Flappy Pulse easter egg (#4)
- [x] Breadcrumb navigation (visible + JSON-LD) on all 12 game pages (#5)
- [x] "You Might Also Like" related games section on all 13 game pages (#6)
- [x] Game pages link to parent category via breadcrumbs (#7)
- [x] Twitter Card tags completed on all solitaire variants + added twitter:image to 4 pages (#3)
- [x] VideoGame JSON-LD schema on all 6 solitaire variant pages (#8)
- [x] Fixed lang="sv" → lang="en" on Tap Rush (#17)
- [x] Fixed Breakout SEO text overlapping game canvas (game-wrapper fix)
- [x] Converted all thumbnails to WebP – 38% smaller (#9)
- [x] Added font CSS preload + above-the-fold image priority on all pages (#10)

---

## Priority Order for Maximum Impact

If tackling these in order of SEO impact:

1. **#1** – Consistent footer on all game pages (internal linking boost)
2. **#2** – Solitaire variant SEO content & H1 (6 pages currently underperforming)
3. **#5 + #7** – Breadcrumbs + category links on game pages (hierarchy signals)
4. **#6** – Related games sections (engagement + internal linking)
5. **#4** – 404 page (professionalism + crawl efficiency)
6. **#8** – Variant structured data (rich snippet potential)
7. **#9** – WebP images (Core Web Vitals / performance)
8. **#3** – Twitter Card fixes (quick win)
