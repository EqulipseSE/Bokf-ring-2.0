/**
 * Svensk momsdeklaration (SKV 4698-struktur).
 * Rutorna summeras från bokförda verifikationsrader via momskod + kontotyp.
 *
 * Momskonto (26xx) bär momssatsen; övriga konton bär underlaget.
 * Bara uppenbara kopplingar — saknas tydlig ruta lämnas raden utanför.
 */

export const VAT_BOX_IDS = [
  "05",
  "06",
  "07",
  "08",
  "10",
  "11",
  "12",
  "20",
  "21",
  "22",
  "23",
  "24",
  "30",
  "31",
  "32",
  "35",
  "36",
  "37",
  "38",
  "39",
  "40",
  "41",
  "42",
  "48",
  "49",
  "50",
  "60",
  "61",
  "62",
] as const;

export type VatBoxId = (typeof VAT_BOX_IDS)[number];

export type VatBoxSection = {
  id: string;
  title: string;
  boxes: readonly VatBoxId[];
};

export const VAT_BOX_SECTIONS: readonly VatBoxSection[] = [
  {
    id: "A",
    title: "A. Momspliktig försäljning eller uttag exklusive moms",
    boxes: ["05", "06", "07", "08"],
  },
  {
    id: "B",
    title: "B. Utgående moms på försäljning i ruta 05–08",
    boxes: ["10", "11", "12"],
  },
  {
    id: "C",
    title: "C. Inköp av varor och tjänster där köparen är skattskyldig",
    boxes: ["20", "21", "22", "23", "24"],
  },
  {
    id: "D",
    title: "D. Utgående moms på inköp i ruta 20–24",
    boxes: ["30", "31", "32"],
  },
  {
    id: "E",
    title: "E. Försäljning m.m. som är undantagen från moms",
    boxes: ["35", "36", "37", "38", "39", "40", "41", "42"],
  },
  {
    id: "F",
    title: "F. Ingående moms",
    boxes: ["48"],
  },
  {
    id: "G",
    title: "G. Moms att betala eller få tillbaka",
    boxes: ["49"],
  },
  {
    id: "H",
    title: "H. Import av varor",
    boxes: ["50", "60", "61", "62"],
  },
];

export const VAT_BOX_LABELS: Record<VatBoxId, string> = {
  "05": "Momspliktig försäljning som inte ingår i ruta 06, 07 eller 08",
  "06": "Momspliktig försäljning 12 %",
  "07": "Momspliktig försäljning 6 %",
  "08": "Hyresinkomster vid frivillig skattskyldighet",
  "10": "Utgående moms 25 %",
  "11": "Utgående moms 12 %",
  "12": "Utgående moms 6 %",
  "20": "Inköp av varor från annat EU-land",
  "21": "Inköp av tjänster från annat EU-land enligt huvudregeln",
  "22": "Inköp av tjänster från länder utanför EU",
  "23": "Inköp av varor i Sverige",
  "24": "Övriga inköp av varor och tjänster",
  "30": "Utgående moms 25 %",
  "31": "Utgående moms 12 %",
  "32": "Utgående moms 6 %",
  "35": "Försäljning av varor till annat EU-land",
  "36": "Försäljning av varor utanför EU",
  "37": "Mellanmans försäljning av varor till annat EU-land",
  "38": "Försäljning av tjänster till näringsidkare i annat EU-land enligt huvudregeln",
  "39": "Försäljning av tjänster utanför EU och till andra än näringsidkare i EU",
  "40": "Försäljning där köparen är skattskyldig i Sverige",
  "41": "Övrig försäljning m.m.",
  "42": "Omsättning vid vinstmarginalbeskattning",
  "48": "Ingående moms att dra av",
  "49": "Moms att betala eller få tillbaka",
  "50": "Beskattningsunderlag vid import",
  "60": "Utgående moms 25 %",
  "61": "Utgående moms 12 %",
  "62": "Utgående moms 6 %",
};

export const VAT_OUTGOING_BOXES: readonly VatBoxId[] = [
  "10",
  "11",
  "12",
  "30",
  "31",
  "32",
  "60",
  "61",
  "62",
];

export type VatPeriodKind = "manad" | "kvartal" | "ar";

export type VatPeriod = {
  kind: VatPeriodKind;
  year: number;
  number: number;
  from: string;
  to: string;
  label: string;
};

export type VatDeclarationLine = {
  vatCode: string | null;
  accountNumber: string;
  debit: number;
  credit: number;
};

export type VatBoxContribution = {
  box: VatBoxId;
  ore: number;
};

export const MONTH_NAMES = [
  "januari",
  "februari",
  "mars",
  "april",
  "maj",
  "juni",
  "juli",
  "augusti",
  "september",
  "oktober",
  "november",
  "december",
] as const;

const QUARTER_MONTHS = [
  [1, 3],
  [4, 6],
  [7, 9],
  [10, 12],
] as const;

export function isVatAccountNumber(number: string): boolean {
  return number.startsWith("26");
}

export function emptyVatBoxes(): Record<VatBoxId, number> {
  const boxes = {} as Record<VatBoxId, number>;
  for (const id of VAT_BOX_IDS) boxes[id] = 0;
  return boxes;
}

export function vatToPayOre(boxes: Record<VatBoxId, number>): number {
  let outgoing = 0;
  for (const id of VAT_OUTGOING_BOXES) outgoing += boxes[id];
  return outgoing - boxes["48"];
}

