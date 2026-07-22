# One Stroke — spelrevision och förbättringsrapport

**Datum:** 2026-07-22  
**Omfattning:** kampanj (200 nivåer), tutorial, Daily Challenge, challenges, mobil/touch, progression, GameVolt-SDK, PWA/offline, achievements, delning och marknadsassets.

**Status 2026-07-22:** P0, P1 och P2 är genomförda. P2 lade till plausibility-gate för rankade runs, cacheversionering, cloud-synkad Daily-historik/streak, egen rank utanför topp 20, kampanjkapitel i level select, valbart ljud/haptik samt förbättrade tab-, modal- och keyboard-gridflöden.

## Sammanfattning

One Stroke är innehållsmässigt ett av GameVolts mest kompletta pusselspel. Kärnloopen är ren och lättförståelig, det finns 200 kampanjnivåer, åtta handgjorda tutorial/bridge-nivåer, fyra svårighetsband, Daily Challenge, lokala high-score-data, delbara resultat, challenges och 31 trophies. Projektets egna verifieringsverktyg godkänner samtliga handgjorda bridge-nivåer, och analysen hittar inga trasiga övergångar mellan svårighetsbanden eller felaktiga par-värden.

Spelet är däremot inte färdigt som en stabil cross-device-produkt. Den största risken är cloud save: kampanjprogress läses aldrig tillbaka från GameVolt, och den data som skrivs till molnet saknar själva listan över lösta nivåer. Inloggade användare kan därför förlora eller inte få med sig progression mellan enheter trots att sidan lovar synkning. Dessutom skapar spelet cloud challenges automatiskt vid sidladdning, vilket kan ge onödiga databasrader och API-anrop.

Min rekommendation är en **One Stroke 1.1 — Clean Line Update** i tre tydliga delar: (1) laga data/synkning och challenge-livscykeln, (2) förbättra onboarding, mobilpresentation och belöningskänsla, (3) fördjupa Daily och kampanjens mastery-loop. Spelet behöver inte fler vanliga nivåer nu; det behöver få de 200 befintliga nivåerna att kännas mer varierade, pålitliga och värdefulla.

## Prioriterad åtgärdslista

| Prioritet | Åtgärd | Typ | Insats | Effekt |
|---|---|---|---|---|
| P0 | Bygg riktig versionssatt cloud save och läs tillbaka progression vid login/start | Bugg/data | Medel | Mycket hög |
| P0 | Sluta skapa cloud challenges automatiskt vid sidladdning och Daily-start | Bugg/backend | Liten–medel | Mycket hög |
| P1 | Bestäm UTC eller lokal dag konsekvent för Daily-label, seed, streak och save-key | Bugg | Liten | Hög |
| P1 | Ersätt det felkopierade Manga Match-scriptet för One Stroke-marknadsbilder | Bugg/tooling | Liten | Hög |
| P1 | Spela igenom nivå 1–20 och jämna ut onboarding/svårighetskurvan | Polish/design | Medel | Hög |
| P1 | Gör första minuten mer direkt: tydlig start, visuell draginstruktion och snabb första vinst | Polish/UX | Medel | Hög |
| P1 | Ge completion mer juice, PB-feedback och kampanjprogress | Polish | Medel | Hög |
| P2 | Blockera eller märk orimliga Daily-resultat innan leaderboard-submit | Bugg/integritet | Medel | Medel–hög |
| P2 | Synka Daily streak/resultat via GameVolt i stället för enbart lösa localStorage-nycklar | Feature | Medel | Hög |
| P2 | Förbättra level select med kapitel, milestones, PB och nästa mål | Feature/polish | Medel | Hög |
| P2 | Lägg ljud/haptik och tydligare feedback för giltigt steg, undo, dead end och vinst | Polish | Medel | Hög |
| P2 | Tillgänglighet: riktiga tabroller, fokusfälla i modaler och spelbar keyboard-grid | Polish/a11y | Medel | Medel |
| P3 | Lägg mekaniska variationer i utvalda nivåer i stället för fler standardgrids | Feature | Stor | Hög |
| P3 | Veckoliga curated challenges, ghosts eller vänjämförelse | Feature | Stor | Medel–hög |

## Buggar

### P0 — Cross-device progression fungerar inte som sidan lovar — ÅTGÄRDAD

**Bekräftat i kodgranskning.** `syncCloudSave()` skickar endast `unlockedLevel`, antal lösta nivåer och antal achievements. Själva `solvedLevels`-objektet med nivå-ID, bästa tid, undo/reset/hints och played count skickas inte. Spelet anropar dessutom aldrig `GameVolt.save.get()`, så en ny enhet läser inte tillbaka cloud save till lokal state.

Migrationen gör problemet mer riskabelt: första migrationen kan returnera hela det gamla lokala progressobjektet, men senare `save.set()` skriver ett annat, mycket tunnare schema. Det finns ingen versionsmarkering eller fältvis merge.

