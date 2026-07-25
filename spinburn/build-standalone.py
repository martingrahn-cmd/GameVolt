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
# It emits TWO things:
#   1. index-standalone.html — the single page, playable in place next to the
#      game's own js/assets (this is the URL already submitted to Cool Math
#      Games, so the path must not move).
#   2. portal/ — the same build as a COMPLETE, self-contained folder
#      (index.html + every script, sound and image it needs). Portals such as
#      CrazyGames host the files themselves, and the page is NOT self-contained
#      on its own — it pulls in tt-*.js and assets/ — so handing over only the
#      HTML would ship a broken game.
#
# Re-run after ANY change to index.html:  python3 spinburn/build-standalone.py
# ============================================================
import os
import shutil

HERE = os.path.dirname(os.path.abspath(__file__))
src = os.path.join(HERE, 'index.html')
dst = os.path.join(HERE, 'index-standalone.html')
portal = os.path.join(HERE, 'portal')
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

# J. Remove online multiplayer from the portal build. Portals are wary of a
#    game reaching an external service (the room-code lobby talks to Supabase),
#    and a room code is meaningless to someone arriving from a portal's game
#    grid. The netcode itself stays in the file but becomes unreachable: no
#    button, no invite-link entry point, so sb-net.js never loads its CDN and
#    single-player makes zero external requests.
online_btn = '    <button class="btn online" id="online-btn">🌐 PLAY ONLINE</button>\n'
assert online_btn in s, 'online button not found'
s = s.replace(online_btn, '')

online_wire = "document.getElementById('online-btn').addEventListener('click', openOnline);"
assert online_wire in s, 'online button wiring not found'
s = s.replace(
    online_wire,
    "var olBtn = document.getElementById('online-btn'); "
    "if (olBtn) olBtn.addEventListener('click', openOnline); // absent in portal builds"
)

join_line = ("      var joinCode = (new URLSearchParams(location.search).get('join') || '')"
             ".toUpperCase().replace(/[^A-Z0-9]/g, '');")
assert join_line in s, 'invite-link handler not found'
s = s.replace(join_line, "      var joinCode = ''; // ?join= invite links are disabled in portal builds")

# the menu badge advertises online play — it no longer exists here
s = s.replace('<div class="proto-tag">GameVolt Open · online &amp; vs AI</div>',
              '<div class="proto-tag">GameVolt Open · beat all three</div>')

# K. Scrub portal / sibling-game branding from the arena (tournament name,
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

# ---- portal/ : the same build as a complete, handover-ready folder ----------
# Rebuilt from scratch every run so a renamed or deleted asset can't linger.
if os.path.isdir(portal):
    shutil.rmtree(portal)
os.makedirs(os.path.join(portal, 'assets'))
os.makedirs(os.path.join(portal, 'icons'))

# entry point must be index.html — that is what a portal loads
open(os.path.join(portal, 'index.html'), 'w', encoding='utf-8').write(s)

# every script the page pulls in. sb-net.js is still required even though the
# online lobby is unreachable here: the page references SBNet at startup.
SCRIPTS = ['tt-core.js', 'tt-ai.js', 'tt-achievements.js', 'sb-net.js']
for f in SCRIPTS:
    shutil.copy2(os.path.join(HERE, f), os.path.join(portal, f))

SOUNDS = ['hit', 'bounce', 'cheer', 'net', 'crowd', 'winfare', 'lose',
          'matchpoint', 'vo-matchpoint', 'vo-intro']
for f in SOUNDS:
    shutil.copy2(os.path.join(HERE, 'assets', f + '.mp3'),
                 os.path.join(portal, 'assets', f + '.mp3'))

PORTRAITS = ['opp-hans', 'opp-hummel', 'opp-chongli', 'opp-player']
for f in PORTRAITS:
    shutil.copy2(os.path.join(HERE, 'assets', f + '.png'),
                 os.path.join(portal, 'assets', f + '.png'))

for f in ['favicon-32.png', 'apple-touch-icon.png']:
    shutil.copy2(os.path.join(HERE, 'icons', f), os.path.join(portal, 'icons', f))

# fail loudly if the page asks for something the folder does not carry
import re
refs = set(re.findall(r'(?:src|href)="((?:assets|icons)/[^"?]+)', s))
refs |= set(m + '.mp3' for m in re.findall(r"'(assets/[a-z0-9-]+)\.mp3", s))
refs |= set(m + '.png' for m in re.findall(r"'(assets/[a-z0-9-]+)\.png", s))
missing = [r for r in refs if not os.path.exists(os.path.join(portal, r))]
assert not missing, f'portal/ is missing files the page loads: {missing}'

n = sum(len(f) for _, _, f in os.walk(portal))
size = sum(os.path.getsize(os.path.join(d, f)) for d, _, fs in os.walk(portal) for f in fs)
print(f'wrote {portal}/  ({n} files, {size / 1024:.0f} KB) — hand this folder to a portal')
