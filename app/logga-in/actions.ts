"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { createSession, destroySession } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { DUMMY_HASH, verifyPassword } from "@/lib/password";

export type LoginState = { error: string } | null;

export async function login(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Fyll i både e-postadress och lösenord." };
  }

  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  // Kör alltid en lösenordsjämförelse så att svarstiden inte avslöjar
  // om e-postadressen finns.
  const valid = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);

  if (!user || !valid) {
    return { error: "Fel e-postadress eller lösenord." };
  }

  await createSession(user.id);
  redirect("/klientforetag");
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect("/logga-in");
}
