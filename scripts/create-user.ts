/**
 * Skapar en användare (byråmedarbetare). Det finns ingen öppen registrering —
 * alla konton skapas med detta script.
 *
 * Användning:
 *   DATABASE_URL=postgres://... pnpm create-user <e-post> <namn> <lösenord>
 *
 * Exempel:
 *   pnpm create-user anna@byran.se "Anna Andersson" hemligt-lösenord
 */
import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import { users } from "../lib/db/schema";
import { hashPassword } from "../lib/password";

async function main() {
  const [email, name, password] = process.argv.slice(2);

  if (!email || !name || !password) {
    console.error(
      "Användning: pnpm create-user <e-post> <namn> <lösenord>"
    );
    process.exit(1);
  }

  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail.includes("@")) {
    console.error(`Ogiltig e-postadress: ${email}`);
    process.exit(1);
  }

  if (password.length < 8) {
    console.error("Lösenordet måste vara minst 8 tecken.");
    process.exit(1);
  }

  const existing = await db.query.users.findFirst({
    where: eq(users.email, normalizedEmail),
  });

  if (existing) {
    console.error(`Det finns redan en användare med e-post ${normalizedEmail}.`);
    process.exit(1);
  }

  const passwordHash = await hashPassword(password);
  const [user] = await db
    .insert(users)
    .values({ email: normalizedEmail, name: name.trim(), passwordHash })
    .returning();

  console.log(`Användare skapad: ${user.name} <${user.email}> (id: ${user.id})`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
