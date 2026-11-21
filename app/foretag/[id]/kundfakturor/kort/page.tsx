import type { Metadata } from "next";

export const metadata: Metadata = { title: "Kundfaktura" };

export default function KundfakturaKortPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
        Kundfaktura
      </h1>
      <p className="mt-2 text-sm text-neutral-500">
        Kortvyn kommer i nästa steg.
      </p>
    </main>
  );
}
