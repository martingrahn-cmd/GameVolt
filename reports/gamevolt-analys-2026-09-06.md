# GameVolt: buggar, särprägel och en separat betaavdelning

Granskad 6 september 2026. Underlag: publicerade startsidan i webbläsaren, aktuell lokal kod på `codex/add-ink-game`, befintliga tester, isolerade reproduktioner och läsningar av offentliga spel- och trofédefinitioner i Supabase. Konkurrentuppgifter kommer från deras egna webbplatser.

Den publicerade startsidan visar 23 spel. Den lokala versionen har 24 inklusive INK, vars databasregistrering är genomförd men vars sida ännu inte har publicerats. Rapporten skiljer därför på befintliga portalproblem och luckor inför INK-lanseringen. Detta är en granskning av portalen och delade funktioner, med stickprov i spelkoden; ingen fullständig genomspelning av alla spel eller fullständig säkerhetsrevision. Inga nya trafiksiffror eller retentionstal har analyserats.

## Åtgärdsstatus efter buggrättningen, 6 september 2026

De fem högprioriterade fynden nedan (1, 2, 3, 4 och 6) är rättade lokalt.
Även fynd 5, sena topplistesvar vid spelbyte, är rättat. Beskrivningarna längre
ned dokumenterar beteendet **före** rättningen; deras radnummer avser den koden.

- Profilen innehåller nu INK, Gridburn och Spinburn: 24 spel / 744 definitioner.
  Översikt, medaljer och procent räknar samma definierade troféer.
- INK:s migration använder SDK:ts avkodade objekt och listor. Testet går genom
  SDK:t hela vägen till skrivning av sammanslagen statistik, poäng och troféer.
- GA4 räknar föregående synlighetstillstånd. Reproduktionen ger nu 100 sekunder,
  även när fliken döljs efter 60-sekundersmilstolpen.
- Spelarens sidopanel och den centrala topplistan använder samma aktuella lägen
  och poängformat. Sena svar, inklusive egen placering, får inte byta spel.
- SDK:t behåller misslyckade skrivningar i en kontobunden lokal kö, kontrollerar
  serverfel och visar status med Retry. Återförsök sker vid återanslutning,
  inloggning, fokus och medan skrivningar väntar. Molnsparningar har lokal
  reservkopia; fördröjda svar får inte skriva över nyare framsteg. Troféer blir
  molnbekräftade först efter lyckad skrivning.
- `sql/score-submission-id.sql` är **redan körd i produktion**. UUID-kolumnen och
  dess unika index verifierades i Supabase (`unique=true`, `valid=true`) och
  genom en offentlig läsning via PostgREST (HTTP 200). Samma poängrapport behåller
  sitt ID vid återförsök, så databasen kan ignorera dubletter. Äldre klienter
  fungerar utan fältet. Inga testpoäng eller testtroféer skapades i produktion.

Verifierat: **46/46 tester**, varav 13 nya regressionsfall, samt INK:s spelharness
med och utan SDK. Profiltroféer renderades i webbläsaren med lokala fixtures;
Breakouts sidopanel matchade dess centrala lista. Nätverksfel och kontobyten
provades med simulerad Supabase, inte med riktiga kontotransaktioner. INK:s
fullständiga checkpointåterställning på en ny enhet ingår inte i denna rättning.
Vid avslutad granskning var webbkoden ännu inte committad, pushad eller mergad.
INK och rättningarna publiceras tillsammans i efterföljande release.

## Rekommendationen

Utveckla GameVolt som en personlig spelstudio som går att besöka och spela direkt i. Kombinationen av egna spel, reklamfrihet och en synlig skapare är stark. En separat **GameVolt Lab** kan göra det möjligt för besökare att påverka spelen under utvecklingen och följa vad deras synpunkter leder till.

Bygg först bort de fel som riskerar spelarens förtroende: troféer som saknas i profilen, osäker överföring av gästframsteg, tysta sparfel och topplistor som visar fel spel eller fel version. Börja sedan med två betor och ett enkelt sätt att lämna återkoppling. Fler katalogposter ensamma skapar inte en relation till spelaren.

## Fördelarna jämfört med andra spelsidor

