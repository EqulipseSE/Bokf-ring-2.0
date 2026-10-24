import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { logout } from "@/app/logga-in/actions";

export const metadata: Metadata = {
  title: "Klientföretag — Bokföring 2.0",
};

export default async function KlientforetagPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/logga-in");

  return (
    <div className="flex flex-1 flex-col bg-neutral-50">
      <header className="flex items-center justify-between border-b border-neutral-200 bg-white px-6 py-4">
        <span className="font-semibold tracking-tight text-neutral-900">
          Bokföring 2.0
        </span>
        <div className="flex items-center gap-4">
          <span className="text-sm text-neutral-500">{user.name}</span>
          <form action={logout}>
            <button
              type="submit"
              className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100"
            >
              Logga ut
            </button>
          </form>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-neutral-900">
            Klientföretag
          </h1>
          <p className="mt-3 text-neutral-500">
            Här kommer byråns klientföretag att visas. Innehållet är på väg.
          </p>
        </div>
      </main>
    </div>
  );
}
