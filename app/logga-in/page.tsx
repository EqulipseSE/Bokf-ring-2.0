import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Logga in — Omnio",
};

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/klientforetag");

  return (
    <main className="flex flex-1 items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
            Omnio
          </h1>
          <p className="mt-2 text-sm text-neutral-500">
            Logga in med ditt byråkonto
          </p>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
          <LoginForm />
        </div>
        <p className="mt-6 text-center text-xs text-neutral-400">
          Konton skapas av byråns administratör.
        </p>
      </div>
    </main>
  );
}