| Egenskap | Bedömning | Hur GameVolt kan använda den |
|---|---|---|
| Alla spelen kommer från samma skapare | Stark grund för en tydlig identitet. Kvalitet och sammanhang måste märkas i spelen. | Korta skaparkommentarer, återkommande designidéer, en gemensam samling och synliga förbättringar. |
| Inga annonser under spelandet | Konkret fördel jämfört med annonsfinansierade portaler. | Lyft fram det nära spelknappen och bevara obrutna spelomgångar. |
| Direktkontakt med Martin | Stor potential som ännu främst ligger på kontakt- och om-sidorna. | Återkoppling i spelaren, konkreta svar och ändringsloggar som visar resultatet. |
| Spela gratis utan konto eller installation | Viktigt men vanligt på marknaden. | Behåll enkelheten; låt den vara ett pålitligt grundlöfte. |
| Konton, molnsparning och topplistor | Användbart men ingen egen konkurrensfördel. | Gör dem mer begripliga och tillförlitliga än spelaren förväntar sig. |
| En liten kurerad katalog | Kan göra valet lättare; samtidigt mindre bredd. | Rekommendera efter situation: en kort paus, ett lugnt pussel eller en kompisutmaning. |
| Betaavdelning | Passar studions identitet. Tidiga spel och feedback finns redan hos andra aktörer. | Gör deltagandet personligt: vad vill Martin testa denna vecka, och vad ändrades efter förra testet? |

