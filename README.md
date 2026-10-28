# tvojVýtlačok — ukážkový web

Statický web bez inštalácie frameworku a bez závislostí. Všetok obsah e-shopu je ukážkový: stránky neprijímajú skutočné objednávky ani dopyty.

## Spustenie

Otvorte `index.html` v prehliadači. Pre lokálny server (odporúčané pri testovaní formulára a súborov):

```sh
python3 -m http.server 8000
```

Potom otvorte `http://localhost:8000`.

## Čo treba doplniť pred spustením

- Skutočné produkty, fotografie, kategórie, varianty, materiály a skladovú dostupnosť.
- Ceny a rozhodnutie, či a ako sa majú zobrazovať vrátane DPH.
- Kontaktné a firemné údaje, miesto podnikania a informácie o ochrane osobných údajov.
- Skutočný príjem dopytov: bezpečný serverový endpoint alebo n8n webhook, jeho overenie a mapovanie do Google Sheets. Webhook URL ani tajné kľúče nesmú byť v klientskom JavaScripte.
- Pred zapnutím objednávok rozhodnúť o platbe, doprave, fakturácii, storne, obchodných podmienkach a doručovaní potvrdení.

## Formulár a n8n

Formulár obsahuje polia `name`, `email`, `phone`, `company`, `description`, `quantity`, `dimensions`, `deadline` a `file`. Zatiaľ údaje iba overí v prehliadači a zobrazí lokálne potvrdenie; dáta neukladá ani neposiela. Pre n8n použite serverový sprostredkovateľ, ktorý overí požiadavku a bezpečne ju odovzdá workflowu. Súbory vyžadujú oddelené bezpečné úložisko alebo upload službu; samotné priloženie vo formulári ich nikam neodošle.

Košík je iba lokálna ukážka. Platby, doprava, fakturácia, sklad, objednávky ani e-shopový účet nie sú nastavené.

## Stránky webu

- `index.html` — úvodná stránka
- `sluzby.html` — prototypy, predmety a zákazková výroba
- `obchod.html` — ukážkový e-shop s filtrom a vyhľadávaním
- `produkt-vaza.html`, `produkt-organizer.html`, `produkt-stojan.html` — ukážkové produktové stránky
- `produkt.html?slug=...` — detail produktu z databázy
- `admin.html` — správa produktov a návrhy popisov cez Grok
- `kosik.html` — ukážkový košík uložený iba v prehliadači
- `postup.html` — postup pri dopyte
- `otazky.html` — časté otázky
- `dopyt.html` — ukážkový formulár dopytu
- `kontakt.html` — kontaktné údaje na doplnenie

## Vzhľad a vyhľadateľnosť

Web automaticky preberá svetlý alebo tmavý režim podľa nastavenia zariadenia. Po nasadení Cloudflare funkcie vytvoria `robots.txt` a sitemapu vrátane publikovaných produktov. Verejné stránky budú môcť indexovať vyhľadávače; samotné umiestnenie vo výsledkoch ani rýchlosť indexácie nemožno zaručiť. Administrácia aj admin API sú z indexovania vylúčené a treba ich chrániť Cloudflare Accessom. Po výbere domény odošli sitemapu do Google Search Console alebo Bing Webmaster Tools.

## Správca produktov s Grok AI

V administrácii zadaj názov a fakty o produkte. Grok navrhne slovenský popis, ktorý môžeš upraviť. AI nesmie dopĺňať neznáme vlastnosti, cenu ani dostupnosť. Produkt zostane konceptom, kým ho ručne neuložíš ako zverejnený. Verejný e-shop načíta iba zverejnené produkty z D1.

Grok sa volá serverovo cez xAI Responses API. Predvolený model je `grok-4.3`, ktorý vieš zmeniť premennou `XAI_MODEL`. Tajomstvo `XAI_API_KEY` nastav v Cloudflare; nikdy ho nevkladaj do HTML, `app.js`, ani do GitHubu. Pre lokálne skúšanie skopíruj `.dev.vars.example` do ignorovaného súboru `.dev.vars` a doplň kľúč len doň. Obrázok produktu sa teraz vkladá cez HTTPS adresu; nahrávanie súborov potrebuje samostatné úložisko.

