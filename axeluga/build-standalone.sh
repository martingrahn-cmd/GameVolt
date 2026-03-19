#!/bin/bash
# ──────────────────────────────────────────────────────
# Axeluga Standalone Build Script
# Creates a clean zip ready for CrazyGames / Poki submission
# ──────────────────────────────────────────────────────
# Usage: ./build-standalone.sh
#
# Output: axeluga-standalone.zip in the axeluga/ directory
# Contains: index.html, js/, assets/ (everything needed to run)
# ──────────────────────────────────────────────────────

set -e
cd "$(dirname "$0")"

BUILD_DIR="build-standalone"
ZIP_NAME="axeluga-standalone.zip"

echo "🚀 Building Axeluga standalone..."

# Clean previous build
rm -rf "$BUILD_DIR" "$ZIP_NAME"
mkdir -p "$BUILD_DIR"

# ── Copy game assets ──
echo "  📦 Copying assets..."
cp -r assets "$BUILD_DIR/assets"

# ── Copy JS files (game logic is SDK-agnostic) ──
echo "  📦 Copying JS..."
mkdir -p "$BUILD_DIR/js"
cp js/config.js "$BUILD_DIR/js/config.js"
cp js/input.js "$BUILD_DIR/js/input.js"
cp js/audio.js "$BUILD_DIR/js/audio.js"
cp js/game.js "$BUILD_DIR/js/game.js"
cp js/main.js "$BUILD_DIR/js/main.js"

# ── Copy icons for manifest ──
cp icon-192.png "$BUILD_DIR/" 2>/dev/null || true
cp icon-512.png "$BUILD_DIR/" 2>/dev/null || true
cp og-image.jpg "$BUILD_DIR/" 2>/dev/null || true

