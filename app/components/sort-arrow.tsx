export function SortArrow({ ascending }: { ascending: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 12 12"
      className="h-3 w-3"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {ascending ? (
        <path d="M6 9.5V2.5M3.5 5 6 2.5 8.5 5" />
      ) : (
        <path d="M6 2.5v7M3.5 7 6 9.5 8.5 7" />
      )}
    </svg>
  );
}
