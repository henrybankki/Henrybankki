# HenryBankki

Osuuspankki-tyylinen demopankkisovellus (React + Firebase). Sisältää:
- Email/pw kirjautuminen
- Admin-rooli
- Laskujen luonti viitenumerolla (admin)
- Laskujen maksaminen (käyttäjä)
- Sijoitussivu reaaliaikaisella käyrällä (25 FI + 10 krypto), päivitys 5s välein

> Demo. Ei oikeaa rahaa.

## Käyttöönotto

```bash
git clone <YOUR-REPO-URL> henrybankki
cd henrybankki
cp .env.example .env.local   # tai .env
# muokkaa tarvittaessa env-arvot
npm install
npm run dev
```

## Admin

Luo Firebase Consolessa käyttäjä (esim. admin@henrybankki.dev), lisää Firestoressa:
- role: "admin"
- customerNumber: "011100"

## Render Deploy

Build command: `npm install && npm run build`  
Publish dir: `dist`  
Lisää kaikki VITE_FIREBASE_* env-muuttujat Renderiin.

Lisäohjeet: katso projektitiedostot.

