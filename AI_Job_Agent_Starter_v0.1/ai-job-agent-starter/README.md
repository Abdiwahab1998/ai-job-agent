# AI Job Agent – Starter (v0.1)

En lärande fullstackprototyp för yrkesöverskridande jobbsökning och ATS-vänlig CV-anpassning.

## Vad fungerar redan?
- Hämta **riktiga annonser** via Arbetsförmedlingens JobSearch API.
- Sök på yrke och ort, välj en annons.
- Klistra in CV-text och få en **enkel nyckelordsjämförelse** mot annonsen.
- Skapa ett professionellt **mejlutkast** till rekryterare.

> Viktigt: Ingen AI används i denna version. Nyckelordspoängen är **inte** ett godkännande från ATS. Appen skickar **inga ansökningar eller mejl**. Den lagrar inte personuppgifter ännu. Klistra inte in känsliga personuppgifter i en publik demo.

## Krav
- Node.js 22+
- npm

## Starta lokalt
```bash
npm run install:all
npm run dev
```
Öppna http://localhost:5173. API: http://localhost:3001/api/health.

## Bygg och testa
```bash
npm run build
```
Testa sedan sökning och CV-analys manuellt. Internet krävs för riktiga jobbresultat.

## Struktur
```
client/          React, TypeScript och Vite
server/          Express API och JobSearch-integration
```

## Planerade versioner
- **v0.2** Databas (PostgreSQL/Prisma), användarkonton, säker CV-profil och PDF-export.
- **v0.3** Jobbmatchning och AI-assisterad omskrivning utan uppdiktade meriter.
- **v0.4** Förhandsgranskad ansökningskö, adapter för tillåtna ansöknings-API:er, per-jobb status och idempotens.
- **v0.5** Gmail OAuth med minsta behörighet, verifierade kontakter, utskicksregler och loggar.
- **v1.0** Schemalagd agent med förhandsgodkända regler, undantagsgranskning, säkerhetstester och GDPR-flöden.

## Viktiga tekniska principer
1. Ansök bara genom godkända integrationsgränssnitt. Kräv faktiska bekräftelser från mottagande system.
2. Ingen automatisk mejlsändning utan användarens medgivande, korrekta kontaktuppgifter och begränsningar.
3. Stoppa om kvalifikationer eller urvalsfrågor är okända. Hitta aldrig på fakta.
4. Skydda CV och kontaktdata. När en databas införs krävs behörighetskontroller, säker lagring och raderingsrutiner.
5. Lägg aldrig API-nycklar, OAuth-token eller hemliga värden på GitHub.

## GitHub
Skapa ett nytt tomt repository (t.ex. `ai-job-agent`). I projektmappen:
```bash
git init
git add .
git commit -m "feat: initial job search and CV matching prototype"
git branch -M main
git remote add origin https://github.com/DITT_ANVANDARNAMN/ai-job-agent.git
git push -u origin main
```
Byt ut `DITT_ANVANDARNAMN` till ditt riktiga GitHub-namn. Skapa repot först på GitHub.

## Resurser
- https://jobsearch.api.jobtechdev.se/
- https://docs.greenhouse.io/job-board
- https://github.com/lever/postings-api
- https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/send
