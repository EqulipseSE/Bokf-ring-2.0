import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { devLogin } from "./actions";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Logga in — Omnio",
};

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/klientforetag");

  return (
    <main className="flex flex-1 items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-lg">
        <div className="mb-10 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
            Omnio
          </h1>
          <p className="mt-2 text-sm text-neutral-500">
            Logga in med ditt byråkonto
          </p>
        </div>
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1 rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
            <LoginForm />
          </div>
          {process.env.NODE_ENV === "development" && (
            <form action={devLogin}>
              <button
                type="submit"
                className="rounded-lg border border-dashed border-neutral-300 bg-white px-3 py-2 text-xs font-medium text-neutral-600 transition hover:border-neutral-400 hover:text-neutral-900"
              >
                Tillfällig inloggning
              </button>
            </form>
          )}
        </div>
        <p className="mt-6 text-center text-xs text-neutral-400">
          Konton skapas av byråns administratör.
        </p>
      </div>
    </main>
  );
}