/** Momskonto 26xx → momsruta; övriga konton → underlagsruta. */
export function lineContributions(
  line: VatDeclarationLine
): VatBoxContribution[] {
  const code = line.vatCode?.trim() ?? "";
  if (!code) return [];

  const vatAccount = isVatAccountNumber(line.accountNumber);
  const sales = line.credit - line.debit;
  const purchase = line.debit - line.credit;
  const outgoingVat = line.credit - line.debit;
  const incomingVat = line.debit - line.credit;

  switch (code) {
    case "U25":
      return vatAccount
        ? [{ box: "10", ore: outgoingVat }]
        : [{ box: "05", ore: sales }];
    case "U12":
      return vatAccount
        ? [{ box: "11", ore: outgoingVat }]
        : [{ box: "06", ore: sales }];
    case "U6":
      return vatAccount
        ? [{ box: "12", ore: outgoingVat }]
        : [{ box: "07", ore: sales }];
    case "I25":
    case "I12":
    case "I6":
      return vatAccount ? [{ box: "48", ore: incomingVat }] : [];
    case "MF":
      return vatAccount ? [] : [{ box: "41", ore: sales }];
    case "UEU":
      return vatAccount ? [] : [{ box: "35", ore: sales }];
    case "IEU":
      return vatAccount ? [] : [{ box: "20", ore: purchase }];
    case "UOS":
      return vatAccount
        ? [{ box: "30", ore: outgoingVat }]
        : [{ box: "40", ore: sales }];
    case "IOS":
      return vatAccount
        ? [{ box: "48", ore: incomingVat }]
        : [{ box: "24", ore: purchase }];
    default:
      return [];
  }
}

export function sumVatBoxes(
  lines: readonly VatDeclarationLine[]
): Record<VatBoxId, number> {
  const boxes = emptyVatBoxes();
  for (const line of lines) {
    for (const { box, ore } of lineContributions(line)) {
      if (box === "49") continue;
      boxes[box] += ore;
    }
  }
  boxes["49"] = vatToPayOre(boxes);
  return boxes;
}

export function lastDayOfMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function isoDate(year: number, month: number, day: number): string {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

export function parseIsoDateParts(
  iso: string
): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > lastDayOfMonth(year, month)) {
    return null;
  }
  return { year, month, day };
}

export function buildVatPeriod(
  kind: VatPeriodKind,
  year: number,
  number: number
): VatPeriod {
  if (kind === "ar") {
    return {
      kind,
      year,
      number: 1,
      from: isoDate(year, 1, 1),
      to: isoDate(year, 12, 31),
      label: `år ${year}`,
    };
  }
  if (kind === "kvartal") {
    const quarter = clampInt(number, 1, 4);
    const [startMonth, endMonth] = QUARTER_MONTHS[quarter - 1];
    const startName = MONTH_NAMES[startMonth - 1].slice(0, 3);
    const endName = MONTH_NAMES[endMonth - 1].slice(0, 3);
    return {
      kind,
      year,
      number: quarter,
      from: isoDate(year, startMonth, 1),
      to: isoDate(year, endMonth, lastDayOfMonth(year, endMonth)),
      label: `kvartal ${quarter} ${year} (${startName}–${endName})`,
    };
  }
  const month = clampInt(number, 1, 12);
  return {
    kind: "manad",
    year,
    number: month,
    from: isoDate(year, month, 1),
    to: isoDate(year, month, lastDayOfMonth(year, month)),
    label: `${MONTH_NAMES[month - 1]} ${year}`,
  };
}

export type VatPeriodQuery = {
  typ?: string | string[];
  ar?: string | string[];
  nr?: string | string[];
};

export function parseVatPeriod(
  query: VatPeriodQuery,
  todayIso: string
): VatPeriod {
  const today = parseIsoDateParts(todayIso) ?? { year: 2026, month: 10, day: 1 };
  const kind = parsePeriodKind(firstQuery(query.typ)) ?? "manad";
  const year = parseYear(firstQuery(query.ar)) ?? today.year;
  const rawNumber = parsePositiveInt(firstQuery(query.nr));

  if (kind === "ar") return buildVatPeriod("ar", year, 1);
  if (kind === "kvartal") {
    const quarter = rawNumber ?? Math.ceil(today.month / 3);
    return buildVatPeriod("kvartal", year, quarter);
  }
  return buildVatPeriod("manad", year, rawNumber ?? today.month);
}

export function periodQueryString(period: VatPeriod): string {
  const params = new URLSearchParams({
    typ: period.kind,
    ar: String(period.year),
    nr: String(period.number),
  });
  return params.toString();
}

export function availableYears(todayIso: string, extraYears: number[] = []): number[] {
  const today = parseIsoDateParts(todayIso) ?? { year: 2026, month: 1, day: 1 };
  const years = new Set<number>();
  for (let year = today.year - 6; year <= today.year + 1; year++) {
    years.add(year);
  }
  for (const year of extraYears) {
    if (year >= 1990 && year <= 2100) years.add(year);
  }
  return [...years].sort((a, b) => a - b);
}

function parsePeriodKind(value: string | undefined): VatPeriodKind | null {
  if (value === "manad" || value === "kvartal" || value === "ar") return value;
  return null;
}

function firstQuery(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function parseYear(value: string | undefined): number | null {
  const year = parsePositiveInt(value);
  if (year == null || year < 1990 || year > 2100) return null;
  return year;
}

function parsePositiveInt(value: string | undefined): number | null {
  if (!value) return null;
  if (!/^\d+$/.test(value)) return null;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) return null;
  return n;
}

function clampInt(value: number, min: number, max: number): number {
  if (!Number.isInteger(value)) return min;
  return Math.min(max, Math.max(min, value));
}