Poki erbjuder redan gratis spel utan obligatoriskt konto och kontobaserade sparningar mellan enheter. Deras vanliga portal finansieras med annonser. Det gör reklamfriheten mer särskiljande än formuleringen ”gratis och utan konto”. [Poki FAQ](https://poki.com/en/c/faq).

CrazyGames erbjuder också molnsparning, multiplayerinbjudningar och utvecklarfeedback. Att koppla ihop flera spel med ett konto är alltså bra, men behöver kombineras med ett tydligare personligt värde. [CrazyGames FAQ](https://docs.crazygames.com/faq/), [kontointegration](https://docs.crazygames.com/requirements/account-integration/).

itch.io har redan stöd för spel under utveckling, begränsade tester och kontakt med en community. Betaetiketten i sig blir därför inte unik. GameVolts möjlighet är ett litet, sammanhållet utbud där det är lätt att hitta något roligt och förstå vem man hjälper. [itch.io: Limited Playtests & Releases](https://itch.io/docs/creators/limited-releases).

Berätta gärna hur du använder AI, men låt spelarens upplevelse bära erbjudandet: roliga spel, tydlig smak, snabba förbättringar och en människa som tar ansvar. Egenutvecklade spel betyder inte automatiskt exklusiva spel eller unika spelmekaniker; undvik sådana löften om samma spel också publiceras på andra portaler.

## Konkreta buggar och luckor

Prioriteterna nedan är en bedömning av spelarens konsekvens och vad som behöver rättas inför fler lanseringar. Fynden är inte åtgärdade inom denna analys.

### 1. Profilsidan saknar troféer för tre spel — hög prioritet

Profilen använder en egen hårdkodad trofékatalog med 21 spel. Gridburn, Spinburn och INK saknas. Databasen har däremot 31 definitioner för vart och ett av dessa tre spel.

`fetchTrophies()` räknar alla hämtade upplåsningar medan `renderTrophies()` bygger sektioner och nämnaren i procenttalet från den mindre lokala katalogen. Det innebär att en trofé kan räknas in i totalsumman utan att finnas som synligt kort. Sammanställningen per medaljnivå kan också avvika från totalen.

Underlag: [profilens katalog](/Users/martingrahn/Documents/GameVolt/profile/index.html:1154), funktionerna `fetchTrophies` och `renderTrophies` vid cirka rad 2057 och 2081, samt jämförelsen med databasens definitioner. Gridburn och Spinburn är äldre luckor; INK är en lucka i den nya integrationen.

Åtgärd: använd gemensamma definitioner med lokal reservkopia. Lägg till en kontroll som jämför portalens släppta spel, profilkatalog och databas. Godkänt när upplåsningar, kort, medaljsummor och totalprocent utgår från samma urval.

### 2. INK:s överföring av gästtroféer till konto läser fel datatyp — hög prioritet före publicering

SDK:t avkodar lagrade JSON-värden innan det skickar dem till spelets migrationsfunktion. INK försöker avkoda samma objekt och listor ytterligare en gång. Fel fångas upp och ersätts med tomma värden.

Reproducerat med den riktiga migrationsfunktionen: två lokala troféer blir en tom lista; statistik med 12 ritade streck blir noll i motsvarande sammanslagning. En numerisk poäng fungerar i samma prov, så felet gäller inte automatiskt alla datatyper. Lokala sparningar raderas inte av just denna kod; problemet är att överföringen och molnunderlaget blir ofullständiga.

Underlag: SDK rad 524 och INK rad 691–716. Databasregistreringen är korrekt, men en sådan registrering verifierar inte hela flödet mellan gästläge och konto. Min tidigare bekräftelse gällde registreringen och svaren från topplistorna; dessa integrationstester behövs också.

Åtgärd: hantera redan avkodade värden. Kontrollera hela resan: spela som gäst, logga in, öppna en annan webbläsare och verifiera vad som faktiskt följer med. Utred också checkpoints och återläsning; en registrerad migration ensam garanterar inte att alla framsteg återställs på en ny enhet.

### 3. GA4 kan räkna bakgrundstid som speltid — hög prioritet för analys

Den gemensamma mätningen använder det nya synlighetstillståndet när den räknar tiden sedan föregående mättillfälle. Efter 60 sekunder stoppas dessutom den regelbundna timern. Längre intervall mellan flikhändelser får då stor effekt.

Reproducerat med den riktiga modulen och en kontrollerad klocka: 90 sekunder synlig, 300 sekunder i bakgrunden och ytterligare 10 sekunder synlig ger **370 rapporterade sekunder**, trots att den synliga tiden är **100 sekunder**.

Underlag: `js/gv-ga4.js`, särskilt `_accumulate` vid rad 142 och timerstoppet vid rad 159. Detta är en kodreproduktion, inte ett påstående att alla historiska analyssessioner är fel.

Åtgärd: beräkna tid utifrån föregående tillstånd och skilj mellan laddad, spelande, pausad och dold. Verifiera flera flikbyten, långa sessioner och menyer. Bedöm inte vilka betor som fungerar bäst med nuvarande tidsmått ensamt.

### 4. Topplistan bredvid spelet frågar efter fel spelläge — hög prioritet

Sidopanelen använder `default` för alla spel utom BlockStorm. HoverDash har en aktuell lista under `vx9`, Breakout under `neon-drift-v2`, och INK under `free`. Den gemensamma topplistesidan och spelens egna listor har andra regler.

Läsningen av produktionens databas visar att HoverDash har resultat i både äldre och aktuell lista; samma sak gäller Breakout. Därför kan spelaren få en gammal tävling i sidopanelen, inte bara en tom ruta. INK:s framtida resultat under `free` missas av sidopanelens fråga efter `default`.

Underlag: `play/index.html`, `loadSidebarLeaderboard`, rad 1516–1536. Åtgärd: lagra officiella spellägen och poängformat i en gemensam katalog. Skilj vid behov mellan gamla och aktuella regelversioner.

### 5. Snabba spelbyten kan visa föregående spels resultat — medelhög prioritet

Topplistans asynkrona svar kontrollerar inte om spelaren har bytt spel sedan frågan skickades. En äldre fråga kan komma tillbaka sist och skriva över den nyare listan, eller gömma den.

Reproducerat med den riktiga funktionen och fördröjda testsvar: byt från HoverDash till INK; låt INK:s svar komma först och HoverDashs sist. Sidopanelen visar då HoverDashs testrad trots att det aktuella spelet är INK.

Åtgärd: knyt svaren till aktiv förfrågan och spel, även när en extra fråga hämtar spelarens egen placering.

### 6. Misslyckat sparande kan se lyckat ut — hög prioritet

Flera SDK-metoder bortser från felobjekt i databasens svar. `leaderboard.submit()` och `save.set()` avslutar utan att signalera sådana fel. Troféupplåsning läggs i den lokala minnescachen före serverbekräftelse och kontrollerar inte HTTP-status. Favoritknappen har liknande vägar.

Reproducerat för poängmetoden: när den simulerade databasen returnerar ett felobjekt avslutas anropet ändå som ett lyckat promise med `undefined`. Det är inte bevis för hur ofta detta händer i produktion, men felhanteringen saknas när situationen uppstår.

Åtgärd: behåll osynkade resultat lokalt, kontrollera svaret och försök igen utan dubbelregistrering. Visa begriplig status som ”Sparat på den här enheten” och ”Synkat till ditt konto”. Underlag: `sdk/gamevolt.js` rad 486, 607, 714 och 861.

### 7. Övriga kontrollerbara brister

- **Solitaire saknas i den centrala listan över spel med topplistor.** Kommentaren säger fortfarande att spelet använder Firebase, trots att dess leaderboard-modul använder GameVolt och flera variantlägen. Registrera varianterna på ett konsekvent sätt.
- **Antalet ”plays” räknas vid öppning av spelaren.** `increment_play_count` körs innan spelaren faktiskt har börjat. Det är ett öppningsmått, medan GA4 försöker mäta verkliga starter. Namnge dem tydligt eller flytta räknandet till första verkliga spelstart.
- **Laddningshjälpen bekräftar dokumentladdning, inte fungerande spel.** Ett laddat dokument kan ha kraschat i JavaScript. Lägg till en signal från spelet när menyn eller spelplanen är redo. Detta är en verifierad begränsning i återhämtningen, inte ett påstående om att ett visst spel just nu kraschar.
- **Tre PNG-bilder på startsidan är cirka 511–607 KiB styck.** Det är uppmätta filstorlekar för Manny, Spinburn och Gridburn, inte en uppmätt laddningstid. Gör separata responsiva kortbilder innan fler bilder läggs till. INK:s nya bilder är redan betydligt mindre.

## GameVolt Lab: så skulle jag göra

Namnet **Lab** signalerar en plats för experiment. Varje spel får den tydliga statusen **Beta**. Huvudkatalogen behåller löftet om färdiga spel. När det behövs kan ett mycket tidigt experiment beskrivas som ”Prototype”, men börja med få statusbegrepp.

| Yta | Färdiga spel | Lab / beta |
|---|---|---|
| Navigation | Games | Lab, som egen ingång |
| Startsida | Ordinarie spelval och katalog | En separat, mindre puff till Lab |
| Antal spel | Antal släppta spel | Eget antal spel under utveckling |
| Sökning | Ordinarie resultat | Tydligt avskild grupp med Beta-etikett |
| Favoriter och senast spelat | Vanligt flöde | Egen grupp eller beständig Beta-markering |
| Spelaren | Vanlig spelrad | Beta, versionsnummer, kända problem och feedback |
| Betyg | Publicerade spelbetyg | Frågor om testversionen; ingen blandning i Top Rated |
| Poäng och troféer | Ordinarie tävling och profil | Separata testlistor; undvik att påverka ordinarie totalsummor |

Statusen måste följa spelet hela vägen. En färgad badge på startsidan räcker inte: även en direktlänk, en favorit och en delad länk ska förklara att det är en beta.

Varje betasida behöver fem korta saker: vad som redan går att spela, vad som saknas, senaste uppdateringen, om sparningar kan återställas och **en konkret fråga från Martin**. Exempel: ”Jag testar styrningen i den här versionen. Är det lätt att sikta när du spelar på mobilen?” Det ger mer användbara svar än ett tomt fält med ”Vad tycker du?”.

Be om återkoppling efter en avslutad omgång eller när spelaren själv öppnar feedbackpanelen. Låt spelaren ange ”Jag fastnade”, ”Styrningen var svår” eller skriva en kort kommentar. Koppla svaret till spel, version och relevant enhetstyp. Visa sedan återkopplingens resultat: ”Ni hade svårt att se faran här. I den här uppdateringen syns den tidigare.”

Lägg ribban för en öppen beta vid en spelbar huvudloop, fungerande omstart, tydliga kontroller och inga kända fel som förstör sparningar. Saknade banor, provisorisk grafik och obalanser är rimliga betabrister när de anges tydligt. Om en version ofta inte går att starta är ett litet privat test bättre.

Börja med **två betor**, gärna med olika spelidéer. Sätt ett faktiskt datum för nästa genomgång. En beta som inte får uppmärksamhet kan få status ”Pausad” med bevarad information och en fungerande återväg, i stället för att ligga kvar som ett evigt löfte. Inga automatiska löften om framtida innehåll eller lanseringsdatum.

Gör skillnad mellan produktstatus och version. Ett spel kan vara Beta v0.4 och senare Released v1.0 med samma identitet. Poäng, sparformat och statistik behöver versionsgränser när reglerna ändras. Uppgradering till färdigt spel ska vara ett medvetet beslut med testade sparningar, profilvisning, kontoflöde och mobilstöd.

## Funktioner som bäst bygger vidare på din fördel

1. **Återkoppling med synligt resultat.** Knapp i spelaren, en riktad testfråga och en kort ändringslogg. Hjälper både kvaliteten och relationen till Martin. Ett komplett forum behövs inte för att börja.
2. **Följ ett spel.** Visa ”Uppdaterat sedan du spelade” i portalen. Börja där; e-post och push kan vänta tills det finns en stabil rutin för uppdateringar och frivilliga prenumerationer.
3. **Veckans utmaning från Martin.** Använd en befintlig bana eller regel och ett riktigt, daterat resultat från dig. En liten publik kan fortfarande känna igen skaparen och ha ett tydligt mål.
4. **Utmaningar mellan vänner som går att spela vid olika tillfällen.** Samma bana eller seed, en länk och jämförbara regler. Passar en mindre publik bättre än ett beroende av många samtidiga spelare. Bygg vidare på befintlig utmanings- och multiplayerfunktionalitet.
5. **En tydligare väg genom samlingen.** Exempelvis en liten, fast kuraterad uppgift: prova tre spel med olika mekanik. Belöningen bör förklara vad spelaren gjort. Utöka inte slentrianmässigt antalet troféer för att fylla profilen.
6. **Korta verkliga spelklipp bredvid omslagsbilderna.** Använd omslaget för karaktär och ett kort klipp för att visa hur spelet faktiskt fungerar. Det minskar risken att snygg marknadsföring skapar fel förväntningar.

## Prioriterad arbetsordning

**Först: en sammanhängande och pålitlig portal.** Rätta profilkatalogen, INK-migrationen, tysta sparfel, topplisternas lägen och svar vid spelbyten. Rätta tidsmätningen innan den används för att jämföra nya spel. Reproducerbara kontroller ska ingå i godkännandet, inte bara att menyn går att öppna.

**Sedan: en gemensam speldefinition.** Samla namn, bilder, status, spellägen, kontroller och relevanta versioner. Startsida, spelare, sökning, favoriter, profil och topplistor ska använda samma underlag. Det behöver inte innebära React, en ny server eller omskrivning av spelen. Statisk data och genererade sidor passar nuvarande teknik.

**Därefter: en liten Lab-lansering.** Två betor, egen sida, tydlig märkning i spelaren och en feedbackfunktion. Lägg till en kort kommentar från dig om vad som testas. Skilj betornas topplistor och återkoppling från ordinarie betyg och samling.

**Till sist: utvärdera och bygg återbesök.** Titta på andelen besökare som faktiskt börjar spela, om de spelar en andra omgång, om de återkommer efter en uppdatering och vilka problem de beskriver. Rapportera antal personer tillsammans med procenttal; små grupper ger osäkra jämförelser. Använd också några observerade provspelningar för att förstå varför en siffra ser ut som den gör. Sätt första jämförelsen mot GameVolts egen baslinje, utan påhittade branschmål.

## Verifiering och avgränsning

Den körda befintliga testsamlingen rapporterade 33 godkända deltester utan fel. Den omfattar portaltester och befintliga tester för Connect 4, Spinburn, Gridburn och Breakout. Det är inte 33 verifierade spel eller fullständig kompatibilitetstestning.

Isolerade reproduktioner bekräftade felaktig tidsmätning, tom INK-migration av trofélistor/statistik, fel vid fördröjda topplistesvar och ett tyst fel vid poängskrivning. Databasen bekräftade de tre saknade profilkatalogerna och separata äldre/aktuella listor för HoverDash och Breakout. Inga testpoäng eller testtroféer skrevs till produktionen.

Fortsatt säkerhetsgranskning bör kontrollera validering av inskickade poäng och serverregler innan tävlingar får större betydelse. Denna rapport fastställer inte att servervalidering saknas; det kräver en separat granskning av aktuella regler och funktioner. Ingen mätning av verkliga mobilers bildfrekvens, fullständig offlinetäckning eller trafikökning har gjorts.

Reproduktionsunderlag: [isolerade kodprov](/Users/martingrahn/Documents/GameVolt/reports/gamevolt-audit-repro-2026-09-06.cjs). Körs lokalt med Node och skriver inga data till nätverket. Provet dokumenterar den granskade kodens fel; efter rättningar ska förväntningarna uppdateras.
