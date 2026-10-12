"""Publishes Chrome Circuit into /chrome-circuit/ from a checkout of its own
repository (martingrahn-cmd/chrome-circuit), the way GameVolt serves it:

  - the game's runtime files, copied as they are (not its tools, docs or the
    media it was promoted with), plus the gameplay preview the portal plays;
  - GameVolt's head (analytics, title, canonical, Open Graph, JSON-LD, the SDK)
    in place of the game's own, from scripts/chrome-circuit/head.html;
  - the #seo-content block before </body>, from scripts/chrome-circuit/;
  - the build stamped into sw.js and version.json, as the game's own Pages
    deploy does, so its update chip and offline cache work here too.

    python3 scripts/publish-chrome-circuit.py <chrome-circuit checkout> [commit]

Run by .github/workflows/sync-chrome-circuit.yml whenever the game's main
branch moves; safe to run by hand. Fails loudly if the game's page no longer
has what it expects to replace, rather than publishing a half-patched page.
"""
import json
import re
import shutil
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DEST = ROOT / 'chrome-circuit'
TEMPLATES = Path(__file__).resolve().parent / 'chrome-circuit'
# What the game needs at runtime; everything else in its repo stays there.
RUNTIME = ['index.html', 'styles.css', 'manifest.webmanifest', 'sw.js', 'src', 'vendor', 'assets', 'icons']
PREVIEW = 'media/gamevolt/preview.mp4'

# The game's own copies of what GameVolt's head replaces: its title, its
# description and its sharing tags, which point at its GitHub Pages home.
OWN_HEAD = [
    r'<title>.*?</title>',
    r'<meta name="description"[^>]*>',
    r'<link rel="canonical"[^>]*>',
    r'<meta property="og:[^"]*"[^>]*>',
    r'<meta name="twitter:[^"]*"[^>]*>',
]


def fail(message):
    sys.exit(f'publish-chrome-circuit: {message}')


def patch_page(html):
    for pattern in OWN_HEAD:
        html, n = re.subn(r'[ \t]*' + pattern + r'[ \t]*\n?', '', html, flags=re.S)
        if pattern.startswith('<title') and n != 1:
            fail(f'expected one {pattern} in the game page, found {n}')
    html = re.sub(r'[ \t]*<!-- What a shared link shows:.*?-->\n', '', html, flags=re.S)
    head = (TEMPLATES / 'head.html').read_text()
    if html.count('<meta charset="utf-8">') != 1:
        fail('the game page has no single <meta charset="utf-8"> to put the head after')
    html = html.replace('<meta charset="utf-8">', '<meta charset="utf-8">\n' + head, 1)
    seo = (TEMPLATES / 'seo-content.html').read_text()
    if html.count('</body>') != 1:
        fail('the game page has no single </body>')
    return html.replace('</body>', seo + '</body>', 1)


def main(source, commit=None):
    source = Path(source).resolve()
    if not (source / 'index.html').is_file() or not (source / 'src' / 'main.js').is_file():
        fail(f'{source} is not a Chrome Circuit checkout')
    commit = commit or subprocess.run(['git', '-C', str(source), 'rev-parse', 'HEAD'],
                                      capture_output=True, text=True, check=True).stdout.strip()
    short = commit[:7]

    if DEST.exists():
        shutil.rmtree(DEST)
    DEST.mkdir()
    for name in RUNTIME:
        src = source / name
        if src.is_dir():
            shutil.copytree(src, DEST / name)
        elif src.is_file():
            shutil.copy2(src, DEST / name)
        else:
            fail(f'{name} is missing from the checkout')
    if (source / PREVIEW).is_file():
        shutil.copy2(source / PREVIEW, DEST / 'preview.mp4')
    else:
        fail(f'{PREVIEW} is missing from the checkout')

    page = DEST / 'index.html'
    page.write_text(patch_page(page.read_text()))

    sw = DEST / 'sw.js'
    text = sw.read_text()
    if "const BUILD = '__BUILD__';" not in text:
        fail('sw.js has no __BUILD__ to stamp')
    sw.write_text(text.replace("const BUILD = '__BUILD__';", f"const BUILD = '{short}';"))

    (DEST / 'version.json').write_text(json.dumps({
        'version': short,
        'built': datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),
        'sourceRepository': 'martingrahn-cmd/chrome-circuit',
        'sourceCommit': commit,
    }, indent=2) + '\n')
    print(f'published Chrome Circuit {short} to {DEST.relative_to(ROOT)}/')


if __name__ == '__main__':
    if len(sys.argv) < 2:
        fail('usage: publish-chrome-circuit.py <chrome-circuit checkout> [commit]')
    main(*sys.argv[1:3])
