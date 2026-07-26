# Axeluga — djupanalys och åtgärdsprogram

**Datum:** 2026-07-26
**Omfattning:** spelupplevelse, första minuten, desktop, mobil/touch, progression, svårighetsgrad, poäng/topplista, achievements, GameVolt-SDK, ljud, grafik, prestanda, PWA/offline, tillgänglighet, kodstruktur och releaseplan.

**Status 2026-07-26:** P0.1–P0.5, P1.1–P1.8 och P2.1–P2.8 är implementerade. Utöver säkrad Campaign/Practice-integritet och förbättrad first-flight-UX har spelet nu tätare vågpacing, fem mekaniska världsregler, boss-telegraphs och bossresultat, fasta behovsstyrda power-ups, orankad Continue från checkpoints, UTC-baserade Daily Sector/Weekly Boss med ett rankat försök, reduced motion/color assist samt strömmad världsmusik med byte-progress och prefetch. Kontrakten verifieras av `axeluga/tools/verify_p0_contracts.mjs`, `verify_p1_contracts.mjs` och `verify_p2_contracts.mjs`.

## Sammanfattning

Axeluga har en av GameVolts starkaste innehållsgrunder: fem visuellt skilda världar, 50 vågor, minibossar, fem bossar, tre svårighetsgrader, formationssystem, flera fiendetyper, power-ups, vapenuppgraderingar, bomber, combo, touch, tangentbord, gamepad, sex musikspår och 31 achievements. Det är mer innehåll än första intrycket kommunicerar.

Spelets största problem är inte brist på funktioner. Det är att funktionerna saknar en tydlig produktstruktur och att några system motsäger varandra:

- Menyn presenterar ett färdigt kampanjspel, men världsväljaren fungerar samtidigt som en publik debugmeny.
- Alla världar kan startas direkt och värld 2–5 ger maxade uppgraderingar.
- Alla starter och svårighetsgrader skickar poäng till samma leaderboard.
- Flera achievements säger ”klara alla världar”, men kan låsas upp genom att endast starta och klara sista världen.
- Mobilens standardkontroll kräver i praktiken två fingrar eftersom autofire är avstängt.
- Den viktiga stridsinformationen är mycket liten på mobil och dubbleras på desktop.
- Spelet innehåller cirka 8 500 rader kod, varav cirka 6 300 ligger i en enda `game.js`.
- Ljudfilerna gör paketet cirka 15 MB, men laddas före menyn i stället för stegvis per värld.

Axeluga bör därför inte byggas om från grunden. Rekommendationen är en fokuserad **Axeluga 2.0 — Recharged Update** i fyra steg:

1. Säkra progression, leaderboard och achievements.
2. Förbättra första minuten och mobilkontrollerna.
3. Kurera tempo, stridsläsbarhet, bossar och belöningar.
4. Härda arkitektur, laddning, PWA och testning.

Målet är att göra Axeluga till GameVolts primära arkadkampanj: lätt att börja spela på mobil, tillräckligt djup för längre sessioner och trovärdigt som tävlingsspel.

---

## Revisionens underlag

Analysen bygger på:

- speltest av lokal produktion på desktop;
- mobiltest vid 390 × 844;
- genomgång av meny, världsväljare och första stridsvågen;
- granskning av `index.html`, `sw.js` samt alla filer i `axeluga/js/`;
- granskning av sparning, achievements, poäng, GameVolt-anrop, touchzoner, världssystem, fiendeformationer och svårighetsmultiplikatorer;
- storlekskontroll av kod och tillgångar.

Browsertestet gav inga konsolvarningar eller JavaScript-fel under de testade flödena. Problemen nedan är främst produkt-, integritets-, UX- och arkitekturproblem.

---

## Styrkor att bevara

### 1. Stor faktisk kampanj

Fem världar med tio vågor vardera är ett riktigt kampanjlöfte, inte bara ett endless-läge med nya färger. Världarna har egna bakgrunder, fiendepooler, musik, minibossar och bossar.

### 2. Stark grundloop

`flytta → undvik → skjut → bygg combo → samla power-up → ladda bomb → besegra boss` är begripligt och passar korta webbspelssessioner. Systemen stödjer både nybörjare och score-chasing.

### 3. Bred kontrollsupport

Tangentbord, touch och gamepad stöds i samma spel. Det är ovanligt starkt för ett fristående HTML5-spel och bör marknadsföras bättre.

### 4. Bra grund för replayability

