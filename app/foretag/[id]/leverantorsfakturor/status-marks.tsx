function Mark({
  letter,
  label,
  className,
}: {
  letter: string;
  label: string;
  className: string;
}) {
  return (
    <span className="group relative inline-flex">
      <span
        className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${className}`}
      >
        {letter}
      </span>
      <span className="pointer-events-none absolute top-full left-1/2 z-20 mt-1 hidden -translate-x-1/2 whitespace-nowrap rounded bg-neutral-900 px-2 py-1 text-xs font-normal text-white group-hover:block">
        {label}
      </span>
    </span>
  );
}

export function InvoiceStatusMarks({
  preliminary,
  approved,
  bookedInK,
  bookedInA,
}: {
  preliminary: boolean;
  approved: boolean;
  bookedInK: boolean;
  bookedInA: boolean;
}) {
  const booked = bookedInK || bookedInA;
  return (
    <span className="inline-flex items-center gap-1">
      {!booked && preliminary ? <Mark letter="P" label="Preliminär" className="bg-neutral-300 text-neutral-700" /> : null}
      {!booked && approved ? <Mark letter="G" label="Godkänd" className="bg-sky-600 text-white" /> : null}
      {bookedInK ? <Mark letter="L" label="Bokförd i L-serien" className="bg-emerald-600 text-white" /> : null}
      {bookedInA ? <Mark letter="B" label="Bokförd betalning" className="bg-emerald-600 text-white" /> : null}
    </span>
  );
}
