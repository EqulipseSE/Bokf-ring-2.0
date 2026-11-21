export function UnderlagSection({ title }: { title: string }) {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
        {title}
      </h1>
      <p className="mt-2 text-sm text-neutral-500">
        Innehållet kommer i nästa steg.
      </p>
    </main>
  );
}
