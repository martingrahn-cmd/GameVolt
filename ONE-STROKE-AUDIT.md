# One Stroke — spelrevision och förbättringsrapport

**Datum:** 2026-07-22  
**Omfattning:** kampanj (200 nivåer), tutorial, Daily Challenge, challenges, mobil/touch, progression, GameVolt-SDK, PWA/offline, achievements, delning och marknadsassets.

**Status 2026-07-23:** P0–P22 är genomförda. P10:s produktions-smoketest hittade en stale `renderLevelList()`-referens och att nya PWA-cacheversioner kunde fyllas med gammal HTTP-cache; båda är åtgärdade och omtestade i produktion. P11 kuraterade kampanjordningen utan att flytta de första 20 nivåerna eller ändra nivå-ID:n. P12 gav kampanjmenyn en tydlig Continue-yta med nästa nivå och kapitelprogress. P13 slutförde keyboard-grid och modalernas fokusflöde. P14 härdade responsive-layouten från 360 px till desktop. P15 optimerade hela svårighetsband i stället för en par-grupp i taget. P16 låste kampanjens release-invariants i ett separat verifieringsverktyg. P17 kopplade verifieringen till GitHub Actions. P18 lade till en motsvarande PWA/offline-gate. P19 låste kontraktet mellan HTML, JavaScript och ARIA. P20 kräver nu cachebump när en precachad runtimefil ändras. P21 frikopplade seedade tävlingar från kampanjens presentationsordning. P22 låste cloud-save-merge som ett testat schema.

## Sammanfattning

One Stroke är innehållsmässigt ett av GameVolts mest kompletta pusselspel. Kärnloopen är ren och lättförståelig, det finns 200 kampanjnivåer, åtta handgjorda tutorial/bridge-nivåer, fyra svårighetsband, Daily Challenge, lokala high-score-data, delbara resultat, challenges och 31 trophies. Projektets egna verifieringsverktyg godkänner samtliga handgjorda bridge-nivåer, och analysen hittar inga trasiga övergångar mellan svårighetsbanden eller felaktiga par-värden.

Spelet är nu härdat som cross-device-produkt. Cloud save läser tillbaka och sammanfogar full kampanj- och Daily-progress med ett versionssatt schema, och mergekontraktet täcks av automatisk verifiering. Cloud challenges skapas endast efter spelarens uttryckliga val, medan Daily och Weekly använder sina separata eventflöden.

Den genomförda **One Stroke 1.1 — Clean Line Update** omfattar tre delar: (1) stabil data/synkning och challenge-livscykel, (2) förbättrad onboarding, mobilpresentation och belöningskänsla, (3) fördjupad Daily- och kampanj-mastering. De 200 befintliga nivåerna har prioriterats framför att lägga till fler standardnivåer.

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
| P3 | Veckoliga curated challenges — **P3A åtgärdad** | Feature | Stor | Medel–hög |
| P3 | Ghost/PB-jämförelse — **P3B åtgärdad** | Feature | Medel–stor | Medel–hög |
| P3 | Bonusbanor med fast slutnod och begränsad undo — **P3C åtgärdad** | Feature | Stor | Hög |
| P4 | En rankad Daily-run, därefter tydligt practice-läge — **P4A åtgärdad** | Feature/integritet | Medel | Hög |
| P4 | Exponera friend challenge och join-by-code — **P4B åtgärdad** | Feature | Medel | Hög |
| P4 | Kampanjmedaljer och mastery-översikt — **P4C åtgärdad** | Feature/polish | Medel | Hög |
| P5 | Sjudagars Daily-översikt — **P5A åtgärdad** | Feature/retention | Liten–medel | Medel–hög |
| P5 | Mode-aware historik och filter — **P5B åtgärdad** | Feature/polish | Medel | Medel |
| P5 | Releasecopy och FAQ för nya spellägen — **P5C åtgärdad** | Polish/SEO | Liten | Medel |
| P6 | UTC-resetnedräkning för Daily och Weekly — **P6A åtgärdad** | Feature/live ops | Liten | Medel–hög |
| P6 | Mode-aware delningskort — **P6B åtgärdad** | Feature/growth | Medel | Medel–hög |
| P6 | PWA update-notis med kontrollerad reload — **P6C åtgärdad** | Polish/reliability | Liten | Medel |
| P7 | Personlig Daily/Weekly-rank i lobby, resultat och delningskort — **P7 åtgärdad** | Feature/retention | Liten–medel | Medel–hög |
| P8 | En rankad Weekly-run per UTC-vecka, därefter Practice — **P8 åtgärdad** | Feature/integritet | Liten–medel | Hög |
| P9 | Serverstyrda event-ID:n, engångslås och validerad Daily/Weekly-submit — **P9 åtgärdad** | Bugg/backend/integritet | Medel | Mycket hög |
| P10 | Inloggat produktions-smoketest — **klart; cloud sync och cache-refresh verifierade** | QA/bugg | Medel | Mycket hög |
| P11 | Kuraterad, save-säker kampanjordning — **klart; 27 ordningsflaggor reducerade till 4** | Polish/progression | Liten–medel | Hög |
| P12 | Tydlig Continue och förenklad kampanjhierarki — **klart på desktop och mobil** | Polish/UX | Liten | Hög |
| P13 | Accessibility-runda för keyboard-grid och modalfokus — **klart** | Polish/a11y | Liten–medel | Medel |
| P14 | Responsive hardening vid 360/390/430/768/desktop — **klart** | Polish/mobile | Liten | Hög |
| P15 | Helbandsoptimerad kampanjordning — **klart; Hard-hoppet eliminerat** | Polish/progression | Liten | Medel–hög |
| P16 | Automatisk release-verifiering av kampanjdata och kurva — **klart** | QA/tooling | Liten | Hög |
| P17 | GitHub Actions-gate för One Stroke-kampanjen — **klart** | CI/reliability | Liten | Hög |
| P18 | PWA/offline-releaseverifiering och komplett manifest-precache — **klart** | PWA/CI | Liten | Hög |
| P19 | Automatisk DOM-/ARIA-kontraktsverifiering — **klart** | QA/a11y/CI | Liten | Hög |
| P20 | Obligatorisk service-worker-cachebump vid runtimeändring — **klart** | PWA/CI | Liten | Mycket hög |
| P21 | Deterministiskt Daily/Weekly-urval oberoende av kampanjordning — **klart** | Bugg/competition/CI | Liten–medel | Mycket hög |
| P22 | Automatiskt cloud-save- och konfliktmergekontrakt — **klart** | Bugg/data/CI | Liten–medel | Mycket hög |

