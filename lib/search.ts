/** Case-insensitive contains, svenska locale. Tom fråga matchar allt. */
export function matchesQuery(
  values: Array<string | number>,
  query: string
): boolean {
  const q = query.trim().toLocaleLowerCase("sv");
  if (!q) return true;
  return values.some((value) =>
    String(value).toLocaleLowerCase("sv").includes(q)
  );
}