Tre svårighetsgrader, poängbonus för snabb och ren clear, lokal historik, global leaderboard och 31 achievements ger redan komponenterna för återspel.

### 5. Tydlig vertikal identitet

Porträttformatet, synthwave-/arkadpresentationen och den centrala spelkolumnen skiljer Axeluga från de flesta andra GameVolt-spel.

---

## Prioriterat åtgärdsprogram

| ID | Prioritet | Åtgärd | Typ | Insats | Effekt |
|---|---|---|---|---|---|
| P0.1 | P0 | Ta bort publik debugstart med max power från värld 2–5 | Integritet/bugg | Liten | Mycket hög |
| P0.2 | P0 | Definiera campaign, practice och score attack som separata run-typer | Produkt/data | Medel | Mycket hög |
| P0.3 | P0 | Separera leaderboard per run-typ och svårighetsgrad | Integritet | Medel | Mycket hög |
| P0.4 | P0 | Laga full-clear-achievements så de kräver värld 1→5 i samma run | Bugg | Liten–medel | Mycket hög |
| P0.5 | P0 | Versionssätt saveformat och synka progression, inte bara migration | Data | Medel | Mycket hög |
| P1.1 | P1 | Gör autofire standard på touch och lär ut kontrollen i spelet | Mobil/UX | Liten | Mycket hög |
| P1.2 | P1 | Bygg ett direkt startflöde: Continue/Start Run före världsväljare | UX | Medel | Hög |
| P1.3 | P1 | Gör första tre vågorna till aktiv onboarding | Speldesign | Medel | Hög |
| P1.4 | P1 | Förbättra mobil-HUD, safe areas och kontrollzoner | Mobil/UX | Medel | Hög |
| P1.5 | P1 | Visa tydlig hitbox, projektilkontrast och farosignaler | Läsbarhet | Medel | Hög |
| P1.6 | P1 | Skapa riktig Game Over/Run Summary med PB-delta och nästa mål | Retention | Medel | Hög |
| P1.7 | P1 | Avsluta analytics korrekt vid victory, quit och sidlämning | Analytics | Liten | Medel–hög |
| P1.8 | P1 | Ta bort SmartProc-/debugrester och samla versionsinfo | Presentation | Liten | Medel |
| P2.1 | P2 | Kurera vågornas tempo och minska tom väntan | Speldesign | Medel | Hög |
| P2.2 | P2 | Ge varje värld ett tydligt mekaniskt tema | Speldesign | Medel–stor | Hög |
| P2.3 | P2 | Fördjupa bossarnas telegraphs, faser och resultatfeedback | Bossdesign | Medel–stor | Hög |
| P2.4 | P2 | Gör power-ups till begripliga val med tydligare pickup-feedback | Spelkänsla | Medel | Medel–hög |
| P2.5 | P2 | Lägg till Continue och checkpoints utan att förstöra score runs | Progression | Medel | Hög |
| P2.6 | P2 | Skapa Daily Sector/Weekly Boss som återkomstloop | Retention | Medel–stor | Hög |
| P2.7 | P2 | Lägg till reduced motion, färgblindhet och bättre kontrast | A11y | Medel | Medel |
| P2.8 | P2 | Strömma musik per värld och visa verklig laddningsprogress | Prestanda | Medel | Medel–hög |
| P3.1 | P3 | Dela upp `game.js` efter stabiliserad design | Arkitektur | Stor | Hög långsiktigt |
| P3.2 | P3 | Inför deterministisk RNG och verifierbara run-sammanfattningar | Tävlingsintegritet | Stor | Medel–hög |
| P3.3 | P3 | Lägg automatiska kontraktstester för progression, save och score | QA | Medel | Hög |
| P3.4 | P3 | Inför PWA-cachegate och kontrollerad update-notis | PWA/QA | Medel | Medel |
| P3.5 | P3 | Skapa portalbuild och marknadsassets efter 2.0-polish | Distribution | Medel | Hög |

---

## P0 — kritiska problem

### P0.1 Publik debugstart påverkar progression och tävling

Världsväljaren låter spelaren starta vilken värld som helst. Vid start i värld 2–5 kör `startGame(startWorld)` följande:

- vågräknaren snabbspolas till vald värld;
- vapnet sätts till nivå 5;
- speed sätts till max;
- shield och längre invulnerability ges;
- UI:t visar `DEBUG: MAX POWER START`.

