# Snake – kritisk buggranskning inför release

Datum: 2026-09-09  
Granskad version: lokal arbetskopia efter P3-rättningarna `v1.9`  
Omfattning: Neo-kampanjen, Nokia 3310, Fruit Chain/16-bit, input, banor, nivåbyten, omstart, paus, game over, poäng, topplistor, lagring, ljud och små skärmar.

## Samlad bedömning

Snake har tre tydliga och visuellt skilda spellägen. Samtliga identifierade P1-, P2- och P3-fel är nu lösta och täcks av regressionstest: nivå 7 får korrekt startkropp, nivå 10 kan bara skapa nåbar mat, **Play Again** återställer hela första banan och Fruit Chains tutorial kan användas med handkontroll.

Gamepadstödet för Neo-menyn, spelet, paus, achievements, topplista, Fruit Chains tutorial och game-over är nu sammanhängande. P2-arbetet omfattar säkra nivåbyten, rätt topplista per spelläge, tålig lokal lagring samt direktlänkar som aldrig blockeras av ljudupplåsning. P3-arbetet gör Continue ärlig, rättar mobil- och pagineringsfel, säkrar Nokia-poängen och avslutar en full spelplan som Board Cleared.

Prioritet används så här:

- **P1:** blockerar release, låser en normal spelrunda eller bryter ett centralt flöde.
- **P2:** tydligt användarfel som bör rättas före eller strax efter release.
- **P3:** mindre fel, vilseledande UI eller teknisk skuld.

| ID | Prioritet | Status | Område | Sammanfattning |
|---|---:|---|---|---|
| SN-001 | P1 | Löst och testat | Nivå 7 | Ormens kropp låg framför huvudet och orsakade självträff efter två steg |
| SN-002 | P1 | Löst och testat | Nivå 10 | Mat kunde skapas i 128 helt oåtkomliga rutor |
| SN-003 | P1 | Löst och testat | Omstart | Play Again återställde nivånumret men behöll den senare kartan |
| SN-004 | P1 | Löst och testat | Fruit Chain/gamepad | Förstagångstutorialen kunde inte styras med handkontroll |
| SN-018 | P1 | Löst och testat | Fruit Chain/omstart | Restart från pausmenyn anropade en inkompatibel Neo-omstart |
| SN-005 | P2 | Löst och testat | Styrning | Två snabba svängar kan ge en otillåten 180-gradersvändning |
| SN-006 | P2 | Löst och testat | Nivåbyte | Spelet återupptas innan nästa nivå är laddad och kan mjuklåsa vid laddfel |
| SN-007 | P2 | Löst och testat | Topplista | H från Fruit Chain öppnar Nokia-listan |
| SN-008 | P2 | Löst och testat | Fruit Chain/game over | Egen äldre gamepadpolling väljer första enheten och saknar B |
| SN-009 | P2 | Löst och testat | Lokal poäng | Skadad eller gammal lagringsdata kan stoppa game-over-flödet |
| SN-010 | P2 | Löst och testat | Lagring | Nekad localStorage stoppar Nokia och Fruit Chain vid start |
| SN-011 | P2 | Löst och testat | Direktlänk/ljud | `?mode=` kan vänta obegränsat på AudioContext innan spelet skapas |
| SN-012 | P2 | Löst och testat | Direktlänk/avslut | Quit laddar samma direktlänk och startar om spelet |
| SN-013 | P3 | Löst och testat | Continue/UI | Spelet lovar en annons men kör bara en simulerad timer |
| SN-014 | P3 | Löst och testat | Mobil layout | High Scores-rubriken klipps vid cirka 320 px bredd |
| SN-015 | P3 | Löst och testat | Nokia HUD | Delta time kan sparas som ett falskt decimalt high score |
| SN-016 | P3 | Löst och testat | Global topplista | Next kan skapa en nästan tom extrapasida och nätfel saknar hantering |
| SN-017 | P3 | Löst och testat | Matgenerering | Slumpförsöken kan avslutas med en ogiltig matposition |

## SN-001 – nivå 7 startar med kroppen framför huvudet

**Plats:** `snake/js/snake.js:6-20`, `snake/assets/levels/level07.json:5-6`

**Status:** löst 2026-09-09. Startkroppen byggs nu bakom huvudet utifrån banans riktning. Tester täcker alla fyra riktningar och nivå 7 specifikt.

Den generella Snake-konstruktorn bygger alltid kroppen åt vänster från startpunkten. Nivå 7 startar däremot med riktningen `left`, vilket betyder att kroppen ligger i färdriktningen.

**Reproduktion:** skapa `new Snake(36, 36, "left")` och kör två gridsteg utan input. Första huvudet hamnar på en redan upptagen cell och `hitsSelf()` blir `true` efter steg två.

