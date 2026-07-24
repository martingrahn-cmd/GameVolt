#!/usr/bin/env python3
# ============================================================
# build-standalone.py — generate index-standalone.html from index.html.
#
# The GameVolt build of Spinburn (index.html) carries portal-only bits that
# other HTML5 portals (Cool Math Games, CrazyGames, Poki, …) don't want:
# the GameVolt SDK, Google Analytics, a service worker / install prompt,
# OG+JSON-LD pointing at gamevolt.io, and arena sponsor banners that name
# GameVolt and sibling games. This script strips all of that and swaps the
# branding for neutral fictional sponsors, producing a clean, self-contained
# single-file build. Single-player makes zero external requests; online play
# still works (loads Supabase on demand) if the PLAY ONLINE button is used.
#
# Re-run after ANY change to index.html:  python3 spinburn/build-standalone.py
# ============================================================
import os

HERE = os.path.dirname(os.path.abspath(__file__))
src = os.path.join(HERE, 'index.html')
dst = os.path.join(HERE, 'index-standalone.html')
s = open(src, encoding='utf-8').read()
orig_len = len(s)

# A. Remove Google Analytics block
ga_start = '\n  <!-- Google Analytics -->'
ga_end   = '\n  <meta name="viewport"'
s = s[:s.index(ga_start)] + '\n' + s[s.index(ga_end) + 1:]

# B. Clean the <title> (drop the "| GameVolt.io" portal suffix)
s = s.replace('<title>Spinburn — 2.5D Arcade Table Tennis, Online & vs AI | GameVolt.io</title>',
              '<title>Spinburn — 2.5D Arcade Table Tennis</title>')

# C. Remove OG / Twitter / JSON-LD (everything between </title> and <style>),
#    keeping BOTH the </title> close tag and the <style> open tag intact.
i = s.index('</title>') + len('</title>')
j = s.index('  <style>')
assert i < j, 'og/jsonld anchors out of order'
s = s[:i] + '\n\n' + s[j:]

# D. robots: noindex (the standalone must not compete with the canonical /spinburn/)
s = s.replace('<meta name="robots" content="index, follow">', '<meta name="robots" content="noindex">')

# E. Remove the GameVolt SDK comment + script tag
sdk_block = '''  <!-- GameVolt SDK: loads first, no defer, so window.GameVolt exists when the
       game runs. All SDK use is optional (if (window.GameVolt)) — Spinburn
       plays fine standalone / on other portals with no SDK present. -->
  <script src="/sdk/gamevolt.js" data-game="spinburn"></script>
'''
assert sdk_block in s, 'SDK block not found'
s = s.replace(sdk_block, '')

# F. Remove the PWA manifest link (no install/SW on a portal build)
s = s.replace('  <link rel="manifest" href="manifest.webmanifest">\n', '')

# G. Remove PWA HTML buttons (install / update chip / iOS hint)
for line in [
    '    <button id="update-chip" class="hidden">◆ NEW VERSION — TAP TO UPDATE</button>\n',
    '    <button id="install-btn" class="hidden">⬇ INSTALL APP</button>\n',
    '    <div id="ios-hint" class="hidden">On iPhone: Share <span style="font-size:0.8rem">⎋</span> → “Add to Home Screen”</div>\n',
]:
    assert line in s, f'PWA html missing: {line[:40]}'
    s = s.replace(line, '')

# H. Remove the PWA / service-worker JS block (register SW, install prompt, update chip)
i = s.index('    // ---------- PWA: install button, iOS hint, update chip ----------')
j = s.index('    // Dev/debug handle')
s = s[:i] + s[j:]

# I. Remove the #seo-content block + its standalone-reveal script (it links out
#    to gamevolt.io pages, which portals disallow)
i = s.index('  <div id="seo-content" style="display:none;">')
j = s.index('</body>')
s = s[:i] + s[j:]

# J. Scrub portal / sibling-game branding from the arena (tournament name,
#    wall banners, and the menu ticker) -> neutral fictional sponsors
for a, b in [
    ('GameVolt Open', 'Spinburn Open'),
    ('GAMEVOLT OPEN', 'SPINBURN OPEN'),
    ('GAMEVOLT.IO', 'RALLYX'),
    ('GRIDBURN', 'PADDLE KING'),
    ('HOVERDASH', 'SPIN LAB'),
]:
    s = s.replace(a, b)

# Header note so anyone opening the file knows it's generated. It must go
# AFTER <!DOCTYPE html> — anything before the doctype trips browsers into
# quirks mode.
header = ('\n<!-- GENERATED FILE — do not edit by hand.\n'
          '     Portal build of Spinburn, produced from index.html by\n'
          '     spinburn/build-standalone.py. Re-run that script after editing index.html. -->')
s = s.replace('<!DOCTYPE html>', '<!DOCTYPE html>' + header, 1)

open(dst, 'w', encoding='utf-8').write(s)
print(f'wrote {dst}  ({orig_len} -> {len(s)} bytes, -{orig_len - len(s)})')