# ── Generate clean index.html ──
echo "  🔨 Generating standalone index.html..."
cat > "$BUILD_DIR/index.html" << 'HTMLEOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no, viewport-fit=cover">
    <meta name="theme-color" content="#0af">
    <title>Axeluga</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body {
            width: 100%; height: 100%;
            overflow: hidden;
            background: #05060d;
            font-family: 'Courier New', monospace;
        }
        #game-wrapper {
            display: flex;
            justify-content: center;
            align-items: center;
            width: 100%; height: 100%;
        }
        canvas {
            display: block;
            image-rendering: pixelated;
            image-rendering: crisp-edges;
            touch-action: none;
            z-index: 1;
        }

        #loading {
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            display: flex; flex-direction: column;
            justify-content: center; align-items: center;
            background: #0a0a1a; color: #0ff; font-size: 18px; z-index: 100;
        }
        #loading .bar { width: 200px; height: 4px; background: #112; margin-top: 16px; border-radius: 2px; }
        #loading .bar-fill { height: 100%; background: #0ff; width: 0%; transition: width 0.2s; border-radius: 2px; }

        /* Landscape warning */
        #landscape-warning {
            display: none;
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: #05060d; z-index: 9999;
            flex-direction: column; justify-content: center; align-items: center;
            color: #0ff; font-family: 'Courier New', monospace; text-align: center; gap: 20px;
        }
        #landscape-warning .rotate-icon { font-size: 60px; animation: rotateHint 2s ease-in-out infinite; }
        #landscape-warning .rotate-text { font-size: 16px; color: #8af; letter-spacing: 2px; }
        @keyframes rotateHint {
            0%, 100% { transform: rotate(0deg); }
            25% { transform: rotate(-20deg); }
            75% { transform: rotate(20deg); }
        }
        @media (orientation: landscape) and (max-height: 500px) {
            #landscape-warning { display: flex !important; }
            #game-wrapper { display: none !important; }
        }

        /* Trophy toast */
        #trophy-toast {
            position: fixed; bottom: -80px; left: 50%; transform: translateX(-50%);
            display: flex; align-items: center; gap: 12px;
            background: #0a0a18ee; border: 1px solid #ffd70066; border-radius: 8px;
            padding: 10px 20px; z-index: 30;
            transition: bottom .5s cubic-bezier(.34,1.56,.64,1);
            box-shadow: 0 0 30px #ffd70033; pointer-events: none;
            font-family: 'Courier New', monospace;
        }
        #trophy-toast.show { bottom: 24px; }
        #trophy-toast-icon { font-size: 28px; }
        #trophy-toast-label { font-size: 9px; color: #ffd700; letter-spacing: 3px; font-weight: 700; text-transform: uppercase; }
        #trophy-toast-tier { font-size: 9px; font-weight: 700; letter-spacing: 2px; }
        #trophy-toast-tier.bronze { color: #cd7f32; }
        #trophy-toast-tier.silver { color: #c0c0c0; }
        #trophy-toast-tier.gold { color: #ffd700; }
        #trophy-toast-tier.platinum { color: #b4ffff; }
        #trophy-toast-name { font-size: 14px; color: #fff; font-weight: 700; letter-spacing: 1px; }

        /* Fullscreen button */
        #fullscreen-btn {
            display: none; position: fixed; top: 8px; right: 8px;
            width: 36px; height: 36px;
            background: rgba(0,0,0,0.6); border: 1px solid rgba(0,255,255,0.3);
            border-radius: 6px; color: #0ff; font-size: 18px; z-index: 50;
            cursor: pointer; align-items: center; justify-content: center;
            touch-action: manipulation; -webkit-tap-highlight-color: transparent;
        }
        #fullscreen-btn:active { background: rgba(0,255,255,0.2); }
        @media (max-width: 768px) { #fullscreen-btn { display: flex; } }
    </style>
</head>
<body>
    <div id="loading">
        <div>LOADING AXELUGA...</div>
        <div class="bar"><div class="bar-fill" id="loadBar"></div></div>
    </div>
    <div id="game-wrapper">
        <canvas id="game"></canvas>
    </div>
    <div id="landscape-warning">
        <div class="rotate-icon">📱</div>
        <div class="rotate-text">ROTATE TO PORTRAIT</div>
        <div style="color:#556; font-size:11px;">Axeluga is designed for vertical play</div>
    </div>

    <div id="trophy-toast">
        <div id="trophy-toast-icon"></div>
        <div>
            <div id="trophy-toast-label">TROPHY UNLOCKED</div>
            <div id="trophy-toast-tier" class="bronze"></div>
            <div id="trophy-toast-name"></div>
        </div>
    </div>

    <button id="fullscreen-btn" aria-label="Fullscreen">⛶</button>

    <!-- No GameVolt SDK — game uses localStorage fallback automatically -->
    <script type="module" src="js/main.js"></script>
    <script>
        // Fullscreen toggle
        const fsBtn = document.getElementById('fullscreen-btn');
        fsBtn.addEventListener('click', () => {
            const el = document.documentElement;
            if (!document.fullscreenElement && !document.webkitFullscreenElement) {
                (el.requestFullscreen || el.webkitRequestFullscreen).call(el);
            } else {
                (document.exitFullscreen || document.webkitExitFullscreen).call(document);
            }
        });
    </script>
</body>
</html>
HTMLEOF

# ── Create zip ──
echo "  📦 Creating zip..."
cd "$BUILD_DIR"
zip -r -q "../$ZIP_NAME" .
cd ..

# ── Report ──
SIZE=$(du -sh "$ZIP_NAME" | cut -f1)
FILE_COUNT=$(unzip -l "$ZIP_NAME" | tail -1 | awk '{print $2}')
echo ""
echo "✅ Build complete!"
echo "   📁 $ZIP_NAME ($SIZE)"
echo "   📄 $FILE_COUNT files"
echo ""
echo "   To test locally:"
echo "   cd $BUILD_DIR && python3 -m http.server 8080"
echo ""
echo "   Ready for submission to CrazyGames / Poki!"

# Clean up build dir (zip is the deliverable)
rm -rf "$BUILD_DIR"
