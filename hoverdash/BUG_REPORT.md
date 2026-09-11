# HoverDash – kritisk buggranskning inför release

Datum: 2026-09-08  
Granskad version: lokal arbetskopia efter korrigeringen av väggtunneln  
Omfattning: spel-loop, hinder och kollisioner, sågblad, vågor, poäng/synk, handkontroll, paus/återgång, inställningar och service worker.

## Samlad bedömning

HoverDash har en tydlig och spelbar grund. Den tänkta såglogiken fungerar i ett kontrollerat test: den röda golvsågen kräver hopp och den gula taksågen kräver duckning. Paus vid dold flik fungerar, Big Picture-returen finns och väggtunneln som tidigare följdes direkt av en blockerande stolpe har fått korrekt avstånd.

Samtliga P1-, P2- och P3-punkter i rapporten är nu lösta med regressionstest.

Prioritet används så här:

- **P1:** blockerar release eller kan skada data/funktion utanför själva rundan.
- **P2:** tydligt användarfel som bör rättas före eller strax efter release.
- **P3:** mindre fel eller teknisk skuld.

| ID | Prioritet | Status | Område | Sammanfattning |
|---|---:|---|---|---|
| HD-001 | P1 | Löst och testat | Offline/cache | HoverDash raderade andra GameVolt-spels cacher |
| HD-002 | P1 | Löst och testat | Konto/synk | Molnmerge kunde kasta bort poäng, datum och upplåsta troféer |
| HD-003 | P2 | Löst och testat | Sågblad/kollision | Synlig geometri och kollisionsregler kunde säga olika saker |
| HD-004 | P2 | Löst och testat | Troféer/daily | “Clear Wave N” låstes upp när vågen började |
| HD-005 | P2 | Löst och testat | Väggtunnel | Filbyte tilläts medan väggen fortfarande kolliderade |
| HD-006 | P2 | Löst och testat | Leaderboard | Migrerad lokal poäng skickades till fel spelläge |
| HD-007 | P2 | Löst och testat | Lagring | Nekad `localStorage` kunde stoppa spelet vid start |
| HD-008 | P2 | Löst och testat | Handkontroll | Första Gamepad API-enheten valdes även om den var olämplig |
| HD-009 | P3 | Löst och testat | High score | En delad förstaplats rapporterades som nytt rekord |
| HD-010 | P3 | Löst och testat | Spin | Deklarerad invulnerability-tid användes inte |
| HD-011 | Löst | Verifierad | Väggtunnel | Nästa hinder kunde skapas inne i tunnelns utgång |

## HD-001 – service workern raderar andra GameVolt-cacher

**Plats:** `hoverdash/sw.js:24-26`

**Status:** löst 2026-09-09. Aktiveringen raderar nu endast äldre cacher med prefixet `hoverdash-`. Regressionstest verifierar att andra GameVolt-cacher bevaras.

Vid aktivering hämtar service workern alla cache-namn på samma origin och raderar allt utom `hoverdash-v9`. Cache Storage delas av hela `gamevolt.io`, så ett besök i HoverDash kan radera startsidans och andra spels offline-cache.

**Förväntat:** endast äldre HoverDash-cacher, exempelvis namn med prefixet `hoverdash-`, tas bort.  
**Faktiskt:** varje cache med ett annat namn tas bort.  
**Föreslagen lösning:** filtrera på HoverDash-prefix före radering och lägg ett test med minst en främmande cache som måste finnas kvar efter `activate`.

## HD-002 – synkningen kan förlora användardata

**Plats:** `hoverdash/index.html:602-626`

**Status:** löst 2026-09-09. Poäng förenas, dedupliceras, sorteras och kapas till tio. Senaste giltiga daily-datum och högsta upplåsningstid per trofé bevaras. Regressionstest täcker lokal data, molndata, dubbletter, ogiltigt datum och maxlängd.

Tre separata mergeproblem finns:

1. Finns minst en lokal poäng ersätter hela den lokala listan molnets lista. Bättre poäng från en annan enhet kan försvinna ur den sammanslagna sparfilen.
2. Ett icke-tomt lokalt `lastDailyDate` vinner även om molnets datum är nyare. En redan avklarad daily kan då visas som oavklarad.
3. Lokala `unlocked` innehåller normalt varje trofé med värdet `0`. `Object.assign` låter dessa nollor skriva över riktiga upplåsningstider från molnet.

**Förväntat:** poänglistor förenas, dedupliceras, sorteras och kapas; senaste ISO-datum vinner; högsta giltiga upplåsningstid per trofé bevaras.  
**Risk:** felaktig status efter inloggning eller byte av enhet, särskilt viktigt när Big Picture-inloggning och QR-inloggning införs.