## Príprava pre Cloudflare

Projekt je pripravený na Cloudflare Pages Functions. Verejný web sa pri zostavení kopíruje do `dist/`; priečinok `functions/`, migrácie a pomocné súbory sa do verejnej časti webu nekopírujú.

### Lokálne spustenie cez Cloudflare

1. Nainštaluj Node.js, ak ho ešte nemáš.
2. V priečinku projektu spusti `npm install`.
3. Spusti `npm run dev`.
4. Otvor adresu, ktorú vypíše Wrangler (zvyčajne `http://localhost:8788`).
5. Stav prípravy API uvidíš na `/api/health`.

Samotné HTML môžeš naďalej otvárať priamo alebo cez Python server. Cloudflare funkcie sa však spustia len cez Wrangler.

### Čo je pripravené a čo ešte chýba

- `wrangler.jsonc` nastavuje Cloudflare Pages a výstup `dist/`.
- `functions/api/health.js` ukáže, či sú databáza, Access a AI serverové nastavenia pripojené. Nezobrazuje ich hodnoty.
- `functions/api/admin/` je chránené overením Cloudflare Access JWT aj zoznamom povolených e-mailov. Bez správneho nastavenia API zamietne prístup.
- V Cloudflare Access chráň cesty `/admin`, `/admin.html` a `/api/admin/*`; povoľ len svoj e-mail.
- `migrations/0001_catalog.sql` vytvára tabuľky produktov, FAQ a návrhov; `0002_product_fields.sql` dopĺňa obrázok, materiál a rozmery produktu.
- `functions/api/admin/generate-description.js` volá Grok cez `XAI_API_KEY`, predvolene používa `grok-4.3` a obmedzuje dĺžku odpovede. Odpoveď sa neukladá do databázy, kým ju ty neuložíš.
- `functions/robots.txt.js` a `functions/sitemap.xml.js` vytvárajú indexačné súbory pre doménu, na ktorej je web spustený.
- `.dev.vars.example` obsahuje len zástupné hodnoty. Nikdy doň nevkladaj skutočný API kľúč; vlastné lokálne hodnoty patria do ignorovaného súboru `.dev.vars`.

Cloudflare účet, projekt, D1, Access a doména ešte nie sú nastavené. Kým ich nepripojíš, administrácia zobrazí hlásenie, že služby nie sú pripravené. Verejný chatbot nie je súčasťou tejto verzie.

### Nasadenie

1. Vytvor Cloudflare Pages projekt s názvom `tvoj-vytlacok` a pripoj GitHub repozitár. Nastav build command `npm run build` a výstupný priečinok `dist`.
2. Vytvor D1: `npx wrangler d1 create tvoj-vytlacok`. Jej ID vlož do väzby `DB` v `wrangler.jsonc`.
3. Aplikuj databázové migrácie: `npx wrangler d1 migrations apply tvoj-vytlacok --remote`.
4. Ulož Grok kľúč ako tajomstvo: `npx wrangler pages secret put XAI_API_KEY --project-name tvoj-vytlacok`. Wrangler si ho vypýta; nevkladaj kľúč do súboru v repozitári.
5. V Cloudflare Access chráň `/admin`, `/admin.html` a `/api/admin/*`, povoľ svoju e-mailovú adresu a pridaj vlastnú doménu.
6. Keď je D1 a Access nastavený, nasaď web cez GitHub Pages build alebo `npm run deploy`. Potom otvor `https://tvoja-domena.sk/api/health`, `https://tvoja-domena.sk/robots.txt` a sitemapu.

Nič nebolo nasadené a skutočné objednávky, platby, doprava ani fakturácia nie sú aktívne.