## Buggar

### P0 — Cross-device progression fungerar inte som sidan lovar — ÅTGÄRDAD

**Bekräftat i kodgranskning.** `syncCloudSave()` skickar endast `unlockedLevel`, antal lösta nivåer och antal achievements. Själva `solvedLevels`-objektet med nivå-ID, bästa tid, undo/reset/hints och played count skickas inte. Spelet anropar dessutom aldrig `GameVolt.save.get()`, så en ny enhet läser inte tillbaka cloud save till lokal state.

Migrationen gör problemet mer riskabelt: första migrationen kan returnera hela det gamla lokala progressobjektet, men senare `save.set()` skriver ett annat, mycket tunnare schema. Det finns ingen versionsmarkering eller fältvis merge.

**Fix:** inför exempelvis `{ version: 1, campaign: { unlockedLevel, solvedLevels }, achievements, daily, updatedAt }`. Läs molndata efter `GameVolt.onReady()`, merge:a per nivå (bästa tid/lägsta actions men högsta played count enligt tydlig regel), uppdatera lokal state och rendera om. Testa guest → login, enhet A → B och konflikt mellan två enheter.

P22 lade till `verify_cloud_save_contract.mjs` för schema v2, äldre saveformat, normalisering, kampanjunion, per-fält-best, played-count, Daily-resultat och streaks. En exakt score/time-tie i Daily är nu deterministisk även mellan två enheter: högre completed count och därefter total count avgör, vilket gör mergen kommutativ.

### P0 — Cloud challenges skapas utan spelarens avsikt — ÅTGÄRDAD

**Bekräftat i kodgranskning.** Konstruktorn kör `createChallenge(todaySeed())`. `createChallenge()` anropar `GameVolt.challenge.create()` när användaren är inloggad. Det innebär att en cloud challenge kan skapas vid varje sidladdning trots att spelaren bara vill spela kampanjen. `startDailyChallenge()` använder samma funktion, så även Daily-start och replay kan skapa separata challenge-poster som inte behövs för Daily leaderboard.

**Fix:** gör lokal challenge-generering ren och utan backendeffekt. Skapa en cloud challenge först när spelaren uttryckligen väljer `Challenge a friend`/`Share challenge`. Daily ska använda Daily-API:t och inte skapa en 1v1-challenge.

### P1 — Daily använder UTC-seed men visar lokal kalenderdag — ÅTGÄRDAD

`todaySeed()` bygger datum med `toISOString()` (UTC), medan rubriken formaterar `new Date()` i spelarens lokala tidszon. Runt lokal midnatt kan UI därför säga exempelvis 23 juli medan seed, save-key och leaderboard fortfarande gäller 22 juli. Streakberäkningen blandar också lokal `setDate()` med UTC-serialisering.

