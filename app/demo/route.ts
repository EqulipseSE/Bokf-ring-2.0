import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { createSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

const DEMO_EMAIL = "admin@byran.se";

export const dynamic = "force-dynamic";

/** Direktinloggning till demokontot, utan e-post och lösenord. */
export async function GET() {
  const user = await db.query.users.findFirst({
    where: eq(users.email, DEMO_EMAIL),
  });
  if (!user) {
    redirect("/logga-in");
  }

  await createSession(user.id);
  redirect("/klientforetag");
}
