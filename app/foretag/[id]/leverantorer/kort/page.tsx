import type { Metadata } from "next";

export const metadata: Metadata = { title: "Leverantör" };

export default function LeverantorKortPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <p className="text-sm text-neutral-500">Kortvyn kommer i nästa steg.</p>
    </main>
  );
}