**Förväntat:** kroppen byggs bakom huvudet utifrån `startDir`.  
**Faktiskt:** spelaren måste känna till felet och svänga omedelbart för att inte dö.

**Föreslagen lösning:** bygg startcellerna med motsatt riktning till `_dirVec()`, på samma sätt som `SnakeNokia` redan gör. Lägg ett test för alla fyra startriktningar och minst tre raka steg.

## SN-002 – nivå 10 innehåller ett oåtkomligt matområde

**Plats:** `snake/assets/levels/level10.json:16-20`, `snake/js/food.js:55-96`

**Status:** löst 2026-09-09. Matgeneratorn flood-fillar från ormens huvud och väljer endast bland nåbara, lediga och tillåtna celler. Nivå 10-testet verifierar att samtliga val ligger i huvudets komponent med 1 840 celler.

Väggarna på nivå 10 bildar en sluten rektangel från `x=18..29`, `y=18..29`. Mittblocket ligger inne i den, men **128 fria celler** återstår innanför väggarna. De är inte sammanbundna med området där spelaren startar.

Matgeneratorn kontrollerar bara väggar, HUD och orm. Den kontrollerar inte om cellen går att nå. En enskild spawn har cirka **6,5 %** risk att hamna i det instängda området. Över nivåns 15 matbitar blir sannolikheten för minst en oåtkomlig spawn cirka **63,5 %**.

**Förväntat:** varje matbit kan nås från ormens aktuella område.  
**Faktiskt:** rundan kan bli omöjlig att slutföra utan att något ser trasigt ut.

**Föreslagen lösning:** öppna den inre väggringen eller välj mat från den sammanhängande komponent som innehåller ormens huvud. Lägg ett automatiskt reachability-test för samtliga nivåer.

## SN-003 – Play Again behåller den gamla kartan

**Plats:** `snake/js/game.js:759-783`

**Status:** löst 2026-09-09. Spelet sparar en ren kopia av startnivån och återställer level, grid, renderer, food-väggar, HUD-zon och orm före en ny runda.

`_restart()` återställer score, `currentLevelIndex` och level-scoring till 1, men laddar aldrig `level01`. Startposition, väggar, grid och food-konfiguration hämtas från `this.level`, som fortfarande är nivån där spelaren dog.

**Reproduktion:** dö på nivå 5 och välj Play Again. HUD/scoring börjar om på nivå 1, medan kartan fortfarande är **Scattered**.

**Föreslagen lösning:** gör omstarten asynkron, ladda nivå 1 och återställ `level`, `grid`, renderer, food-väggar, HUD-zon och orm atomiskt innan state sätts till `playing`.

## SN-004 – Fruit Chains tutorial saknar faktisk gamepadstyrning

**Plats:** `snake/js/main.js:185-225`, `snake/js/16bit/tutorial_16bit.js:234-264`

**Status:** löst 2026-09-09. Tutorialen äger kontrollen medan den visas, väntar på neutral input, navigerar Skip/Next med D-pad, aktiverar med A och hoppar över med B. Controllerinstruktionen visas i panelen.

Tutorialen säger “Swipe or use D-pad”, och kommentaren säger “Keyboard/gamepad support”, men implementationen lyssnar bara på `keydown` och klick. Den gemensamma `Input`-instansen finns, men spelets `_handleAction` gör ingenting i state `tutorial`.

**Konsekvens:** en förstagångsspelare som öppnar Fruit Chain i Big Picture kan inte trycka sig igenom eller hoppa över tutorialen med handkontroll.

**Föreslagen lösning:** använd den gemensamma gamepadmodulen, visa fokus mellan Skip/Next, låt A välja och B hoppa över. Kräv neutral kontroll innan första A accepteras.

## SN-018 – Fruit Chain Restart från paus kunde krascha

**Plats:** `snake/js/game.js:_restart`, `snake/js/main.js:_restart16bit`

**Status:** upptäckt och löst under P1-arbetet 2026-09-09. SDK-pausens Restart anropade basmetoden `_restart()`, som försökte köra `this.food.respawn()`. Fruit Chains `Food16bit` har ingen sådan metod och använder `init()`.

Omstarten routas nu till `_restart16bit()` när `mode16bit` är aktivt. Regressionstest låser den routningen.

## SN-005 – snabb dubbelinput kan vända ormen in i sig själv

**Status:** löst och testat 2026-09-09.

**Plats:** `snake/js/snake.js:38-46`

Neo/Nokia ändrar `this.dir` direkt. Från `right` accepteras därför `up` och sedan `left` före nästa gridsteg. Den faktiska rörelsen blir vänster, alltså 180 grader mot den senast genomförda rörelsen. Kroppen får dubbla celler och kan rapportera självträff två steg senare.

