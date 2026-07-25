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
# It emits TWO builds, which differ ONLY in whether online play is reachable:
#
#   1. index-standalone.html — COOL MATH GAMES. Online multiplayer stripped:
#      CMG is wary of a game reaching an external service, and a room code
#      means nothing to someone arriving from a game grid. Single-player makes
#      zero external requests. This URL is already submitted, so neither its
#      path nor its behaviour may change.
#
#   2. portal/ — CRAZYGAMES. Online multiplayer KEPT, because CrazyGames runs
#      a multiplayer category and actively promotes play-with-a-friend games,
#      so the room code is an asset there rather than a liability. Delivered as
#      a COMPLETE folder (index.html + every script, sound and image), because
#      the page is NOT self-contained on its own — it pulls in tt-*.js and
#      assets/, and a portal that hosts the files itself would otherwise ship a
#      broken game.
#      Note: opening PLAY ONLINE loads Supabase from a CDN on demand. That is
#      the only external request the build can make; single-player makes none.
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

# --- everything above is common to both portal variants -----------------------
base = s

# J. Optional: remove online multiplayer.
#    Cool Math Games is wary of a game reaching an external service (the
#    room-code lobby talks to Supabase) and a room code means nothing to
#    someone arriving from a portal's game grid — so that build drops it.
#    CrazyGames is the opposite: it runs a multiplayer category and actively
#    promotes games you can play with a friend, so that build keeps it.
#    Stripping leaves the netcode in the file but unreachable: no button and
#    no invite-link entry point, so sb-net.js never loads its CDN.
def strip_online(t):
    online_btn = '    <button class="btn online" id="online-btn">🌐 PLAY ONLINE</button>\n'
    assert online_btn in t, 'online button not found'
    t = t.replace(online_btn, '')

    online_wire = "document.getElementById('online-btn').addEventListener('click', openOnline);"
    assert online_wire in t, 'online button wiring not found'
    t = t.replace(
        online_wire,
        "var olBtn = document.getElementById('online-btn'); "
        "if (olBtn) olBtn.addEventListener('click', openOnline); // absent in this build"
    )

    join_line = ("      var joinCode = (new URLSearchParams(location.search).get('join') || '')"
                 ".toUpperCase().replace(/[^A-Z0-9]/g, '');")
    assert join_line in t, 'invite-link handler not found'
    t = t.replace(join_line, "      var joinCode = ''; // ?join= invite links are disabled in this build")

    # the menu badge advertises online play — it no longer exists here
    t = t.replace('<div class="proto-tag">GameVolt Open · online &amp; vs AI</div>',
                  '<div class="proto-tag">GameVolt Open · beat all three</div>')
    return t


# K. Scrub portal / sibling-game branding from the arena (tournament name,
#    wall banners, and the menu ticker) -> neutral fictional sponsors.
#    Runs AFTER strip_online, which matches the un-scrubbed "GameVolt Open".
def scrub_branding(t):
    for a, b in [
        ('GameVolt Open', 'Spinburn Open'),
        ('GAMEVOLT OPEN', 'SPINBURN OPEN'),
        ('GAMEVOLT.IO', 'RALLYX'),
        ('GRIDBURN', 'PADDLE KING'),
        ('HOVERDASH', 'SPIN LAB'),
    ]:
        t = t.replace(a, b)
    # Header note so anyone opening the file knows it's generated. It must go
    # AFTER <!DOCTYPE html> — anything before the doctype trips browsers into
    # quirks mode.
    header = ('\n<!-- GENERATED FILE — do not edit by hand.\n'
              '     Portal build of Spinburn, produced from index.html by\n'
              '     spinburn/build-standalone.py. Re-run that script after editing index.html. -->')
    return t.replace('<!DOCTYPE html>', '<!DOCTYPE html>' + header, 1)


# index-standalone.html — the Cool Math Games build (no online). This URL is
# already submitted to CMG, so neither its path nor its behaviour may change.
cmg = scrub_branding(strip_online(base))
open(dst, 'w', encoding='utf-8').write(cmg)
print(f'wrote {dst}  ({orig_len} -> {len(cmg)} bytes)  [CMG: no online]')

# portal/ — the CrazyGames handover folder, online multiplayer KEPT.
s = scrub_branding(base)

# ---- portal/ : the CrazyGames handover folder, complete and self-contained --
# Rebuilt from scratch every run so a renamed or deleted asset can't linger.
if os.path.isdir(portal):
    shutil.rmtree(portal)
os.makedirs(os.path.join(portal, 'assets'))
os.makedirs(os.path.join(portal, 'icons'))

# entry point must be index.html — that is what a portal loads
open(os.path.join(portal, 'index.html'), 'w', encoding='utf-8').write(s)

# every script the page pulls in — including sb-net.js, which this build needs
# for real: PLAY ONLINE is live here.
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
print(f'wrote {portal}/  ({n} files, {size / 1024:.0f} KB)  [CrazyGames: online KEPT] — hand this folder over')
