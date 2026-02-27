🐍 Snake Neo – v0.4 Stable Grid Edition

Modern silk-smooth Snake med neonram, grid-baserad logik och exakt kollektion.

📌 Översikt

Snake Neo är en modern och responsiv Snake-variant byggd för webben med:

Kvadratiskt grid med 100% exakt logik

Silkesmjuk rörelse via interpolering

Neonram som tydligt markerar banans gränser

Pixel-perfekt rendering för både desktop, iPad och mobil

Stabil gameloop med cache-skydd för Safari/iOS

Modulär filstruktur (ES Modules)

Förberedd för Level Editor (framtida v0.5)

Version v0.4 markerar den första officiellt stabila versionen där logik och grafik är helt synkroniserade.

🚀 Vad som är nytt i v0.4

Ny renderer v4.1

Synlig neonram (A-stilen)

Kvadratiska celler (inte utdragna)

Perfekt centrerad spelplan

Exakt kollision mot ramen

Smooth B1-kurvor i 90°-svängar

Ny Snake v2.0

Grid-baserad kropp (gridCells)

Stabil självkollision

Interpolation mellan steg

Ny Game-loop med Loop-ID

Förhindrar dubbletter i Safari/iOS

Zero-reset buggar

Exakt tidskontroll och capped dt

Ny main.js

Stoppar gamla loops

No-cache support

Säker initiering

Ny fullscreen resize-modell

Ingen stretch

Alla enheter stöds

Banor hålls kvadratiska

📁 Filstruktur
project/
│
├── index.html
├── style.css
│
└── js/
    ├── main.js
    ├── game.js
    ├── grid.js
    ├── snake.js
    ├── renderer.js
    ├── food.js
    ├── input.js
    ├── themes.js
    ├── levels.js
    └── levels/
         └── level01.json

🧠 Tekniskt upplägg
Grid & Logik

Spelet kör logiskt på ett 24×24-grid (kan ändras via level-filen).
Snake rör sig ett gridssteg i taget, med:

diskreta logiska steg (stepOnce())

mjuk interpolering mellan gamla och nya grid-positioner (getInterpolatedPoints())

Det ger ett perfekt Snake-beteende samtidigt som visuellt flyt (smooth animation).

Rendering

Renderer v4.1 ansvarar för:

kvadratiska celler

centrerat spelplan

neonram med glow

interpolerad linjerendering

pixel-perfekt alignment

Rendering separeras helt från logik.

Input

Input.js hanterar:

piltangenter

WASD

touch-swipe (för iPad/mobil)

Kollision

Logik i game.js:

väggkollision via grid.inBounds(x,y)

självkollision via snake.hitsSelf()

matätning & spawn via food.respawn()

📱 Plattformsstöd

Testat och optimerat för:

Chrome (desktop)

Safari (desktop)

Safari på iPad

iOS Safari (iPhone)

Chrome Android

Spelet är 100% touch-kompatibelt.

🔧 Konfig via Level-fil

Alla banor ligger i:

/js/levels/


Exempel:

{
  "gridWidth": 24,
  "gridHeight": 24,
  "start": [12, 12],
  "startDir": "right"
}


Du kan skapa flera banor och välja vilken som ska laddas i game.js.

🧱 Known Good State

Detta är en stabil baseline att utveckla vidare på:

Level Editor (v0.5)

Power-ups

Flera visual modes

Endless mode

Progressive difficulty

Score HUD + combo system

Banbyte (t.ex. 10 frukter → nästa bana)