Samma run kan därefter skicka poäng till `mode: 'default'`. Debugfunktionen ligger alltså i produktion och är kopplad till den riktiga topplistan.

**Åtgärd:**

- Ta omedelbart bort max-power-blocket från produktion.
- Flytta debugstart bakom en explicit intern queryparameter, exempelvis `?debug=1`, och bygg bort den ur portalversionen.
- Markera interna runs med `ranked: false` och blockera leaderboard/achievements.
- Bestäm om världsväljaren ska vara progression eller practice. Blanda inte båda.

**Acceptanskriterium:** Ingen publik menyväg kan starta en förstärkt eller förkortad run som skickar resultat eller låser tävlingsachievements.

### P0.2 Campaign, practice och score attack saknar separata regler

Nu används samma `startGame()` och samma scoreläge för:

- full run från Deep Space;
- direktstart i en senare värld;
- easy, medium och hard;
- retry från Game Over.

Det gör resultat svåra att jämföra. En full kampanj och en världsträning är olika produkter och måste behandlas som olika run-typer.

**Föreslaget kontrakt:**

```text
CAMPAIGN
Start: värld 1
Progress: värld 1→5
Continue: checkpoint mellan världar
Leaderboard: campaign-easy / campaign-medium / campaign-hard

ARCADE RUN
Start: värld 1
Progress: värld 1→5 utan checkpoint
Leaderboard: arcade-easy / arcade-medium / arcade-hard

PRACTICE
Start: valfri upplåst värld
Progress: en värld eller fri träning
Leaderboard: ingen
Full-clear trophies: ingen
```

För en mindre 2.0-release kan Campaign och Practice räcka. Arcade Run kan komma senare.

### P0.3 Leaderboard blandar ojämförbara resultat

Alla poäng skickas till `default` trots att svårighetsgraderna ändrar fiende-HP, eldhastighet, fart, antal formationer och drop rate. Direktstarter blandas också in.

**Åtgärd:**

- Lägg `runType`, `difficulty`, `startWorld`, `endWorld`, `elapsedFrames`, `damageTaken` och `completed` i lokal run summary.
- Skicka bara rankade run-typer.
- Använd separata modes, minst `campaign-easy`, `campaign-medium`, `campaign-hard`.
- Behåll en samlad profilsiffra som personlig ”career score”, inte som tävlingslista.
- Bestäm om score ska submittas vid Game Over eller endast vid full clear; märk leaderboarden därefter.

### P0.4 Achievements kan få fel innebörd

`checkVictoryTrophies()` låser bland annat:

- `galaxy-savior`;
- `medium-clear`;
- `hard-clear`;
- `no-death-run`.

Kontrollen vet inte om spelaren började i värld 1. En spelare kan därför starta City Assault direkt, få max power och låsa full-run-achievements efter endast sista världen.

`boss-rage-survivor` kräver däremot fem rena bossar och blir svår eller omöjlig vid direktstart. Achievements använder alltså två olika definitioner av ”run”.

**Åtgärd:**

- Spara `runStartWorld`, `worldsClearedThisRun` och `practice`.
- Kräv `runStartWorld === 0` och exakt fem klarade världar för full-clear-trophies.
- Blockera full-run-trophies i practice.
- Lägg kontraktstester för varje trophyregel.
- Kontrollera även om befintliga felaktiga unlocks ska lämnas som legacy eller återställas före 2.0.

### P0.5 Cloud save är en migration, inte ett komplett savesystem

Registreringen migrerar `axeluga_hi`, `axeluga_settings` och `axeluga_trophies`, men spelet har inget tydligt versionssatt saveobjekt för:

- upplåsta världar/checkpoints;
- campaign-progress;
- personliga rekord per svårighetsgrad;
- run history;
- inställningar med konfliktregler;
- framtida Daily/Weekly-data.

High score hämtas separat från leaderboard och achievements backfillas separat. Det fungerar delvis, men blir svårförutsägbart när riktig progression läggs till.

**Föreslaget schema:**

```javascript
{
  version: 2,
  campaign: {
    highestUnlockedWorld: 0,
    clearsByDifficulty: { easy: [], medium: [], hard: [] },
    checkpoints: {}
  },
  records: {
    campaignEasy: null,
    campaignMedium: null,
    campaignHard: null
  },
  settings: {
    musicVolume: 0.7,
    sfxVolume: 0.8,
    autofireTouch: true,
    leftHanded: false,
    reducedMotion: false
  },
  stats: {},
  updatedAt: 0
}
```