**Fix:** inför exempelvis `{ version: 1, campaign: { unlockedLevel, solvedLevels }, achievements, daily, updatedAt }`. Läs molndata efter `GameVolt.onReady()`, merge:a per nivå (bästa tid/lägsta actions men högsta played count enligt tydlig regel), uppdatera lokal state och rendera om. Testa guest → login, enhet A → B och konflikt mellan två enheter.

### P0 — Cloud challenges skapas utan spelarens avsikt — ÅTGÄRDAD

**Bekräftat i kodgranskning.** Konstruktorn kör `createChallenge(todaySeed())`. `createChallenge()` anropar `GameVolt.challenge.create()` när användaren är inloggad. Det innebär att en cloud challenge kan skapas vid varje sidladdning trots att spelaren bara vill spela kampanjen. `startDailyChallenge()` använder samma funktion, så även Daily-start och replay kan skapa separata challenge-poster som inte behövs för Daily leaderboard.

**Fix:** gör lokal challenge-generering ren och utan backendeffekt. Skapa en cloud challenge först när spelaren uttryckligen väljer `Challenge a friend`/`Share challenge`. Daily ska använda Daily-API:t och inte skapa en 1v1-challenge.

### P1 — Daily använder UTC-seed men visar lokal kalenderdag — ÅTGÄRDAD

`todaySeed()` bygger datum med `toISOString()` (UTC), medan rubriken formaterar `new Date()` i spelarens lokala tidszon. Runt lokal midnatt kan UI därför säga exempelvis 23 juli medan seed, save-key och leaderboard fortfarande gäller 22 juli. Streakberäkningen blandar också lokal `setDate()` med UTC-serialisering.

**Fix:** välj en enda kontrakterad tidszon. För en global challenge är UTC enklast: skapa ett gemensamt `dailyDayId`, formatera även labeln från detta ID och använd samma ID för seed, storage, streak, share och leaderboard.

### P1 — Marketing capture-scriptet tillhör Manga Match — ÅTGÄRDAD

**Bekräftat i fil och asset.** `one-stroke/tools/capture_marketing.mjs` letar efter Manga Match-element som `#score`, `#combo`, `.hud-panel` och skriver `MANGA MATCH!` i OG-layouten. Den befintliga `screenshot-mobile.png` visar Manga Match, inte One Stroke. `og-image.png` är däremot en giltig One Stroke-bild.

**Fix:** skriv om capture-scriptet mot One Strokes DOM och skapa desktop-, mobil- och actionbilder på nytt. Lägg en enkel kontroll som kräver att sidtiteln innehåller `One Stroke` före capture.

### P2 — Anti-cheatresultatet påverkar inte leaderboard-submit — ÅTGÄRDAD

Challenge-runnen kör `checkRunResult()` och sparar `plausible`, men `submitToLeaderboard()` skickar ändå alltid poängen för inloggade användare. En manipulerad klient kan dessutom anropa leaderboard-API:t direkt.

**Fix:** submit endast när lokal plausibility är godkänd och visa en tydlig status om en run inte kan rankas. För en seriös topplista behövs på sikt servervalidering eller åtminstone server-side bounds per fem splits.

### P2 — Service worker-versionen är statisk — ÅTGÄRDAD

Cache heter fortfarande `one-stroke-v1`. Uppdateringar hämtas i bakgrunden men den aktuella navigationen får ofta den gamla cachade filen, vilket kan göra buggrapporter och releaseverifiering svårtolkade.

**Fix:** bumpa cacheversion per release eller inför ett litet versionsmanifest och en kontrollerad update-notis/reload.

### P3 — Döda DOM-referenser och kvarlämnad legacykod

Appen söker efter `challengeGenerateBtn`, `exportMatchBtn`, `importMatchBtn` och `dailyReplayBtn`, men dessa element finns inte i HTML. Optional chaining gör att sidan inte kraschar, men det skapar osäkerhet om vilka challengefunktioner som faktiskt ska vara exponerade.

**Fix:** ta bort död kod eller återinför funktionerna som tydligt designade UI-flöden. Undvik osynliga kompatibilitetsfält som permanent arkitektur.

## Polish

### Första minuten och tutorial

Kärnregeln är enkel, men instruktionen är främst text: `Drag from the start node to a neighbor`. Spelet skulle vinna mycket på att första nivån demonstrerar handlingen visuellt med pulserande startnod, animerad ghost-line och en enda tydlig CTA. De första 8 nivåerna är handgjorda, vilket är bra, men nivå 9 hoppar in i den genererade kampanjen utan ett tydligt examensögonblick.

**Förslag:** gör nivå 1–3 till mikrolektioner (dra, backtrack, dead-end), nivå 4–8 till guided practice och ge en kort `Tutorial complete`-belöning före den fulla kampanjen.

### Svårighetskurva

QA-analysen laddade alla 200 nivåer och fann inga trasiga bandövergångar, men flaggade 76 granskningspunkter: 49 metric-outliers och 27 större hopp mellan intilliggande nivåer. Easy, Medium och Hard har mätbara dippar inom sina band; Hard har bland annat flera hopp mellan par 29 och 38.

