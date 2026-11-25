import { readFileSync, writeFileSync } from "fs";
import path from "path";

type OcrRow = { file: string; text: string };

type Parsed = {
  file: string;
  kind: string;
  supplier: string;
  invoiceNumber: string | null;
  date: string | null;
  dueDate: string | null;
  amount: number | null;
  direction: "betala" | "erhalla" | "okand";
  bankgiro: string | null;
  notes: string[];
  refs: string[];
};

function money(raw: string): number | null {
  const cleaned = raw.replace(/\s/g, "").replace(",", ".");
  const n = Number(cleaned);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
}

function firstMatch(text: string, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const m = text.match(pattern);
    if (m?.[1]) return m[1].trim();
  }
  return null;
}

function parseAmount(text: string): { amount: number | null; direction: Parsed["direction"] } {
  const erhalla = text.match(/Att erh[aåä]lla\s+([\d\s]+[.,]\d{2})/i);
  if (erhalla) return { amount: money(erhalla[1]), direction: "erhalla" };
  const betala = text.match(
    /(?:Att betala|Summa att betala|Totalt att betala|Belopp att betala)\s*[:.]?\s*([\d\s]+[.,]\d{2})/i
  );
  if (betala) return { amount: money(betala[1]), direction: "betala" };
  const summa = text.match(/Summa\s+([\d\s]+[.,]\d{2})\s*(?:SEK|kr)?/i);
  if (summa) return { amount: money(summa[1]), direction: "okand" };
  return { amount: null, direction: "okand" };
}

function guessSupplier(text: string, file: string): string {
  if (/Svensk Travsport/i.test(text) || /^1[12]\d{8}/.test(file)) return "Svensk Travsport AB";
  if (/Karl.?Hedin/i.test(text) || /KarlHedin/i.test(file)) return "Karl Hedin";
  if (/Övermo|Overmo/i.test(text)) return "Övermo Svets & Smide AB";
  if (/Betalningsp[aå]minnelse/i.test(text) || /paminnelse/i.test(file)) {
    const m = text.match(/(?:leverantör|från|Avsändare|Fakturautställare)[:\s]+([^\n]{3,60})/i);
    return m?.[1]?.trim() || "Påminnelse (okänd leverantör)";
  }
  const lines = text.split(/\n/).map((l) => l.trim()).filter(Boolean);
  return lines[0]?.slice(0, 60) || file;
}