Achievements ska fortsatt använda achievement-API:t, men kan speglas lokalt för offlinevisning.

---

## Första minuten

### Nuvarande flöde

```text
Laddning → huvudmeny → Start → välj värld → välj svårighetsgrad → världstitel → första vågen
```

Det fungerar, men kräver flera beslut innan spelaren har lärt sig kärnhandlingen. Fem världar presenteras som likvärdiga val trots att nya spelare rimligen ska börja i värld 1. Svårighetsgrad väljs utan en begriplig beskrivning.

### Rekommenderat flöde

För ny spelare:

```text
Titel → PLAY → 10 sekunders spelbar tutorial → våg 1
```

För återvändande spelare:

```text
Titel → CONTINUE WORLD 3
      → NEW RUN
      → PRACTICE
```

### Tutorial i själva spelet

De första tre vågorna bör lära utan separata textskärmar:

1. **Move:** pulserande målposition och `DRAG TO MOVE`/`ARROWS TO MOVE`.
2. **Fire:** touch har autofire; desktop visar `HOLD SPACE TO FIRE`.
3. **Power-up:** första droppen är kontrollerad och förklaras kort.
4. **Bomb:** bombmätaren får en regisserad laddning och kort prompt när den är klar.
5. **Danger:** första fientliga projektilen får tydlig telegraph.

Tutorialprompter ska försvinna direkt när spelaren visar förståelse och aldrig stoppa spelet.

---

## Mobil och touch

### Bekräftade observationer vid 390 × 844

- Menyn fyller porträttformatet väl och knapparna har rimlig storlek.
- GameVolt-kontoraden tar vertikal plats ovanför canvas.
- Spelplanen fyller nästan hela bredden, men HUD-texten blir mycket liten.
- Poäng och världsinformation ligger nära skärmkanterna.
- Spelaren är visuellt liten jämfört med skärmen.
- Standardinställningen `autofire: false` kräver ett rörelsefinger och ett separat skjutfinger.
- Vänster-/högerhänt läge finns, men upptäcks först i Options.

### Åtgärder

- Sätt touch-autofire till `true` som standard. Behåll manuell eld som avancerat val.
- Identifiera inputtyp vid första interaktionen och visa rätt instruktion.
- Lägg kontrollinställningen i första runnen: `AUTO-FIRE ON · CHANGE IN OPTIONS`.
- Höj minsta viktiga HUD-text till en läsbar fysisk storlek.
- Lägg safe-area-padding i spelkoordinaterna, inte bara på `body`.
- Gör touch offset konfigurerbar och visualisera skeppets målpunkt första gången.
- Lägg haptik på hit, pickup, bomb ready och boss defeat, med separat avstängning.
- Testa minst 360×800, 375×667, 390×844, 430×932 och tablet portrait.
- Behåll portrait-fokus, men ge landscape-varningen reduced-motion-stöd.

---

## Stridsläsbarhet och spelkänsla

### Problem

Spelet använder tillgångar från flera grafikpaket. Varje enskild sprite kan vara bra, men tillsammans varierar:

- pixelstorlek;
- färgmättnad;
- detaljnivå;
- silhuett;
- ljusriktning;
- projektilspråk.

Bakgrunderna är detaljrika och vissa planeter/asteroider kan konkurrera med fiender. Den lilla spelaren och tunna HUD-informationen gör det svårt att snabbt avläsa hitbox, power state och faror.

### Åtgärder

- Definiera en visuell kontraktsmatris:

| Element | Primär signal | Sekundär signal |
|---|---|---|
| Spelare | cyan/vit silhuett | tydlig hitboxpunkt |
| Fiende | världsfärg | röd/orange skadaflash |
| Fientligt skott | varm färg + kant | kort spawn-telegraph |
| Spelarskott | cyan/blå | ljus trail |
| Power-up | egen form per typ | label vid pickup |
| Farligt hinder | varningsring | ljudsignal |

- Lägg en valbar, diskret hitboxpunkt på spelaren.
- Ge fiendeskott en minsta ljusstyrka och outline oberoende av värld.
- Dämpa bakgrunden lokalt bakom kritiska projektiler.
- Lägg pickup freeze på 50–80 ms, tydligt ljud och kort text.
- Visa `WEAPON UP`, `SPEED UP`, `SHIELD` och faktisk effekt/tid.
- Gör damage feedback tydlig utan att helt täcka spelplanen.
- Respektera reduced motion för shake, flash och scanlines.

