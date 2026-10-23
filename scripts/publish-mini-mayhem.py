"""Publishes Mini Mayhem into /mini-mayhem/ from a build of its own repository
(martingrahn-cmd/minigolf-3d), the way GameVolt serves it:

  - the game's Vite build (`npm run build` → dist/), copied as it is; the build
    uses relative paths, so it runs under /mini-mayhem/ unchanged, and keeps its
    own version.json for the game's update chip;
  - the gameplay preview the portal plays, from the game's promo/preview.mp4;
  - GameVolt's head (analytics, title, canonical, Open Graph, JSON-LD, the SDK)
    in place of the game's own title and description, from
    scripts/mini-mayhem/head.html;
  - the #seo-content block before </body>, from scripts/mini-mayhem/;
  - source.json with the commit it was built from, so the sync can tell when
    the game has moved on.

    python3 scripts/publish-mini-mayhem.py <dist> <minigolf-3d checkout> [commit]

Run by .github/workflows/sync-mini-mayhem.yml whenever the game's main branch
moves; safe to run by hand after building the game. Fails loudly if the game's
page no longer has what it expects to replace, rather than publishing a
half-patched page.
"""
import json
import re
import shutil
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DEST = ROOT / 'mini-mayhem'
TEMPLATES = Path(__file__).resolve().parent / 'mini-mayhem'
PREVIEW = 'promo/preview.mp4'

# The game's own copies of what GameVolt's head replaces.
OWN_HEAD = [r'<title>.*?</title>', r'<meta name="description"[^>]*>']
CHARSET = re.compile(r'<meta charset="utf-8"\s*/?>', re.I)


def fail(message):
    sys.exit(f'publish-mini-mayhem: {message}')


def patch_page(html):
    for pattern in OWN_HEAD:
        html, n = re.subn(r'[ \t]*' + pattern + r'[ \t]*\n?', '', html, flags=re.S)
        if n != 1:
            fail(f'expected one {pattern} in the game page, found {n}')
    # The page GameVolt indexes is in English; the game picks its own language.
    html, n = re.subn(r'<html lang="[^"]*">', '<html lang="en">', html, count=1)
    if n != 1:
        fail('the game page has no <html lang> to set')
    if len(CHARSET.findall(html)) != 1:
        fail('the game page has no single <meta charset="utf-8"> to put the head after')
    head = (TEMPLATES / 'head.html').read_text()
    html = CHARSET.sub(lambda m: m.group(0) + '\n' + head, html, count=1)
    seo = (TEMPLATES / 'seo-content.html').read_text()
    if html.count('</body>') != 1:
        fail('the game page has no single </body>')
    return html.replace('</body>', seo + '</body>', 1)


def main(dist, source, commit=None):
    dist, source = Path(dist).resolve(), Path(source).resolve()
    if not (dist / 'index.html').is_file() or not (dist / 'version.json').is_file():
        fail(f'{dist} is not a Mini Mayhem build (run npm run build in the game first)')
    if not (source / 'src' / 'main.js').is_file():
        fail(f'{source} is not a minigolf-3d checkout')
    commit = commit or subprocess.run(['git', '-C', str(source), 'rev-parse', 'HEAD'],
                                      capture_output=True, text=True, check=True).stdout.strip()

    if DEST.exists():
        shutil.rmtree(DEST)
    shutil.copytree(dist, DEST)
    if (source / PREVIEW).is_file():
        shutil.copy2(source / PREVIEW, DEST / 'preview.mp4')
    else:
        fail(f'{PREVIEW} is missing from the checkout')

    page = DEST / 'index.html'
    page.write_text(patch_page(page.read_text()))

    (DEST / 'source.json').write_text(json.dumps({
        'sourceRepository': 'martingrahn-cmd/minigolf-3d',
        'sourceCommit': commit,
        'built': datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),
    }, indent=2) + '\n')
    print(f'published Mini Mayhem {commit[:7]} to {DEST.relative_to(ROOT)}/')


if __name__ == '__main__':
    if len(sys.argv) < 3:
        fail('usage: publish-mini-mayhem.py <dist> <minigolf-3d checkout> [commit]')
    main(*sys.argv[1:4])
