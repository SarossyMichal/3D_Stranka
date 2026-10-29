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

Web automaticky preberá svetlý alebo tmavý režim podľa nastavenia zariadenia. Po nasadení Cloudflare funkcie vytvoria `robots.txt` a sitemapu vrátane publikovaných produktov. Verejné stránky budú môcť indexovať vyhľadávače; samotné umiestnenie vo výsledkoch ani rýchlosť indexácie nemožno zaručiť. Administrácia aj admin API sú z indexovania vylúčené a na verejnom webe vypnuté. Po výbere domény odošli sitemapu do Google Search Console alebo Bing Webmaster Tools.

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

### Správa produktov len vo vlastnom počítači

Administrácia na verejnom webe je vypnutá: `/admin`, `/admin.html` aj `/api/admin/*` vracajú chybu `admin_access_not_configured`. Produkty spravuješ iba vo svojom počítači, pričom sa ukladajú priamo do živej D1 databázy na Cloudflare.

1. Prvýkrát sa prihlás: `npx wrangler login` (otvorí prehliadač, karta nie je potrebná).
2. Grok kľúč vlož do ignorovaného súboru `.dev.vars` (skopíruj ho z `.dev.vars.example`) do riadku `XAI_API_KEY=`. Kľúč nikdy nevkladaj do GitHubu ani do Cloudflare.
3. Spusti `npm run admin` a otvor `http://localhost:8788/admin`.
4. Po skončení zastav príkaz klávesmi `Ctrl+C`.

V spodnej časti adminu je zoznam **Dopyty z webu**. Formulár na `dopyt.html` ich ukladá do tabuľky `inquiries` (migrácia `0003_inquiries.sql`); každý dopyt môžeš označiť ako vybavený alebo archivovať. Formulár neprijíma prílohy a chráni sa skrytým poľom proti botom a limitom 5 dopytov za hodinu z jednej adresy (spolu najviac 60 za hodinu). Admin dopyty sám neobnovuje, načítaj stránku znova.

Fotky sa nahrávajú priamo v admine: pri produkte tlačidlom **Vybrať fotku** a na úvodnú stránku v sekcii **Ukážky prác**. Prehliadač fotku zmenší na najviac 1600 px (JPG), uloží ju do tabuľky `images` v D1 (migrácia `0004_images.sql`) a web ju zobrazuje na adrese `/img/<id>`. Sekcia ukážok sa na úvodnej stránke ukáže až po pridaní prvej fotky.

### Objednávky na dobierku

Košík (`kosik.html`, `kosik.js`) posiela objednávky na `/api/orders`. Server prepočíta ceny z databázy, skontroluje sklad a kusy odpočíta (migrácia `0005_orders.sql` pridala `price_cents`, `stock` a tabuľku `orders`). Online sa dá objednať iba produkt s cenou aj počtom kusov na sklade; produkt bez počtu kusov ukáže tlačidlo „Opýtať sa“ a admin ho bez počtu kusov neuloží. Produkt s 0 kusmi sa v e-shope nezobrazí. Zrušenie objednávky v admine vráti kusy na sklad.

Ceny dopravy a dobierky sú v `functions/api/_shop.js`.

Mapa výdajných miest Packety sa v košíku zapne, keď do `wrangler.jsonc` pod `vars` doplníš `"PACKETA_API_KEY": "tvoj-kľúč"` (kľúč nájdeš v klientskej sekcii Packety). Kľúč pre mapu je verejný, preto môže byť v repozitári. Bez neho zákazník vpíše výdajné miesto ručne. K objednávke sa ukladá aj ID výdajného miesta (migrácia `0006_pickup_point_id.sql`).

Pri každej objednávke odídu dva e-maily cez Gmail tvojvytlacok@gmail.com (`functions/api/_notify.js`, knižnica `worker-mailer`): upozornenie pre teba (odpoveď ide priamo zákazníkovi) a potvrdenie pre zákazníka. Treba na to „heslo pre aplikácie“ z Google účtu (myaccount.google.com/apppasswords, vyžaduje dvojstupňové overenie). Nastav ho ako tajomstvo:

```
npx wrangler pages secret put GMAIL_APP_PASSWORD --project-name tvoj-vytlacok
```

Pre lokálny admin ho pridaj aj do `.dev.vars` ako `GMAIL_APP_PASSWORD=...`. Tlačidlo „Poslať skúšobný e-mail“ v admine pošle obe ukážky na tvoj Gmail. Bez hesla sa objednávky ukladajú normálne, len e-maily neodídu.

Lokálny režim zapína iba príkaz `npm run admin` (premenná `ADMIN_LOCAL_MODE`) a funguje len na adrese `localhost` / `127.0.0.1`. Server počúva iba na tvojom počítači, nie v sieti.

### Čo je pripravené

- `wrangler.jsonc` nastavuje Cloudflare Pages, výstup `dist/` a živú D1 databázu `tvoj-vytlacok` (aj pri lokálnom spustení).
- `functions/api/health.js` ukáže, či sú databáza, Access a AI serverové nastavenia pripojené. Nezobrazuje ich hodnoty.
- `functions/api/admin/` pustí požiadavky iba v lokálnom režime, alebo ak by si neskôr zapol Cloudflare Access (overenie JWT a zoznam povolených e-mailov). Inak prístup zamietne.
- `migrations/0001_catalog.sql` vytvára tabuľky produktov, FAQ a návrhov; `0002_product_fields.sql` dopĺňa obrázok, materiál a rozmery produktu. Obe sú už v živej databáze.
- `functions/api/admin/generate-description.js` volá Grok cez `XAI_API_KEY`, predvolene používa `grok-4.3` a obmedzuje dĺžku odpovede. Odpoveď sa neukladá do databázy, kým ju ty neuložíš.
- `functions/robots.txt.js` a `functions/sitemap.xml.js` vytvárajú indexačné súbory pre doménu, na ktorej je web spustený.
- `.dev.vars.example` obsahuje len zástupné hodnoty. Vlastné lokálne hodnoty patria do ignorovaného súboru `.dev.vars`.

### Nasadenie

Web beží na `https://tvoj-vytlacok.pages.dev` a Cloudflare ho automaticky znova nasadí po každom pushnutí do vetvy `main` na GitHube (build `npm run build`, výstup `dist`). Nové databázové migrácie aplikuj príkazom `npx wrangler d1 migrations apply tvoj-vytlacok --remote`.

Skutočné objednávky, platby, doprava ani fakturácia nie sú aktívne.

## Vzhľad

Verejný web má vzhľad „balíkový štítok“ v `stitok.css` (načítava sa posledný, po `styles.css` a `redesign.css`). Písma: Archivo a IBM Plex Mono. Popis produktu a značky je v `PRODUCT.md`.

## Predaj cez dopyt (od 29. 10. 2026)

Košík a online objednávky sú vypnuté. Pri každom produkte je tlačidlo „Mám záujem“ s formulárom
(ide do `/api/inquiries`, uloží sa do adminu a príde e-mail na `SHOP_EMAIL`) a odkaz na Instagram
@tvojvytlacok. `/api/orders` vracia 410, kým v Cloudflare nie je premenná `ORDERS_ENABLED=true`.

Celá verzia s košíkom, dobierkou a obchodnými podmienkami je uložená v git značke `eshop-s-kosikom`:

    git show eshop-s-kosikom --stat
    git checkout eshop-s-kosikom -- kosik.html kosik.js obchodne-podmienky.html reklamacny-poriadok.html

Pred jej vrátením treba mať predávajúceho so živnosťou a doplniť jeho údaje do podmienok.