---

## Vågdesign och pacing

Axelugas formationer väljs delvis slumpmässigt. Det ger variation men gör svårighetskurvan och onboarding svårare att kontrollera.

### Rekommenderad struktur per värld

```text
Våg 1   introducera världens basfiende
Våg 2   introducera rörelsemönster
Våg 3   första kombinationen
Våg 4   projektil-/hinderpress
Våg 5   miniboss
Våg 6   ny regel eller miljöfara
Våg 7   kombination av tidigare regler
Våg 8   hög intensitet
Våg 9   kort masteryvåg
Våg 10  boss
```

### Världarnas mekaniska identitet

| Värld | Nuvarande tema | Rekommenderat mekaniskt löfte |
|---|---|---|
| Deep Space | rymd/asteroider | tydliga formationer, grundkontroller, milda hinder |
| Station Approach | block/station | trängre lanes, turrets och korseld |
| Station Core | byggnader/teknik | lasergrindar, sköldade fiender, prioriteringsmål |
| Atmosphere | moln/vingar | snabbare svep, vind-/driftkänsla, stora silhuetter |
| City Assault | stad/invasion | markmål, vertikala lanes, aggressiva elitformationer |

Varje ny regel ska först demonstreras ensam och därefter kombineras med tidigare regler.

### Slump och rättvisa

- Kurera fasta öppningsvågor i varje värld.
- Använd seedad variation inom definierade formation pools.
- Undvik att slumpa kombinationer som skapar ofrånkomlig skada.
- Spara seed i run summary.
- Lägg ett test som simulerar formationsgränser och kontrollerar spawnpositioner.

---

## Bossar

Bossarna är Axelugas största marknadsföringsmöjlighet. De bör vara spelets tydligaste höjdpunkter.

### Bosskontrakt

Varje boss bör ha:

1. unik entré och namn;
2. 2–3 läsbara attacker;
3. tydlig telegraph före varje farlig attack;
4. minst två faser;
5. synlig HP-bar med fasmarkörer;
6. kort enrage som ökar intensiteten, inte bara hastigheten;
7. stor defeat-sekvens;
8. resultat: tid, skada, max combo och bonus;
9. practice-upplåsning efter första clear.

### Bossresultat

Efter varje boss:

```text
DEEP SPACE CLEARED
Boss time       01:14
Damage taken        1
Max combo          18
No-bomb bonus  +5 000
New best        −08.2s
```

Det gör skicklighet begriplig och ger ett konkret skäl att spela om världen.

---

## Progression och retention

### Kampanj

- Värld 1 är upplåst från start.
- Nästa värld låses upp när föregående klaras.
- Checkpoint sparas mellan världar i Campaign.
- Continue återställer en definierad standardloadout, inte exakt live-state, så balansen förblir begriplig.
- Full clear från värld 1 utan Continue kan ge särskild medalj.

### Medaljer

Ge varje värld tre separata mastery-medaljer:

- **Clear** — besegra bossen;
- **Clean** — klara med högst N skador;
- **Score** — slå världens poängmål.

Det är mer motiverande än en enda binär upplåsning och återanvänder befintligt innehåll.

### Daily Sector

En mindre Daily kan byggas av befintliga system:

- tre seedade vågor + en miniboss;
- samma seed globalt;
- fast loadout;
- en rankad run, därefter practice;
- resultat baserat på score, tid och skada;
- delbart kort utan att avslöja hela seedens sammansättning.

### Weekly Boss

- en boss med veckomodifierare;
- gemensam leaderboard;
- fast svårighetsgrad/loadout;
- separat från kampanjens trophies.

Bygg inte Daily eller Weekly före P0-integriteten.

---

## Score och tävlingsintegritet

Nuvarande victoryscore innehåller speed-, HP- och clean bonus. Det är en bra början men värdena är stora och svåra att förstå.

### Rekommenderad poängmodell

```text
Base score       fiender och mål
Combo score      risk/reward under aktiv strid
Wave bonus       snabb clear + inga missade hot
Boss bonus       tid, skada, no-bomb
Clear bonus      svårighetsgrad och full run
```

### Krav

- Visa poänguppdelningen i Run Summary.
- Undvik dolda bonusar större än spelarens synliga baspoäng.
- Lägg rimlighetsgränser per run-typ.
- Spara run duration och progression i submission metadata om SDK-kontraktet stödjer det.
- Blockera submit från practice, debug och modifierade runs.
- Separera mode per svårighetsgrad.
- Dokumentera scoreversion, exempelvis `scoreVersion: 2`, så framtida balansändringar inte blandas med gamla resultat.