**Fix:** välj en enda kontrakterad tidszon. För en global challenge är UTC enklast: skapa ett gemensamt `dailyDayId`, formatera även labeln från detta ID och använd samma ID för seed, storage, streak, share och leaderboard.

P21 hittade och åtgärdade en separat determinismrisk: `createMixedChallenge()` seedade sin shuffle från kampanjarrayens befintliga ordning. En kuraterad kampanjomordning kunde därför byta dagens nivåer mitt under ett UTC-event. Svårighetspoolerna sorteras nu på stabilt nivå-ID före shuffle, och fasta Daily/Weekly-snapshots samt UTC-/ISO-gränser verifieras i CI.

### P1 — Marketing capture-scriptet tillhör Manga Match — ÅTGÄRDAD

**Bekräftat i fil och asset.** `one-stroke/tools/capture_marketing.mjs` letar efter Manga Match-element som `#score`, `#combo`, `.hud-panel` och skriver `MANGA MATCH!` i OG-layouten. Den befintliga `screenshot-mobile.png` visar Manga Match, inte One Stroke. `og-image.png` är däremot en giltig One Stroke-bild.

**Fix:** skriv om capture-scriptet mot One Strokes DOM och skapa desktop-, mobil- och actionbilder på nytt. Lägg en enkel kontroll som kräver att sidtiteln innehåller `One Stroke` före capture.

### P2 — Anti-cheatresultatet påverkar inte leaderboard-submit — ÅTGÄRDAD

Challenge-runnen kör `checkRunResult()` och sparar `plausible`, men `submitToLeaderboard()` skickar ändå alltid poängen för inloggade användare. En manipulerad klient kan dessutom anropa leaderboard-API:t direkt.

**Fix:** submit endast när lokal plausibility är godkänd och visa en tydlig status om en run inte kan rankas. För en seriös topplista behövs på sikt servervalidering eller åtminstone server-side bounds per fem splits.

### P2 — Service worker-versionen är statisk — ÅTGÄRDAD

Cache heter fortfarande `one-stroke-v1`. Uppdateringar hämtas i bakgrunden men den aktuella navigationen får ofta den gamla cachade filen, vilket kan göra buggrapporter och releaseverifiering svårtolkade.

**Fix:** bumpa cacheversion per release eller inför ett litet versionsmanifest och en kontrollerad update-notis/reload.

P18 kompletterade fixen med `verify_pwa_release.mjs`, som kräver en giltig cacheversion, existerande och unika precache-filer, hela den lokala ES-modulgrafen samt manifestets start- och ikonresurser. De tre PWA-ikoner som tidigare saknades i precache lades till i v18.

P20 lade till `verify_cache_bump.mjs`. På PR och push jämför den ändrade filer mot bascommitens och den aktuella service workerns precache-listor. Om en runtimefil eller `sw.js` ändras utan att `one-stroke-vN` ökar stoppas workflowen.

### P3 — Döda DOM-referenser och kvarlämnad legacykod — ÅTGÄRDAD

Appen söker efter `challengeGenerateBtn`, `exportMatchBtn`, `importMatchBtn` och `dailyReplayBtn`, men dessa element finns inte i HTML. Optional chaining gör att sidan inte kraschar, men det skapar osäkerhet om vilka challengefunktioner som faktiskt ska vara exponerade.

**Fix:** ta bort död kod eller återinför funktionerna som tydligt designade UI-flöden. Undvik osynliga kompatibilitetsfält som permanent arkitektur.

## Polish

### Första minuten och tutorial

Kärnregeln är enkel, men instruktionen är främst text: `Drag from the start node to a neighbor`. Spelet skulle vinna mycket på att första nivån demonstrerar handlingen visuellt med pulserande startnod, animerad ghost-line och en enda tydlig CTA. De första 8 nivåerna är handgjorda, vilket är bra, men nivå 9 hoppar in i den genererade kampanjen utan ett tydligt examensögonblick.

**Förslag:** gör nivå 1–3 till mikrolektioner (dra, backtrack, dead-end), nivå 4–8 till guided practice och ge en kort `Tutorial complete`-belöning före den fulla kampanjen.

### Svårighetskurva

P11 flyttade analysen till den faktiska runtime-kampanjen och kuraterade nivå 21–200 efter par och strukturellt flöde. Nivå-ID:n och de första 20 kampanjplatserna är oförändrade för save- och onboardingkompatibilitet. Resultatet är 49 granskningsflaggor: 45 statistiska metric-outliers hos enskilda pussel och endast 4 hopp mellan intilliggande nivåer, ned från 27. Inga bandövergångar eller par-outliers återstår; Medium, Hard och Very Hard har helt jämn uppmätt pacing.

