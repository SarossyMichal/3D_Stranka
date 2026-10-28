# Správca produktov s Grok AI — implementačný plán

> **Pre agentických pracovníkov:** Povinná podzručnosť: použi `superpowers:executing-plans` alebo `superpowers:subagent-driven-development`. Kroky používajú značky `[ ]`.

**Cieľ:** Pridať zabezpečenú správu katalógu, AI návrhy slovenských popisov cez Grok a zobrazovanie schválených produktov na verejnom webe.

**Architektúra:** Administrácia bude samostatná stránka s API chráneným Cloudflare Access a dodatočným overením JWT a e-mailu. Pages Functions budú zapisovať produkty do Cloudflare D1 a volať xAI Responses API cez serverový tajný kľúč; model dostane iba fakty z formulára a výstup ostane návrhom do ručného schválenia. Verejný katalóg bude čítať len publikované produkty z D1.

**Technológie:** Existujúce HTML/CSS/JavaScript, Cloudflare Pages Functions, D1, xAI API.

**Špecifikácia:** Rozhodnutia a rozsah sú uvedené v tejto konverzácii; doplnenie: verejná časť webu bude indexovateľná, administrácia má `noindex` a potrebuje Cloudflare Access.

## Globálne obmedzenia

- API kľúč xAI patrí iba do Cloudflare secret `XAI_API_KEY` alebo ignorovaného `.dev.vars`.
- AI nesmie vymýšľať cenu, dostupnosť, materiál ani rozmery; výstup pred zverejnením schváli človek.
- Verejná stránka zobrazuje len produkty so stavom `published`.
- Objednávky, platby, doprava a fakturácia zostávajú ukážkové.
- Testy sa nespúšťajú, pokiaľ si ich používateľ nevyžiada.

## Kontrola rizík

- Chýbajúca D1: API zobrazí zrozumiteľnú informáciu o nedokončenom nastavení.
- Chýbajúci xAI secret: generovanie vypíše návod na konfiguráciu, bez úniku tajomstva.
- Neplatný alebo duplicitný slug: uloženie sa odmietne s vysvetlením.
- Neoverený prístup: admin API zlyhá uzavreto; Cloudflare Access musí chrániť aj `/admin.html`.
- Prázdny katalóg alebo nedostupné API: ukážkové produkty zostanú označené ako ukážky.

---

### Úloha 1: D1 a serverové API

**Súbory:** `migrations/0002_product_fields.sql`, `functions/api/admin/products.js`, `functions/api/admin/products/[id].js`, `functions/api/admin/generate-description.js`, `functions/api/products.js`, `functions/api/health.js`, `.dev.vars.example`.

- [x] Pridať bezpečné validovanie polí produktu a D1 CRUD s predvoleným stavom `draft`.
- [x] Pridať xAI Responses volanie s `store:false`, nastaviteľným modelom a limitom výstupu; tajný kľúč nikdy nevrátiť klientovi.
- [x] Pridať verejný endpoint, ktorý vracia iba publikované produkty.
- [x] Rozšíriť health informáciu o bezpečné príznaky konfigurácie.

### Úloha 2: Administrácia a verejný katalóg

**Súbory:** `admin.html`, `admin.css`, `admin.js`, `produkt.html`, `app.js`, `scripts/build.mjs`.

- [x] Vytvoriť responzívny slovenský formulár a tabuľku produktov; generovanie iba navrhuje text, správca explicitne ukladá alebo publikuje.
- [x] Zobraziť nové publikované produkty v obchode, detaile produktu a ukážkovom košíku.
- [x] Admin stránku označiť `noindex` a zabezpečiť, aby zostala mimo verejnej sitemap.

### Úloha 3: Nastavenie a dokumentácia

**Súbory:** `README.md`, `wrangler.jsonc`, `.dev.vars.example`.

- [x] Doplniť ľudský návod na D1 migráciu, Access cesty, `XAI_API_KEY`, model a bezpečné nasadenie.
- [x] Uviesť, že indexácia verejného webu sa dokončí po výbere domény, nasadení a prihlásení sitemap do Google Search Console/Bing Webmaster Tools.
- [x] Spustiť iba build pre prípravu `dist/`; testovaciu sadu nespúšťať.


**Overenie:** `npm run build`, `git diff --check` a `node --check` pre klientské a Pages Function JavaScript súbory prešli. Funkčné testy ani Cloudflare nasadenie neboli spustené.