## HD-003 – sågbladens visuella och logiska träffytor skiljer sig

**Plats:** `hoverdash/index.html:2395-2419`, `2476-2557`, `3190-3221`, `3268-3297`, `5033-5037`, `5137`

**Status:** löst 2026-09-09. Golvsågens hoppgräns räknas från den synliga tandradien. Taksågen läser skeppets interpolerade duckskala. Träff och near miss använder samma regel vid ett svept kontaktplan, och den fördröjda träffen efter passage är borttagen.

Den övergripande designen är korrekt och lätt att läsa:

- röd golvsåg + uppåtpilar = hoppa,
- gul taksåg + nedåtpilar = ducka.

Kontrollerade webbläsartester gav rätt grundutfall:

| Hinder | Ingen åtgärd | Rätt åtgärd |
|---|---|---|
| Röd golvsåg | Game over | Hopp överlevde och gav “CLOSE” |
| Gul taksåg | Game over | Duckning överlevde och gav “CLOSE” |

Precisionen är däremot inkonsekvent:

- Golvsågen ritas med centrum `0.90` och tandspetsar upp till cirka `1.89`, men klaras med den fristående regeln `jumpY >= 1.05`.
- Taksågens nedersta tandspets når cirka `1.70`, men kollisionen tittar på booleska `ducking` och `jumpY`, inte på skeppets synliga höjd.
- Duckning blir logiskt aktiv direkt, medan skeppets Y-skala animeras gradvis mot `45 %`. Spelaren kan därför vara säker innan modellen visuellt hunnit ducka.
- Första träffkontrollen godtar duckning när `jumpY <= 0.8`, men den efterföljande 0,18-sekunders räddningsfristen och “CLOSE”-bedömningen kräver `jumpY < 0.35`.
- Räddningsfristen avgör träffen efter att sågen passerat kontaktplanet. Vid grundhastighet hinner hindret flytta ungefär fyra världenheter under 0,18 sekunder, vilket kan få dödsögonblicket att kännas fördröjt.

**Föreslagen lösning:** skapa en gemensam kollisionsmodell som använder sågarnas verkliga ytterradie och skeppets interpolerade synliga bounds. Använd samma gräns för första kontakt, räddningsfrist och near miss. Om sen input ska tillåtas bör input buffras före kontakt eller kontaktögonblicket frysas visuellt; undvik att döda spelaren först när sågen redan ser passerad ut.

**Tester som behövs:** 30/60/120 Hz, tidig och sen input, kort tryck och hållen input, hopp→snabbfall→duckning, samt sågkontakt under shield, boost och spin. Dessa ska köras deterministiskt med samma kontaktplan.

## HD-004 – “Clear Wave N” betyder i praktiken “Reach Wave N”

**Plats:** `hoverdash/index.html:554-577`, `761`, `3538-3548`, `3575-3597`, `4827-4844`

**Status:** löst 2026-09-09. En separat `clearedWaveNum` uppdateras när actionfasen verkligen avslutas och återställs inför varje ny runda. Troféer och daily använder det värdet.

Troféer och daily använder `waveNum`. När vilan efter en avklarad våg är slut anropas `beginWave(waveNum + 1)` och därefter `checkInstantAch()`. Därmed låses “Clear Wave 3/5/10” upp när spelaren går in i vågen, innan den är klar. En spelare kan även dö direkt i våg 3 och ändå klara en daily som säger “Clear Wave 3”.

**Föreslagen lösning:** lägg till `highestClearedWave`/`clearedWaveNum`, uppdatera värdet i övergången från action till rest och använd det för troféer och daily.

## HD-005 – filbyte och väggkollision använder olika djup

**Plats:** `hoverdash/index.html:3268-3284`, `3702-3716`

**Status:** löst 2026-09-09. Renderat väggdjup, kollisionsdjup och filspärr härleds nu från gemensamma konstanter.

Väggen kolliderar inom intervallet `SHIP_Z + 20` till `SHIP_Z - 20`. Skyddet i `sLane()` slutar däremot blockera filbyte redan vid `SHIP_Z + 15`. Under de sista fem världenheterna går det därför att styra in i en lane som fortfarande ligger inne i väggens kollisionsvolym och dö nära utgången.

**Föreslagen lösning:** definiera väggens halvdjup en gång och använd samma konstant i båda systemen, med en liten säkerhetsmarginal för skeppets glidande sidoförflyttning.

## HD-006 – lokal leaderboard-migration använder fel mode

**Plats:** `hoverdash/index.html:623-626`, `709`, `3613-3616`

**Status:** löst 2026-09-09. Migreringen skickar nu poängen till `vx9`, samma mode som visning och nya resultat.

