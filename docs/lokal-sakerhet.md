# Lokal säkerhet vid test med riktiga underlag

Omnio är ännu en lokal utvecklingsapp. Följ detta när du laddar upp riktiga fakturor.

## Checklista

1. Kör bara `pnpm dev` (binder till `127.0.0.1` — inte synlig på LAN).
2. Öppna bara [http://127.0.0.1:3000](http://127.0.0.1:3000) eller [http://localhost:3000](http://localhost:3000).
3. Ha BitLocker (diskkryptering) på.
4. Lägg inte testunderlag i OneDrive/Google Drive under test — behåll dem lokalt.
5. Sudda minst **namn och adress** innan uppladdning. Fakturanummer och kundnummer kan ofta lämnas kvar vid lokal test.
6. Använd JPG (eller PNG) efter sudd om originalet är PDF med textlager — annars ligger texten kvar under färgen.
7. Använd inte `dev_session=1` om någon annan kan sitta vid datorn.
8. Radera uppladdade testfiler/`data`-underlag när du är klar med omgången.

## Vad som räcker vid lokal test

- Prioritet att dölja: namn, adress, personnummer, e-post, telefon.
- Kan oftast lämnas: fakturanummer, kundnummer, belopp, datum, artiklar, momssatser.

Detta är en praktisk riskminskning för lokal utveckling — inte färdig produktsäkerhet för moln.