Detta betyder inte att 76 nivåer är fel. Metrikerna är proxies, men de pekar ut en bra playtestlista. Börja med Easy 9, 17, 20, 37, 51 och 60; Medium 11, 28, 39, 59; Hard 4, 6–7, 20–21, 31–32, 40–41; Very Hard 12 och 23.

### Spelkänsla

Den visuella identiteten är ren och konsekvent, men kärnhandlingen kan få mer kropp utan att bli stökig:

- diskret ljud/haptik per nod, mörkare ton vid backtrack och tydlig dead-end-signal;
- en liten elasticitet i linjen och glow-puls när ett steg registreras;
- completion-wave längs hela den färdiga vägen;
- `New best −4.2s`, färre undos och kampanjmilestone direkt i vinstmodalen;
- reduced motion ska fortsatt respekteras.

### Meny och informationshierarki

Desktopvyn visar många små stats, regler och nivåkontroller samtidigt. På mobil flyttas funktioner till panel och bottom bar, men informationsmodellen är fortfarande desktop-tung. Kampanjens primära mål bör dominera: aktuell nivå, progress och `Continue`. Regler och full level select kan vara sekundära.

### Accessibility

Det finns bra grunder: labels, live region, pointer events, keyboard shortcuts och `prefers-reduced-motion`. Men `role="tablist"` används utan motsvarande `role="tab"`/`aria-selected`, modaler saknar tydlig fokusfälla/återställning och boardens noder är inte ett komplett keyboardnavigerbart grid.

## Features

### Kampanj-mastering före fler nivåer

De 200 nivåerna är redan ett starkt mängderbjudande. Gör dem mer meningsfulla i grupper:

- 10 kapitel à 20 nivåer med namn, accentfärg och milestone;
- medaljer för tid, undos eller no-hint i stället för endast solved;
- kapitelöversikt med `17/20 solved`, bästa totalsumma och nästa unlock;
- curated showcase-nivå var tionde bana med mer distinkt form.

### Daily 2.0

Daily har redan seed, fem nivåer, score, streak, share image och leaderboard. Nästa version bör fokusera på tillit och återkomst:

- serverstyrt `dailyId` och GameVolt-streak;
- topplista med spelarens egen rank även utanför top 20;
- en run som räknas för rank, därefter tydligt markerad practice/replay;
- veckovy `5/7`, longest streak och tidigare resultat;
- delningskort som visar score, tid, hints/undos och rank utan att avslöja lösning.

### Mekanisk variation

I stället för nivå 201–300 kan ett mindre antal regler ge större upplevd variation:

- fast slutnod på utvalda banor;
- one-way edges eller broar som korsar utan att ansluta;
- nyckelnod som måste passeras före en låst del;
- symmetry challenge eller begränsat antal undos;
- särskilda regler endast i bonus-/eventbanor så grundkampanjen behåller sin renhet.

### Sociala challenges

Kodbasen har redan mycket av infrastrukturen för matchkoder och cloud challenges, men UI:t exponerar främst Daily. Paketera det som en avsiktlig feature: `Challenge a friend`, välj 3/5/10 nivåer, dela länk, se resultat per split och spela endast en rankad attempt.

## Rekommenderad releaseordning

### Del 1 — Buggar/stabilitet

1. Versionssatt cloud save med pull, merge och full `solvedLevels`.
2. Separera lokal generator, Daily och explicit friend-challenge så backend inte muteras vid load.
3. Enhetligt UTC-day-ID för hela Daily-flödet.
4. Leaderboard-gate och service-worker-versionering.
5. Reparera marketing capture-script och generera rätt screenshots.

### Del 2 — Polish

1. Visuell tutorial och playtest av nivå 1–20.
2. Completion-juice, PB-delta, ljud och haptik.
3. Förenklad mobil/desktop-hierarki med tydlig Continue.
4. Tillgänglighetsrunda och test vid 360, 390, 430, 768 och desktop.
5. Kuraterad omordning av QA-verktygets största progression-outliers.

### Del 3 — Features

1. Daily 2.0 med serverdatum, streak och egen rank.
2. Kampanjkapitel och mastery-medaljer.
3. Ett litet bonusset med nya mekaniker.
4. Tydligt friend-challenge-flöde ovanpå befintlig matchkod/cloudkod.

## Verifiering som utfördes

- `node tools/verify_bridge_levels.mjs`: samtliga fem bridge-nivåer i verktygets scope godkända.
- `node tools/analyze_progression.mjs`: 200 nivåer laddade; inga bandövergångsfel eller par-outliers; 76 review-flaggor.
- `node --check` på app-, core-, game- och relevanta datafiler: inga syntaxfel.
- Statisk kontroll av SDK-, storage-, Daily-, challenge-, leaderboard-, PWA- och DOM-flöden.
- Visuell kontroll av befintliga marknadsassets; mobilbilden är felaktigt Manga Match-material.

Interaktiv browserautomation var inte tillgänglig i sessionen. Layout, touchkänsla och verkliga GameVolt/Supabase-anrop bör därför köras som en separat manuell/browserbaserad QA-runda innan release.
