import Link from "next/link";
import { logout } from "@/app/logga-in/actions";

export function AppHeader({ userName }: { userName: string }) {
  return (
    <header className="flex items-center justify-between border-b border-neutral-200 bg-white px-6 py-4">
      <Link
        href="/klientforetag"
        className="font-semibold tracking-tight text-neutral-900"
      >
        Omnio
      </Link>
      <div className="flex items-center gap-4">
        <span className="text-sm text-neutral-500">{userName}</span>
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
  );
}