---

## Meny och informationsarkitektur

### Huvudmeny

Rekommenderad hierarki:

```text
AXELUGA
Continue — World 3
New Campaign
Practice

Daily Sector
Scores · Achievements · Options
```

För en ny spelare ersätts Continue med en stor `PLAY`-knapp.

### Desktop

Sidopanelerna skapar en bra cabinet-känsla men dubblerar information från canvas. Använd dem till sådant som inte får plats i spelkolumnen:

- vänster: värld, vågkarta och aktuella missionsmål;
- höger: score, PB pace, combo och aktiva modifiers;
- flytta inte kritisk HP/bomb-information bort från canvas.

### Branding

- Ersätt `SmartProc Games`/`SmartProc / GameVolt.io` med en konsekvent credit.
- Förslag: `A GameVolt Original by Martin Grahn`.
- Flytta versionsnummer till Credits/Options.
- Ta bort ordet `DEBUG` från alla publika ytor.

---

## Ljud

Sex musikspår är en stor styrka, men MP3-filerna står för huvuddelen av spelets cirka 15 MB.

### Problem

- `loadBGM()` initieras före första spelstart och kan ladda mer än vad första världen behöver.
- Loading bar bör spegla faktisk bytes-/filprogress.
- Långa världsspår fördröjer första interaktionen på svagare nät.

### Åtgärder

- Ladda titelspår + värld 1 först.
- Prefetcha nästa värld efter att aktuell värld startat.
- Komprimera/normalisera musik till konsekvent bitrate och loudness.
- Cachea hämtade spår via service worker.
- Lägg musikducking vid boss warning, player hit och resultatskärm.
- Ge varje boss ett kort eget intro-/fassting även om världens grundmusik återanvänds.
- Spara music/sfx/mute separat och synka inställningen.

---

## Prestanda och PWA

### Nuvarande styrkor

- Canvas körs i intern 360 × 640-upplösning.
- Entiteter och rendering är relativt begränsade.
- Service worker använder network-first för dokument och cache-first för övriga resurser.
- Spelet fungerar utan bundler.

### Risker

- Hela spelkoden ligger till stor del i en 6 288-raders fil.
- Looplogiken är låst mot ungefär 60 fps men använder frame-baserade timers och rörelser.
- Långsam enhet eller bakgrundstabb kan därför påverka spelhastighet och tidsbonus.
- Ingen synlig `visibilitychange`-hantering pausar automatiskt.
- Cacheversionen `axeluga-v3` är manuell och saknar releasegate.
- Dynamiskt cachade assets kan ligga kvar gamla om cacheversionen inte bumpas.

### Åtgärder

- Pausa automatiskt vid `visibilitychange`, blur och tappad gamepad.
- Använd delta time eller en fixed timestep med begränsad catch-up.
- Beräkna rankad tid från monotonic elapsed time, inte endast antal renderade frames.
- Lägg prestandaprofiler för låg/normal/hög partikelmängd.
- Begränsa shake, partiklar och stora transparenser på svaga enheter.
- Inför test som kräver cachebump när precachad runtime ändras.
- Lägg update-notis mellan runs, aldrig mitt under en run.
- Verifiera offline cold start efter att alla nödvändiga assets cachats.

---

## Tillgänglighet

Canvasmenyn är visuellt tydlig men ger mycket lite semantik till skärmläsare. Score- och achievement-overlays är HTML och är därför en bättre grund.

### Åtgärder

- Spegla huvudmeny och options i tillgängliga HTML-kontroller eller skapa ett semantiskt parallellager.
- Ange canvas-label med spelstatus och kontrollinstruktion.
- Gör alla volym-, difficulty- och toggleval möjliga med tangentbord och skärmläsare.
- Lägg fokusfälla och fokusåterställning i overlays.
- Lägg `prefers-reduced-motion` plus manuell inställning.
- Ersätt färg som enda signal med form, ikon och text.
- Ge scanlines en avstängning.
- Testa zoom, hög kontrast och tangentbordsflöde.
- Undvik snabb helskärmsflash och erbjud reducerad flashintensitet.

---

## Analytics

Trackern startar när state går till `playing` och slutar endast när state går till `gameover`. Den avslutas inte uttryckligen vid:

- `victory`;
- quit till menu från pause;
- navigation bort från sidan;
- avbruten run;
- övergång till vissa mellanlägen.

Eftersom `playing` återkommer efter `stageclear` kan sessionen dessutom startas om när nästa värld börjar.

### Föreslaget eventkontrakt

```text
axeluga_run_start
  runType, difficulty, startWorld, scoreVersion

axeluga_world_start
  world, wave

axeluga_world_complete
  world, score, elapsed, damage, maxCombo

axeluga_run_end
  outcome, endWorld, score, elapsed, damage

axeluga_tutorial_step
  step, completed
```

En run ska ha ett stabilt `runId` och exakt ett start- och slut-event.

Mät särskilt:

- meny → start;
- start → första skott;
- start → våg 1 clear;
- dödsplats per våg;
- world completion rate;
- touch autofire/manual;
- continue rate;
- retry rate;
- boss abandon rate.

---

## Kodarkitektur

### Nuvarande läge

| Fil | Ungefärlig storlek |
|---|---:|
| `game.js` | 6 288 rader |
| `audio.js` | 585 rader |
| `input.js` | 482 rader |
| `config.js` | 361 rader |
| `index.html` | 687 rader |

`game.js` innehåller state machine, gameplay, rendering, menyer, score, achievements, leaderboard och flera visuella system. Det ökar regressionsrisken.

### Rekommenderad uppdelning

Gör inte en stor arkitekturomskrivning före P0/P1. Efter att produktreglerna är stabila:

```text
js/
  main.js
  game.js                 orkestrering och huvudloop
  state-machine.js
  run-state.js            runType, score, progression
  save.js
  sdk.js
  input.js
  audio.js
  config.js
  entities/
    player.js
    enemy.js
    boss.js
    projectile.js
    powerup.js
  systems/
    waves.js
    collisions.js
    scoring.js
    achievements.js
    particles.js
  screens/
    menu.js
    world-select.js
    options.js
    results.js
    achievements.js
```

Behåll ES6 och noll externa dependencies.

### Testkontrakt

Lägg små Node-baserade verifieringsscript utan nya runtime-dependencies:

- `verify_run_modes.mjs`
- `verify_achievement_rules.mjs`
- `verify_save_contract.mjs`
- `verify_score_modes.mjs`
- `verify_world_progression.mjs`
- `verify_pwa_release.mjs`

Testerna ska minst verifiera:

- practice kan aldrig submit score;
- full-clear trophies kräver värld 1–5;
- hard och medium hamnar i olika modes;
- äldre saves migreras deterministiskt;
- alla världar har tio vågor och giltiga bossdefinitioner;
- inga publika debugflaggor finns i production;
- ändrad runtime kräver cachebump.

---

## Rekommenderad releaseplan

### Release 2.0.0 — Integrity & First Flight

**Mål:** spelet ska vara rättvist, begripligt och bra under första sessionen.

- Ta bort publik debugstart/max power.
- Inför Campaign och Practice.
- Lås världar i Campaign.
- Separera leaderboard per svårighetsgrad.
- Laga full-clear-achievements.
- Inför save schema v2.
- Autofire som touchstandard.
- Ny första-minuten-onboarding.
- Ny Run Summary.
- Laga analytics run-livscykel.
- Rensa branding.

**Releasegate:**

- Ny spelare kan starta på högst två tryck.
- Mobilspelaren skjuter utan tvåfingergrepp.
- Ingen practice/debugrun kan rankas.
- Save fungerar guest → login och enhet A → B.
- Samtliga P0-tester passerar.

### Release 2.1.0 — Combat Readability

**Mål:** striden ska kännas modern och rättvis.

- Projektilkontrakt och hitboxpunkt.
- Förbättrad pickup-/damagefeedback.
- Kuraterade värld 1-vågor.
- Boss-telegraphs och resultat.
- Mobil-HUD.
- Reduced motion/flash.
- Auto-pause vid visibility change.

**Releasegate:**

- Alla fiendeskott är läsbara i samtliga fem världar.
- 360–430 px mobiltest passerar.
- Bossattacker har telegraph och går att förklara.
- Inga oavsiktliga dödsfall från osynliga/otydliga projektiler i playtest.

### Release 2.2.0 — Worlds Recharged

**Mål:** varje värld ska kännas mekaniskt unik.