De kvarvarande metric-outliers är inte automatiskt fel utan en fokuserad playtestlista. Efter P11 återstod fyra ordningshopp: Stigfinnaren → Easy 09, Easy 13 → Easy 14, Medium 73 → Medium 74 och Hard 168 → Hard 169. De två tidiga hoppen behölls för att inte flytta den etablerade öppningen.

P15 ersatte den lokala greedy-riktningen med en deterministisk dynamisk optimering över varje helt svårighetsband. Algoritmen minimerar först stora branching-hopp och därefter total strukturell distans, samtidigt som par aldrig minskar. Hard 168 → 169 försvann; resultatet är nu 48 flaggor: 45 metric-outliers och 3 intilliggande hopp. Medium 73 → 74 är ett inneboende gap i par-23-materialet, medan de två Easy-hoppen ligger i den låsta öppningen.

### Spelkänsla

Den visuella identiteten är ren och konsekvent, men kärnhandlingen kan få mer kropp utan att bli stökig:

- diskret ljud/haptik per nod, mörkare ton vid backtrack och tydlig dead-end-signal;
- en liten elasticitet i linjen och glow-puls när ett steg registreras;
- completion-wave längs hela den färdiga vägen;
- `New best −4.2s`, färre undos och kampanjmilestone direkt i vinstmodalen;
- reduced motion ska fortsatt respekteras.

### Meny och informationshierarki

P12 gör kampanjens primära mål till första ytan i menyn: `Continue campaign`, nästa upplåsta nivå, kapitelrubrik, lösta nivåer i kapitlet och en tydlig spelknapp. Samma kort anpassas till en kolumn på mobil, där Continue stänger menyn och återgår direkt till brädet. Regler och full level select ligger kvar som sekundära kontroller.

P14 flyttade tablet portrait till samma direkta spelflöde som mobil upp till 820 px. Vid 768 px ligger Undo, Reset, Hint och Next nu direkt under brädet i stället för långt ned efter desktop-sidebarens innehåll. Menyknappar, feedbackinställningar, Continue och Full Level Select har minst 44 px touchhöjd i det kompakta läget.

### Accessibility