function parseOne(row: OcrRow): Parsed {
  const text = row.text;
  const notes: string[] = [];
  const refs: string[] = [];

  let kind = "faktura";
  if (/UTBETALNINGSBESKED/i.test(text)) kind = "utbetalningsbesked";
  else if (/Betalningsp[aå]minnelse|påminnelseavgift|paminnelse/i.test(text) || /paminnelse|pm2_/i.test(row.file)) {
    kind = "paminnelse";
  } else if (/kreditfaktura|kreditering/i.test(text) && /Att erh/i.test(text)) {
    kind = "kredit/utbetalning";
  }

  const invoiceNumber =
    firstMatch(text, [
      /Fakturanummer\s+(\d[\d\s-]*)/i,
      /Faktura(?:nr| n[rr]|nummer)?\s*[:.]?\s*(\d[\w-]*)/i,
      /Invoice\s*(?:no|number|#)?\s*[:.]?\s*([A-Za-z0-9-]+)/i,
    ]) ||
    (row.file.match(/^(\d{7,})/)?.[1] ?? null);

  const date = firstMatch(text, [
    /Fakturadatum\s+(\d{4}-\d{2}-\d{2}|\d{6}|\d{2}[./-]\d{2}[./-]\d{2,4})/i,
    /Datum\s+(\d{4}-\d{2}-\d{2}|\d{6})/i,
  ]);
  const dueDate = firstMatch(text, [
    /Förfallodatum\s+(\d{4}-\d{2}-\d{2}|\d{6}|\d{2}[./-]\d{2}[./-]\d{2,4})/i,
    /Förfaller\s+(\d{4}-\d{2}-\d{2})/i,
  ]);
  const bankgiro = firstMatch(text, [
    /Bankgiro\s*[:.]?\s*(\d{3,4}[\s-]?\d{4})/i,
    /Till bankgironr\s+(\d{3,4}-\d{4})/i,
  ]);

  const { amount, direction } = parseAmount(text);

  // References to original invoices on reminders
  for (const m of text.matchAll(
    /(?:faktura|avi|ref(?:erens)?|gäller|avser)\s*(?:nr|n[rr]|nummer)?\s*[:.]?\s*([A-Za-z0-9-]{3,})/gi
  )) {
    refs.push(m[1]);
  }
  for (const m of text.matchAll(/\b(18\d{2}|Faktura\s*\d+|812|1877602)\b/gi)) {
    refs.push(m[1].replace(/\s+/g, ""));
  }

  if (kind === "utbetalningsbesked") {
    notes.push("INGEN betalning ut — pengar TO company (Att erhålla)");
  }
  if (kind === "paminnelse") {
    notes.push("Kontrollera att originalfakturan inte också betalas");
  }

  return {
    file: row.file,
    kind,
    supplier: guessSupplier(text, row.file),
    invoiceNumber: invoiceNumber?.replace(/\s+/g, "") ?? null,
    date,
    dueDate,
    amount,
    direction: kind === "utbetalningsbesked" ? "erhalla" : direction,
    bankgiro,
    notes,
    refs: [...new Set(refs)],
  };
}

function main() {
  const jsonPath = process.argv[2];
  if (!jsonPath) throw new Error("Ange _all.json");
  const rows = JSON.parse(readFileSync(jsonPath, "utf8")) as OcrRow[];

  // Merge multipage: keep p1 as primary, append p2+ text into same logical doc by base name
  const byBase = new Map<string, OcrRow>();
  for (const row of rows) {
    const base = row.file.replace(/-p\d+\.jpg$/i, ".jpg").replace(/\.jpg$/i, "");
    const existing = byBase.get(base);
    if (!existing) byBase.set(base, { file: `${base}.jpg`, text: row.text });
    else existing.text += "\n" + row.text;
  }

  const parsed = [...byBase.values()].map(parseOne);

  const pay = parsed.filter((p) => p.direction === "betala" || (p.kind === "paminnelse" && p.amount != null));
  const receive = parsed.filter((p) => p.direction === "erhalla");
  const unclear = parsed.filter((p) => p.direction === "okand" && p.kind !== "paminnelse");

  const travsportPay = pay.filter((p) => /Travsport/i.test(p.supplier));
  const travsportRecv = receive.filter((p) => /Travsport/i.test(p.supplier));
  const reminders = parsed.filter((p) => p.kind === "paminnelse");

  // Duplicate invoice numbers among payables
  const byInv = new Map<string, Parsed[]>();
  for (const p of pay) {
    if (!p.invoiceNumber) continue;
    const list = byInv.get(p.invoiceNumber) ?? [];
    list.push(p);
    byInv.set(p.invoiceNumber, list);
  }
  const dupInvoices = [...byInv.entries()].filter(([, list]) => list.length > 1);

  // Reminder vs original: same amount+supplier or shared refs
  const reminderRisks: string[] = [];
  for (const rem of reminders) {
    for (const p of pay) {
      if (p.file === rem.file) continue;
      const sameAmount =
        rem.amount != null && p.amount != null && Math.abs(rem.amount - p.amount) < 0.02;
      const sharedRef =
        rem.invoiceNumber &&
        (p.invoiceNumber === rem.invoiceNumber ||
          rem.refs.some((r) => r === p.invoiceNumber || p.file.includes(r)));
      const refHit = rem.refs.some(
        (r) => p.invoiceNumber?.includes(r) || p.file.toLowerCase().includes(r.toLowerCase())
      );
      if (sameAmount || sharedRef || refHit) {
        reminderRisks.push(
          `${rem.file} (${rem.amount ?? "?"}) kan hör ihop med ${p.file} (${p.invoiceNumber ?? p.file}, ${p.amount ?? "?"})`
        );
      }
    }
  }

  const dates = parsed
    .map((p) => p.date)
    .filter((d): d is string => Boolean(d))
    .map((d) => {
      if (/^\d{6}$/.test(d)) {
        const yy = d.slice(0, 2);
        const mm = d.slice(2, 4);
        const dd = d.slice(4, 6);
        return `20${yy}-${mm}-${dd}`;
      }
      return d;
    })
    .sort();

  const lines: string[] = [];
  lines.push("# Underlag för Enable Banking / kontoutdrag");
  lines.push("");
  lines.push("Genererat från OCR av JPG i Underlag Omnio/jpg.");
  lines.push("");
  lines.push("## Föreslagen hämtperiod");
  if (dates.length) {
    lines.push(`- Tidigaste dokumentdatum i OCR: **${dates[0]}**`);
    lines.push(`- Senaste dokumentdatum i OCR: **${dates[dates.length - 1]}**`);
    lines.push(
      `- Rekommendation: hämta kontoutdrag **${dates[0]} – ${dates[dates.length - 1]}** (eller lite marginal före/efter).`
    );
  } else {
    lines.push("- Kunde inte läsa datum säkert — hämta åtminstone juli–november 2026 utifrån filnamn.");
  }
  lines.push("");
  lines.push("## Viktigt: betala inte dubbelt");
  lines.push("");
  lines.push("### Svensk Travsport");
  lines.push(
    `- **Utbetalningsbesked** (${travsportRecv.length} st): pengar *till* er — ska **inte** betalas. Matchas som inbetalning på kontot.`
  );
  for (const p of travsportRecv) {
    lines.push(
      `  - ${p.file}: ${p.invoiceNumber ?? "?"} / ${p.amount ?? "?"} kr (${p.date ?? "datum?"})`
    );
  }
  lines.push(`- **Fakturor att betala** (${travsportPay.length} st): bankgiro **5326-0527**`);
  for (const p of travsportPay) {
    lines.push(
      `  - ${p.file}: ${p.invoiceNumber ?? "?"} / ${p.amount ?? "?"} kr (${p.date ?? "datum?"} → ${p.dueDate ?? "förfall?"})`
    );
  }
  lines.push("");
  lines.push("### Påminnelser");
  if (reminders.length === 0) lines.push("- Inga påminnelser hittades.");
  for (const p of reminders) {
    lines.push(
      `- ${p.file}: ${p.supplier} / ${p.invoiceNumber ?? "?"} / ${p.amount ?? "?"} kr — refs: ${p.refs.join(", ") || "inga tydliga"}`
    );
  }
  if (reminderRisks.length) {
    lines.push("");
    lines.push("**Möjliga dubbletter påminnelse ↔ faktura:**");
    for (const risk of [...new Set(reminderRisks)]) lines.push(`- ${risk}`);
  }
  lines.push("");
  if (dupInvoices.length) {
    lines.push("### Samma fakturanummer i flera filer");
    for (const [num, list] of dupInvoices) {
      lines.push(`- ${num}: ${list.map((p) => p.file).join(", ")}`);
    }
    lines.push("");
  }

  lines.push("## Att betala (förväntade utgående betalningar)");
  lines.push("");
  lines.push("| Fil | Leverantör | Fakturanr | Belopp | Förfaller | BG |");
  lines.push("|-----|------------|-----------|--------|-----------|-----|");
  const paySorted = [...pay].sort((a, b) => (a.dueDate ?? a.date ?? "").localeCompare(b.dueDate ?? b.date ?? ""));
  for (const p of paySorted) {
    if (p.kind === "utbetalningsbesked") continue;
    lines.push(
      `| ${p.file} | ${p.supplier.replace(/\|/g, "/")} | ${p.invoiceNumber ?? ""} | ${p.amount ?? ""} | ${p.dueDate ?? ""} | ${p.bankgiro ?? ""} |`
    );
  }

  lines.push("");
  lines.push("## Att erhålla / krediter (förväntade inbetalningar)");
  lines.push("");
  for (const p of receive) {
    lines.push(`- ${p.file}: ${p.supplier} ${p.invoiceNumber ?? ""} ${p.amount ?? "?"} kr`);
  }

  lines.push("");
  lines.push("## Oklara (kolla manuellt)");
  for (const p of unclear) {
    lines.push(`- ${p.file}: ${p.supplier} / ${p.amount ?? "belopp?"} / ${p.kind}`);
  }

  lines.push("");
  lines.push("## Enable Banking — praktiskt");
  lines.push("1. Koppla bankkontot i Omnio (Enable Banking).");
  lines.push("2. Hämta kontoutdrag för perioden ovan.");
  lines.push("3. Matcha utgående mot tabellen Att betala.");
  lines.push("4. Matcha Travsport-utbetalningsbesked mot inkommande.");
  lines.push("5. Påminnelser: betala bara om originalet inte redan syns som betalt.");

  const outMd = path.join(path.dirname(jsonPath), "enablebanking-underlag.md");
  const outJson = path.join(path.dirname(jsonPath), "enablebanking-underlag.json");
  writeFileSync(outMd, lines.join("\n"), "utf8");
  writeFileSync(outJson, JSON.stringify({ parsed, pay, receive, reminders }, null, 2), "utf8");
  console.log(lines.join("\n"));
  console.log(`\nSkrev ${outMd}`);
}

main();
