"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { beginBankLink } from "@/lib/bank-sync";

function redirectUrlFromRequest(): string {
  return (
    process.env.ENABLE_BANKING_REDIRECT_URL?.trim() ||
    "http://localhost:3000/bank/callback"
  );
}

export async function startBankConnection(companyId: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/logga-in");
  const result = await beginBankLink(companyId, redirectUrlFromRequest());
  if (!result.ok) {
    redirect(`/klientforetag?bankfel=${encodeURIComponent(result.error)}`);
  }
  redirect(result.url);
}