P13 kompletterade de befintliga tabrollerna och modalernas fokusfälla med ett komplett roving-tabindex-grid. Endast aktuell path-tail ligger i tabbordningen; varje nod rapporterar rad, kolumn, start/mål, visited-steg, aktuell tail och möjliga nästa drag. Fokus följer piltangentsdrag och gridet exponerar rad-/kolumnantal samt skärmläsarinstruktion. Level Select återställer fokus efter Escape, och Escape stänger nu även challenge-importen.

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
- `node tools/analyze_progression.mjs`: 200 runtime-nivåer laddade; inga bandövergångsfel eller par-outliers; 48 review-flaggor efter P15, varav 45 metric-outliers och 3 intilliggande hopp.
- `node --check` på app-, core-, game- och relevanta datafiler: inga syntaxfel.
- Statisk kontroll av SDK-, storage-, Daily-, challenge-, leaderboard-, PWA- och DOM-flöden.
- Visuell kontroll av befintliga marknadsassets; mobilbilden är felaktigt Manga Match-material.
- Browser-QA av P3A: veckovyn visar rätt UTC-intervall, veckoseed `weekly-2026-W30`, 10 nivåer och veckospecifika labels; ISO-årsgränser verifierades separat.
- Browser-QA av P3C: fem bonusnivåer, synlig målnod och regelbadge verifierades; tredje undo blockerades korrekt efter en budget på två.
- Browser-QA av P4: en komplett femnivåers Daily-run växlade replay till `Daily Practice` med dold delning; friend create/join och 200 mastery-badges verifierades utan konsolfel.
- Browser-QA av P5: exakt sju UTC-dagar renderades med dagens markering, modefiltret gav korrekt tomläge och publik copy/FAQ exponerade Weekly, mastery och friend challenge utan konsolfel.
- Browser-QA av P6: Daily/Weekly-resetlabels, mode-anpassade shareknappar och dold PWA-notis i normalt läge verifierades; update-notisen visas först vid verkligt controllerbyte.
- QA av P7: Daily- och Weekly-rankstatus renderades i browserns gästläge; kodgranskning verifierade separat personlig rad utanför topp 20 och valfri rank på delningskortet.
- QA av P8: fresh-week-badgen och den rankade 10-nivåersstarten verifierades i browser; syntax, submit-gates och återläsning av befintlig cloud-rank verifierades statiskt.
- QA av P9: server-RPC-kontrakt, first-write-wins-fråga och totalsvalidering granskades statiskt; browser-QA verifierade att Daily/Weekly och rankad Daily-start fungerar när servermigrationen ännu saknas.
- Produktions-QA av P10: Supabase-RPC gav rätt UTC-event, inloggad cloud sync körde utan nya fel, en rankad Daily registrerades som #1 och låstes till Practice vid replay, veckostrippen uppdaterades och en cloud friend-länk skapades utan konsolfel.
- QA av P11: exakt 200 unika nivå-ID:n och giltiga lösningar verifierades; ID-mängden och de första 20 platserna matchar tidigare runtime-ordning, alla kampanjindex är sekventiella och full level select renderar 200 nivåer med korrekta band utan browserfel.
- QA av P12: Continue-kortet renderades med nivå, kapitel och `0 / 20`-progress på desktop; vid 390×844 öppnades det via Menu och spelknappen stängde panelen, återställde brädet och laddade rätt nivå utan browserfel.
- QA av P13: gridet exponerade 3×5-dimensioner och exakt en tabbbar tail; `ArrowRight` flyttade både path, fokus och dynamisk nodstatus från kolumn 1 till 2. Level Select fokuserade sökfältet, stängdes med Escape och återställde fokus till öppningsknappen utan browserfel.
- QA av P14: 360, 390, 430, 768 och 1366 px testades utan horisontell overflow. Mobil/tablet hade synlig bottom bar, direkta spelkontroller och exakt en tabbbar grid-tail; desktop växlade korrekt tillbaka till tvåpanelsläget. Vid 360 px var samtliga primära menyytor minst 44 px och Level Select rymdes inom viewporten utan browserfel.
- QA av P15: alla 200 unika nivå-ID:n, giltiga lösningar, sekventiella kampanjindex och den tidigare öppningen 1–20 verifierades oförändrade; par är fortsatt icke-minskande inom varje band. Full Level Select renderade 200 nivåer utan browserfel.
- QA av P16: `node tools/verify_campaign_release.mjs` verifierade 200 nivåer, unika ID:n, fulla Hamiltonian-lösningar, svårighetsfördelning, sekventiella index, låst öppning 1–20, icke-minskande par och högst tre branching-hopp. `--self-test` fångade korrekt en injicerad duplicerad nivå.
- QA av P17: `.github/workflows/one-stroke-campaign.yml` YAML-parsades och hela workflow-kommandokedjan passerade lokalt. Workflowen kör syntax, release-invariants, bridge-verifiering och progressionsanalys på relevanta pull requests, på push till `main` och manuellt.
- QA av P18: `verify_pwa_release.mjs` godkände cache v18 med 25 assets, 16 offline-moduler och manifestets fyra resurser; `--self-test` fångade en simulerad missad `app.js`. Browser-QA visade update-notisen för den nya service workern, Reload aktiverade versionen och spelet laddade om utan konsolfel.
- QA av P19: `verify_dom_contract.mjs` godkände 155 unika HTML-ID:n, 151 JavaScript-ID-referenser och samtliga ARIA-/label-IDREFs. `--self-test` fångade en simulerad stale `levelName`-referens, och kontrollen lades till i release-workflowen.
- QA av P20: `verify_cache_bump.mjs --self-test` fångade en simulerad `app.js`-ändring utan cachebump. Den riktiga arbetskopiediffen mot `HEAD` godkändes med fem ändrade runtimefiler och cacheökning v12 → v18; workflowens YAML med full git-historik parsades korrekt.
- QA av P21: `verify_competition_determinism.mjs` godkände fyra UTC-dagsgränser, fyra ISO-veckogränser, två fasta seed-snapshots och fem bonusnivåers regelkontrakt. Omvänd kampanjarray gav identiskt Daily/Weekly-urval och självtestet fångade ett ändrat snapshot. Browser-QA startade Daily med exakt `Easy 15, Medium 81, Hard 129, Medium 107, Very Hard 176` utan konsolfel.
- QA av P22: `verify_cloud_save_contract.mjs` godkände schema v2, tre sammanslagna kampanjnivåer, tre Daily-resultat och två legacyformat. Kampanj- och Daily-merge verifierades kommutativa; självtestet fångade ett injicerat kontraktsfel. PWA- och cachebump-gaterna godkände runtimeändringen med v20.

SQL-filen `sql/one-stroke-competition-integrity.sql` installerades och smoke-testades mot produktion 2026-07-23.