Vanlig leaderboardvisning och nya poäng använder mode `vx9`. Migreringen returnerar mode `default`. En gammal lokal topplacering kan därför migreras men inte synas i den leaderboard som HoverDash visar.

**Föreslagen lösning:** använd `vx9` även i `getScores` och testa en faktisk migrering från en gammal `hd_data`.

## HD-007 – vissa lagringsanrop saknar skydd

**Plats:** `hoverdash/index.html:899`, `4732`, `5294-5298`

**Status:** löst 2026-09-09. Alla HoverDash-anrop går genom säkra get/set-funktioner med minnesfallback när webbläsarlagring nekas.

Den centrala sparfilen hanterar exceptions, men effekt- och ljudinställningar läser/skriver `localStorage` utan `try/catch`. I webviews, privata lägen eller inbäddningar där åtkomst kastar ett undantag kan initialiseringen avbrytas innan `loop()` startar.

**Föreslagen lösning:** samla all lagring i små säkra `get/set`-funktioner och använd minnesvärden när lagring inte är tillgänglig.

## HD-008 – fel gamepad kan väljas

**Plats:** `hoverdash/index.html:3932-3975`

**Status:** löst 2026-09-09. Mediaenheter ignoreras, kontrollen måste ha tillräckliga knappar och axlar, en aktiv kontroll prioriteras och senaste giltiga kontroll behålls. Blockerad Gamepad API hanteras utan att stoppa loopen.

`Array.from(pads).find(Boolean)` tar första anslutna enhet utan att kontrollera `mapping`, knappar, axlar eller tidigare aktiv enhet. En mediakontroll eller annan Gamepad API-enhet i första slotten kan därför göra att en riktig handkontroll i nästa slot aldrig används.

**Föreslagen lösning:** filtrera på tillräckliga knappar/axlar, föredra `mapping === 'standard'` och behåll senast aktiva giltiga kontroll. Testa minst Xbox-, PlayStation- och en icke-standardmappad kontroll.

## HD-009 – lika med rekord räknas som nytt rekord

**Plats:** `hoverdash/index.html:3600-3617`

**Status:** löst 2026-09-09. Rekordkontrollen jämför slutpoängen strikt med rekordet som gällde före rundan. Delad förstaplats sparas och skickas till leaderboarden men ger inte ett nytt `high_score`-event eller rekordljud.

`bestScore` uppdateras innan `isNewBest` beräknas, och jämförelsen använder `>=`. Ett resultat som är lika med befintligt rekord skickar `high_score` och spelar rekordljudet igen.

**Föreslagen lösning:** spara föregående rekord före uppdateringen och använd `finalScore > previousBest`.

## HD-010 – `SPIN_INVULN` används inte

**Plats:** `hoverdash/index.html:792-793`, `3260`, `3300`, `3365-3373`, `5123-5129`

**Status:** löst 2026-09-09. Barrel rollen är nu uttryckligen säker under hela den synliga `SPIN_DUR`. Den döda extrakonstanten är borttagen och ett gränstest verifierar att skyddet upphör när timern når noll.

`SPIN_INVULN` deklareras som `0.3`, men alla kollisionskontroller använder bara `spinActive`, som varar `SPIN_DUR = 0.35`. Det är oklart om de sista 0,05 sekunderna ska vara säkra.

**Föreslagen lösning:** välj en av reglerna, ta bort den döda konstanten och testa gränsögonblicket.

## HD-011 – väggtunnel följdes av ett ofrånkomligt hinder

**Status:** löst och verifierat lokalt.

Orsaken var att phraseschemaläggaren inte räknade med avståndet på det sista steget. Nästa phrases första hinder kunde därför placeras nästan inne i den långa väggtunnelns utgång. Schemaläggaren summerar nu alla steg-gap och RED CANYONs avslutande väggar har ett uttryckligt gap på `2.35`.

Automatiska regressionstest finns i `hoverdash/obstacle-spacing.test.js`. Visuell kontroll i webbläsaren visade att den tidigare “stolpen” inte längre står i tunnelutgången.

## Minsta verifiering före release

- Kör samtliga befintliga Node-tester.
- Lägg en isolerad service worker-test som bevarar en cache från ett annat spel.
- Lägg merge-fixtures för tom/äldre/nyare lokal och molnbaserad sparfil.
- Kör sågmatrisen vid 30, 60 och 120 Hz.
- Spela från våg 1 till våg 6 och kontrollera exakt när troféer och daily låses upp.
- Testa väggutgång med sena vänster/höger-inputs.
- Testa start, spel, paus, återgång och menyer med minst en Xbox- och en PlayStation-kontroll.
- Testa med blockerad `localStorage` och med offline-läge efter första laddningen.
