# dist — handover packages

Zipped builds for external portals, so a folder can be downloaded from GitHub
in one click instead of cloning a 129 MB repo for 1 MB of files.

## spinburn-portal-v0.44.1.zip

The CrazyGames build of Spinburn: `spinburn/portal/` zipped, with
`index.html` as the entry point. 21 files, ~940 KB.

- online multiplayer **kept** (CrazyGames promotes play-with-a-friend games)
- no GameVolt SDK, no analytics, no service worker, no outbound links
- neutral sponsor branding and original rival names
- single-player makes zero external requests

Rebuild it after changing the game with:

    python3 spinburn/build-standalone.py
    cd spinburn/portal && zip -rq ../../dist/spinburn-portal-vX.Y.Z.zip . -x '.*'

The Cool Math Games build is a different file — `spinburn/index-standalone.html`,
served from gamevolt.io, with online multiplayer stripped. That URL is already
submitted and must not move.
