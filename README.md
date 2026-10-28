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
- `kosik.html` — ukážkový košík uložený iba v prehliadači
- `postup.html` — postup pri dopyte
- `otazky.html` — časté otázky
- `dopyt.html` — ukážkový formulár dopytu
- `kontakt.html` — kontaktné údaje na doplnenie

## Vzhľad a vyhľadateľnosť

Web automaticky preberá svetlý alebo tmavý režim podľa nastavenia zariadenia. Kým sa stránka spúšťa len ako súbor z počítača, nie je verejne dostupná ani indexovaná vo vyhľadávačoch. Má základné titulky a popisy; po zverejnení na doméne treba doplniť `sitemap.xml` a prihlásiť web do nástroja na správu indexácie.

## Plán AI nástrojov

Zámer je mať dva oddelené nástroje: súkromného správcu na úpravu obsahu webu a verejného asistenta pre otázky návštevníkov. Pred ich vytvorením treba zvoliť hosting s bezpečným serverovým kódom, prihlásenie pre správcu, databázu a AI službu. Tajné kľúče musia zostať na serveri. Odporúčaný ďalší krok je pripraviť Cloudflare Pages/Workers s D1 databázou a ochranou administrácie pomocou Cloudflare Access; vyžaduje to vytvorenie účtov a nasadenie stránky.

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
- `migrations/0001_catalog.sql` pripravuje tabuľky produktov, FAQ a návrhov obsahu. Návrh zostáva v stave `pending`, kým ho správca neschváli.
- `.dev.vars.example` obsahuje len zástupné hodnoty. Nikdy doň nevkladaj skutočný API kľúč; vlastné lokálne hodnoty patria do ignorovaného súboru `.dev.vars`.

Ešte nie je vytvorený Cloudflare účet ani projekt, D1 databáza, Access aplikácia, skutočné AI napojenie alebo AI chat rozhranie. Verejný chat a AI úpravy zostávajú vypnuté, kým si nevyberieme AI službu, nenastavíme tajomstvá na serveri a nedoplníme pravidlá ochrany údajov. Kľúče nepatria do HTML ani do `app.js`.

### Nasadenie

Na nasadenie bude treba Cloudflare účet a najprv vytvoriť Pages projekt. Potom sa nastaví D1 databáza, jej ID v `wrangler.jsonc`, Cloudflare Access pre cesty administrácie a povolený správcovský e-mail. Až potom sa spustí `npm run deploy`. Zatiaľ nič nebolo nahrané na internet.

Cloudflare Access pre vlastnú administráciu potrebuje doménu pridanú do Cloudflare. Po jej zvolení doplníme presné nastavenie prihlásenia. Nezabudni, že AI chat bude posielať zákaznícke otázky zvolenému poskytovateľovi AI; pred zapnutím treba doplniť informácie o tomto spracovaní údajov.
