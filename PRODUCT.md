# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
- Bežní ľudia na Slovensku, ktorí si kúpia hotový výrobok z e-shopu (napr. držiak na okuliare) alebo darček.
- Firmy, ktoré potrebujú prototyp, reklamné predmety alebo malú sériu.

## Product Purpose
tvojVýtlačok je malá slovenská 3D tlač na mieru s e-shopom. Zákazník si buď objedná hotový kus na dobierku, alebo pošle dopyt s vlastným nápadom. Úspech = prijatá objednávka alebo dopyt.

## Positioning
Robí to jeden človek vo vlastnej dielni: osobný prístup (píšete si priamo s autorom), rýchle vytlačenie a odoslanie, pomoc s návrhom aj keď zákazník nemá 3D model, nízka cena oproti veľkým firmám.

## Capabilities and Constraints
- Statický web (HTML/CSS/JS) na Cloudflare Pages + Pages Functions + D1. Žiadny framework.
- Platba len na dobierku. Doprava: Slovenská pošta, Packeta (výdajné miesto / adresa).
- Online sa dá objednať iba produkt s cenou a zadaným počtom kusov na sklade.
- Fotky produktov a ukážok prác nahráva majiteľ cez lokálny admin.

## Brand Commitments
- Názov „tvojVýtlačok“ a logo kocky (SVG šesťuholník/kocka) zostávajú.
- Texty a nadpisy sa pri redizajne nemenia, mení sa len vzhľad.

## Evidence on Hand
- Reálne fotky ukážok prác a produktov v D1 (`/img/<id>`), cez `/api/showcase` a `/api/products`.
- Žiadne recenzie, čísla zákazníkov ani referencie firiem — nevymýšľať.

## Product Principles
- Ľudský, nie korporátny: je za tým konkrétny človek a jeho tlačiareň.
- Skutočné výtlačky a fotky namiesto abstraktných ilustrácií.
- Jasná cena a dostupnosť, žiadne prekvapenia pri objednávke.