Fruit Chains `Snake16bit` har redan en bättre modell med `dir` och `nextDir`.

**Föreslagen lösning:** buffra högst en giltig riktning per gridsteg och jämför mot senast genomförda riktning. Testa tangentbord, swipe och gamepad med två inputs inom samma `stepTime`.

## SN-006 – nivåbyte återupptar spelet för tidigt

**Status:** löst och testat 2026-09-09.

**Plats:** `snake/js/game.js:399-459`, `snake/js/levels.js:1-5`

Continue-callbacken startar `_advanceLevel()` utan `await` och sätter omedelbart state till `playing`. `_advanceLevel()` väntar samtidigt på en ny fetch. Ormen kan därför röra sig på den gamla kartan bakom den uttonande overlayn. Vid långsam anslutning kan spelaren kollidera innan nästa nivå är klar.

`loadLevel()` fångar inte nätfel eller trasig JSON. Om preview-laddningen i `_showLevelComplete()` kastar stannar state på `levelcomplete` utan att någon continue-skärm visas.

**Föreslagen lösning:** ladda nästa nivå en gång, behåll state `levelcomplete/loading` tills den är validerad och installerad, och visa ett retry-läge vid fel.

## SN-007 – Fruit Chain öppnar fel topplista

**Status:** löst och testat 2026-09-09.

**Plats:** `snake/js/game.js:746-753`

`_showHighscores()` väljer board med `this.endlessMode ? "nokia" : "neo"`. Både Nokia och Fruit Chain sätter `endlessMode = true`, så H under Fruit Chain öppnar Nokia 3310-listan. Game-over-flödet använder däremot korrekt nyckel `16bit`.

**Föreslagen lösning:** lagra ett uttryckligt `gameMode` på Game och använd samma mode→board-mappning i alla vägar.

## SN-008 – Fruit Chains game-over använder en andra, äldre gamepadloop

**Status:** löst och testat 2026-09-09.

**Plats:** `snake/js/16bit/gameover_16bit.js:179-213`

Skärmen läser första icke-tomma Gamepad API-enheten direkt. Den ignorerar den delade kontrollväljaren, neutral-gating och modalägarskapet. B-knappen gör ingenting. Samtidigt fortsätter den globala `Input`-loopen att läsa kontrollen och skickar game-over-input till den osynliga Neo-skärmen.

**Risk:** headset/medieenhet i slot 0 blockerar kontrollen, öppningsknappen kan läcka in i skärmen och B kan inte återvända till menyn.

**Föreslagen lösning:** låt Fruit Chain-skärmen använda `gamepad.js` och samma ägarskap som övriga modaler, eller routa allt genom Game/Input och ta bort den egna loopen.

## SN-009 – fel format i lokal topplista stoppar game over

**Status:** löst och testat 2026-09-09.

**Plats:** `snake/js/highscore.js:26-68`, `snake/js/game.js:677-694`

`getLocalScores()` returnerar valfri giltig JSON utan att kontrollera att värdet är en array. Exempelvis `{"bad":true}` leder till `TypeError: scores.push is not a function` när rundan slutar. State är då redan `gameover`, men ingen game-over-skärm visas.

**Verifierat:** ett isolerat test med ovanstående lagringsvärde reproducerar TypeError direkt.

**Föreslagen lösning:** normalisera till en array, filtrera poster med ändlig score och giltigt datum, och skydda lokal sparning så att game-over alltid visas.

## SN-010 – nekad localStorage stoppar två spellägen

**Status:** löst och testat 2026-09-09.

**Plats:** `snake/js/nokia/hud_nokia.js:12-32`, `snake/js/16bit/hud_16bit.js:5-17`, `snake/js/16bit/tutorial_16bit.js:51-63`

Nokia-HUD, Fruit Chain-HUD och tutorialen läser/skriver `localStorage` utan `try/catch`. I en webview eller ett privat läge där åtkomst kastar avbryts initieringen.

**Verifierat:** samtliga tre konstruktioner kastar `denied` med en blockerad storage-implementation.

**Föreslagen lösning:** använd samma säkra storage-wrapper i alla Snake-moduler och fall tillbaka till minnet för sessionen.

## SN-011 – direktlänk kan fastna före spelstart på ljudupplåsning

**Status:** löst och testat 2026-09-09.

**Plats:** `snake/js/main.js:609-640`, `snake/js/audio.js:55-63`

En `?mode=neo`, `?mode=nokia` eller `?mode=16bit`-länk hoppar över menyn och saknar därmed en användargest. Trots kommentaren väntar startflödet på `AudioContext.resume()`. I webbläsare där promise hålls pending tills en tillåten gest kommer skapas aldrig `Game`.