- Världsspecifika regler.
- Kuraterad pacing för alla 50 vågor.
- Medaljer och världsmastery.
- Continue/checkpoints.
- Fördjupade bossfaser.
- Bättre transitions och victory.

**Releasegate:**

- Varje värld kan beskrivas med ett unikt mekaniskt löfte.
- Svårighetskurvan är playtestad på easy/medium/hard.
- Continue kan inte utnyttjas i rankad full run.

### Release 2.3.0 — Live Ops & Hardening

**Mål:** återkomstloop och långsiktigt underhåll.

- Daily Sector.
- Weekly Boss.
- Seedad RNG och run metadata.
- Kodmodularisering.
- Ljudstreaming/prefetch.
- PWA-releasegate.
- Portalbuild och mediekit.

**Releasegate:**

- Daily är identisk globalt per dag.
- Endast första rankade attempt räknas om den regeln väljs.
- Offline/update-flöde verifieras.
- Portalbuild saknar GameVolt-beroende och fungerar standalone.

---

## Föreslagen arbetsordning i tickets

### Sprint 1 — Tävlingsintegritet

1. Definiera `runType` och `ranked`.
2. Ta bort debugstart ur production.
3. Blockera submit/achievements i practice/debug.
4. Separera difficulty modes.
5. Laga full-clear-regler.
6. Lägg verifieringsscript.

### Sprint 2 — Progression och save

1. Save schema v2.
2. World unlocks.
3. Guest/localStorage.
4. Cloud read/merge/write.
5. Continue checkpoint.
6. Konflikt- och migrationstest.

### Sprint 3 — Första minuten

1. Ny menyhierarki.
2. Touch autofire default.
3. Input-aware tutorial.
4. Regisserade våg 1–3.
5. Run Summary.
6. Mobiltest.

### Sprint 4 — Combat pass

1. Projektilkontrakt.
2. Player hitbox.
3. Pickup-feedback.
4. Damage/flash/reduced motion.
5. HUD.
6. Prestandaprofil.

### Sprint 5 — Världar och bossar

1. Mekaniskt tema per värld.
2. Kurera vågor.
3. Bossfaser/telegraphs.
4. Medaljer.
5. Victory.
6. Full campaign playtest.

### Sprint 6 — Retention och distribution

1. Daily Sector.
2. Weekly Boss.
3. Delningskort.
4. Moduluppdelning.
5. PWA hardening.
6. Standalone portalbuild och submission assets.

---

## Mätbara mål

Sätt baseline innan 2.0 och jämför efter release.

| Mått | Föreslaget mål |
|---|---:|
| Meny → gameplay | minst 80 % |
| Gameplay inom 20 sekunder | minst 75 % |
| Våg 1 completion | minst 85 % |
| Våg 5/miniboss reach | minst 45 % |
| Värld 1 completion | minst 25 % |
| Retry efter Game Over | minst 30 % |
| Återkomst inom 7 dagar | förbättring mot baseline |
| Mobil andel som använder autofire | följ, men optimera inte blint |
| Ogiltiga/rankade debugruns | 0 |
| Full-clear trophies utan värld 1–5 | 0 |

Målen är startvärden och bör justeras efter riktig trafik.

---

## Vad som inte bör göras först

- Skapa fler än 50 vågor innan befintliga har kuraterats.
- Lägga till fler power-up-typer innan nuvarande är tydliga.
- Bygga om hela renderaren eller byta motor.
- Göra stor kodmodularisering före produktreglerna är låsta.
- Lansera Daily/Weekly på en leaderboard med oklar integritet.
- Polera marknadsbilder innan första minuten representerar slutkvaliteten.

---

## Slutbedömning

Axeluga är inte ett svagt spelkoncept. Det är ett innehållsrikt spel med en otydlig produktmodell och några kvarlämnade utvecklingsgenvägar som skadar förtroendet för progression och tävling.

Den största vinsten kommer inte från fler fiender, fler världar eller ny motor. Den kommer från att:

1. göra varje run rättvis och begriplig;
2. låta mobilspelaren känna kontroll direkt;
3. göra världar och bossar till tydliga höjdpunkter;
4. visa spelarens skicklighet och progression;
5. härda save, score och kod så spelet kan utvecklas säkert.

Om P0 och P1 genomförs väl kan Axeluga gå från ett ambitiöst äldre portalspel till ett trovärdigt GameVolt-flaggskepp. P2 och P3 kan därefter ge spelet den retention och distributionskvalitet som krävs för att bära en egen 2.0-lansering.
