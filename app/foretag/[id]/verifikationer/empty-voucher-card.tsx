"use client";

import Link from "next/link";
import { useEffect } from "react";
import { setCardTarget } from "./voucher-draft";

export function EmptyVoucherCard({ companyId }: { companyId: string }) {
  const nyHref = `/foretag/${companyId}/verifikationer/ny`;

  useEffect(() => {
    setCardTarget(companyId, { kind: "empty" });
  }, [companyId]);

  return (
    <div className="mx-auto w-full max-w-7xl flex-1 px-6 py-8">
      <h1 className="text-xl font-semibold tracking-tight text-neutral-900">
        Verifikation
      </h1>
      <p className="mt-1 text-sm text-neutral-500">
        Ingen verifikation att visa ännu.
      </p>
      <div className="mt-6 border border-dashed border-neutral-300 bg-white px-6 py-16 text-center">
        <p className="font-medium text-neutral-900">Kortvyn är tom</p>
        <p className="mt-1 text-sm text-neutral-500">
          Registrera en verifikation för att se den här, eller öppna en från
          listan.
        </p>
        <Link
          href={nyHref}
          onClick={() => setCardTarget(companyId, { kind: "draft" })}
          className="mt-6 inline-block rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-700"
        >
          Ny verifikation
        </Link>
      </div>
    </div>
  );
}