**Observerat:** en synlig `?mode=neo`-runtime låg kvar på tom synthwavebakgrund utan spelplan. Vanlig start via meny fungerade i samma webbläsare.

**Föreslagen lösning:** starta spelet oberoende av ljudets resultat. Försök låsa upp/spela ljud utan att blockera init och återförsök vid första riktiga input.

## SN-012 – Quit fungerar inte från en mode-direktlänk

**Status:** löst och testat 2026-09-09.

**Plats:** `snake/js/game.js:789-798`

Return to Menu gör bara `window.location.reload()`. På `/snake/?mode=nokia` eller annan mode-länk väljer `MenuScreen.requestedMode()` samma läge igen, så Quit startar om spelet i stället för att visa menyn.

**Föreslagen lösning:** ta bort `mode` och spellägeshash från URL:en med `location.replace('/snake/')`, samtidigt som player/Big Picture-kontext bevaras där den behövs.

## SN-013 – Continue beskriver en annons som inte finns

**Status:** löst och testat 2026-09-09.

**Plats:** `snake/js/gameover.js:11-18`, `snake/js/gameover.js:174-228`

Neo visar “Watch Ad · Score Reset”, men `adEnabled` är påslaget och implementationen kör endast en 1,5-sekunders timer som alltid ger belöningen. Det motsäger även sidans budskap om att spelet saknar annonser.

**Föreslagen lösning:** kalla funktionen Continue och beskriv den verkliga kostnaden, eller dölj den tills ett riktigt rewarded-ad-flöde finns.

## SN-014 – High Scores-rubriken klipps på smal mobil

**Status:** löst och testat 2026-09-09.

**Plats:** `snake/js/achievements.js:409-444`

Vid cirka 320 px viewport reproducerades att “HIGH SCORES” skjuts ut och klipps till vänster när Back-knappen ligger på samma flexrad. Controller-hinten bryts också på ett svårläst sätt.

**Föreslagen lösning:** minska titel/font/padding under 380 px eller lägg Back på egen rad. Lägg visuell kontroll för 320×568 och 360×800.

## SN-015 – Nokia kan spara frame-delta som high score

**Status:** löst och testat 2026-09-09.

**Plats:** `snake/js/game.js:304-310`, `snake/js/nokia/hud_nokia.js:28-33`, `snake/js/nokia/renderer_nokia.js:400-405`

Basloopen anropar `hud.update(dt)`, men Nokia-HUD tolkar argumentet som score. Innan första poängen kan exempelvis `0.016` bli sparad som high score. Renderern anropar sedan samma metod med korrekt score, men den sänker inte det redan sparade värdet.

**Föreslagen lösning:** standardisera HUD-signaturen till `update(dt, game)` eller flytta score-uppdateringen till ett enda ställe.

## SN-016 – global paginering skapar fel sista sida

**Status:** löst och testat 2026-09-09.

**Plats:** `snake/js/achievements.js:639-653`

Next begränsar offset till `total - 1` i stället för början på sista hela sidan. Vid totalt 10 poster kan Next gå till offset 9 och visa endast den redan synliga tionde posten. Vid färre än 10 poster visas fortfarande en meningslös extravy.

`count()` och `myRank()` saknar dessutom `.catch()`, vilket kan skapa ohanterade promise-fel offline.

**Föreslagen lösning:** använd `Math.floor((total - 1) / HS_PAGE) * HS_PAGE`, inaktivera Prev/Next vid gränserna och rendera ett kontrollerat fel-/retryläge.

## SN-017 – matgeneratorerna kan returnera en ogiltig position

**Status:** löst och testat 2026-09-09.

**Plats:** `snake/js/food.js:55-96`, `snake/js/16bit/food_16bit.js:55-66`

Efter 200 respektive 100 misslyckade slumpförsök behåller generatorerna den senast provade positionen även om den ligger på orm, vägg, annan frukt eller förbjuden zon. Risken ökar när ormen blir lång.

**Föreslagen lösning:** bygg en lista över giltiga celler och välj från den. Om listan är tom ska rundan avslutas som vunnen/full board i stället för att skapa ett omöjligt objekt.

## Verifiering som genomfördes

- Snake-sviten efter P3-rättningarna: **26 av 26 tester passerade**.
- Den samlade berörda GameVolt-sviten efter P3-rättningarna: **87 av 87 tester passerade**.
- Syntaxkontroll och `git diff --check` körs på samtliga ändrade Snake-moduler.
- Direktstart via `?mode=neo` har verifierats i webbläsare utan att ljudupplåsning blockerar spelet.
- Matgeneratorerna testas deterministiskt både med tillgängliga celler och helt full spelplan.
