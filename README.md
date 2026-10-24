# Omnio

Minimalistiskt webbaserat bokföringsprogram för intern användning på redovisningsbyrån.
Detta är **etapp 0**: projektgrund och inloggning. Bokföringsfunktionerna kommer i senare steg.

## Stack

- [Next.js](https://nextjs.org) (App Router) + TypeScript
- [Drizzle ORM](https://orm.drizzle.team) mot PostgreSQL
- Tailwind CSS
- Egen sessionshantering: httpOnly-cookie med slumpmässig token, hashade lösenord (bcrypt)

## Kom igång lokalt

Krav: Node 22+, pnpm och en PostgreSQL-databas (lokal installation eller Docker).

```bash
# 1. Installera beroenden
pnpm install

# 2. Starta Postgres, t.ex. med Docker:
docker run -d --name bokforing-db -p 5432:5432 \
  -e POSTGRES_USER=bokforing -e POSTGRES_PASSWORD=bokforing -e POSTGRES_DB=bokforing \
  postgres:16

# 3. Skapa .env utifrån mallen
cp .env.example .env

# 4. Kör databasmigrationerna
pnpm db:migrate

# 5. Skapa första användaren (se nedan)
pnpm create-user admin@byran.se "Anna Andersson" valfritt-lösenord

# 6. Starta utvecklingsservern
pnpm dev
```

Öppna [http://localhost:3000](http://localhost:3000) och logga in.

## Användare och inloggning

Det finns **ingen öppen registrering**. Alla konton (byråns medarbetare) skapas från
kommandoraden:

```bash
pnpm create-user <e-post> <namn> <lösenord>
```

Scriptet läser `DATABASE_URL` från `.env` (eller miljön), hashar lösenordet med bcrypt
och lägger in användaren. Kör det en gång per medarbetare. För produktionsdatabasen:

```bash
DATABASE_URL="postgresql://...neon..." pnpm create-user anna@byran.se "Anna Andersson" starkt-lösenord
```

Sessioner lagras i databasen (endast en SHA-256-hash av token) och i webbläsaren som
en httpOnly-cookie som gäller i 30 dagar med glidande förlängning. Utloggning tar bort
sessionen både i databasen och i webbläsaren.

## Databasändringar

Schemat definieras i `lib/db/schema.ts`. Vid ändringar:

```bash
pnpm db:generate   # genererar SQL-migration i drizzle/
pnpm db:migrate    # kör migrationerna mot DATABASE_URL
```

Migrationsfilerna checkas in i git.

## Driftsättning gratis: Neon + Vercel

Hela driften ryms i gratisnivåerna hos [Neon](https://neon.tech) (Postgres) och
[Vercel](https://vercel.com) (hosting).

1. **Neon:** Skapa ett konto på neon.tech och ett nytt projekt (region t.ex.
   Frankfurt). Kopiera **Connection string** (pooled) från projektets startsida.
2. **Migrera och skapa användare** från din dator:

   ```bash
   DATABASE_URL="<neon-connection-string>" pnpm db:migrate
   DATABASE_URL="<neon-connection-string>" pnpm create-user admin@byran.se "Ditt Namn" starkt-lösenord
   ```

3. **Vercel:** Skapa ett konto på vercel.com, välj **Add New → Project** och importera
   detta GitHub-repo. Lägg till miljövariabeln `DATABASE_URL` med Neon-strängen under
   **Settings → Environment Variables** (eller direkt i importflödet) och klicka
   **Deploy**.
4. Klart — appen ligger öppet på `https://<projekt>.vercel.app`. Varje push till `main`
   deployas automatiskt. Nya migrationer körs manuellt med `pnpm db:migrate` mot
   Neon-strängen innan (eller strax efter) deploy.
