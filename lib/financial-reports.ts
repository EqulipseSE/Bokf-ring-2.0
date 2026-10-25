/**
 * Svensk balans- och resultatrapport från bokförda verifikationsrader.
 *
 * Saldo i råform är debet − kredit (öre). Visningen vänder tecken för
 * kreditkonton (klass 2 och 3) så att tillgångar, skulder, intäkter och
 * kostnader blir positiva i sin naturliga riktning.
 *
 * IB = IB-verifikationer (isOpening) + löpande före perioden.
 * Period = löpande i vald period.
 * UB = IB + period.
 * Resultatets ackumulerade kolumn = IB på resultaträkningen + löpande
 * från kalenderårets början t.o.m. periodens slut.
 */

export type AccountMovement = {
  number: string;
  name: string;
  /** Debet − kredit, öre. */
  openingOre: number;
  periodOre: number;
  closingOre: number;
  ytdOre: number;
};

export type ReportAccountRow = {
  number: string;
  name: string;
  openingOre: number;
  periodOre: number;
  closingOre: number;
};

export type ReportGroup = {
  code: string;
  title: string;
  accounts: ReportAccountRow[];
  openingOre: number;
  periodOre: number;
  closingOre: number;
};

export type ReportBlock = {
  id: string;
  title: string;
  groups: ReportGroup[];
  openingOre: number;
  periodOre: number;
  closingOre: number;
};

export type AmountTriple = {
  openingOre: number;
  periodOre: number;
  closingOre: number;
};

export type BalanceReport = {
  assets: ReportBlock;
  equityAndLiabilities: ReportBlock;
  calculatedResult: AmountTriple;
  balanced: boolean;
};

export type IncomeReport = {
  income: ReportBlock;
  expenses: ReportBlock;
  result: { periodOre: number; ytdOre: number };
};

export const BALANS_GROUP_TITLES: Record<string, string> = {
  "10": "Immateriella anläggningstillgångar",
  "11": "Byggnader och mark",
  "12": "Maskiner och inventarier",
  "13": "Finansiella anläggningstillgångar",
  "14": "Varulager m.m.",
  "15": "Kundfordringar",
  "16": "Övriga kortfristiga fordringar",
  "17": "Förutbetalda kostnader och upplupna intäkter",
  "18": "Kortfristiga placeringar",
  "19": "Kassa och bank",
  "20": "Eget kapital",
  "21": "Obeskattade reserver",
  "22": "Avsättningar",
  "23": "Långfristiga skulder",
  "24": "Kortfristiga skulder",
  "25": "Skatteskulder",
  "26": "Moms och särskilda punktskatter",
  "27": "Personalens skatter, avgifter och löneavdrag",
  "28": "Övriga kortfristiga skulder",
  "29": "Upplupna kostnader och förutbetalda intäkter",
};

export const RESULTAT_GROUP_TITLES: Record<string, string> = {
  "30": "Försäljning och utfört arbete",
  "31": "Försäljning av varor",
  "32": "Försäljning av varor och material",
  "33": "Försäljning av tjänster",
  "34": "Försäljning, övrigt",
  "35": "Fakturerade kostnader",
  "36": "Rörelsens sidointäkter",
  "37": "Intäktskorrigeringar",
  "38": "Aktiverat arbete för egen räkning",
  "39": "Övriga rörelseintäkter",
  "40": "Inköp av varor och material",
  "41": "Inköp av varor från annat EU-land",
  "42": "Inköp av varor från länder utanför EU",
  "45": "Underentreprenörer",
  "46": "Reduktion av inköpspriser",
  "47": "Förändring av lager",
  "49": "Förändring av lager och pågående arbeten",
  "50": "Lokalkostnader",
  "51": "Fastighetskostnader",
  "52": "Hyra av anläggningstillgångar",
  "53": "Energi",
  "54": "Förbrukningsinventarier och material",
  "55": "Reparation och underhåll",
  "56": "Kostnader för transportmedel",
  "57": "Frakter och transporter",
  "58": "Resekostnader",
  "59": "Reklam och PR",
  "60": "Övriga försäljningskostnader",
  "61": "Kontorsmaterial och trycksaker",
  "62": "Tele och post",
  "63": "Försäkringar och övriga riskkostnader",
  "64": "Förvaltningskostnader",
  "65": "Övriga externa tjänster",
  "68": "Inhyrd personal",
  "69": "Övriga externa kostnader",
  "70": "Löner till kollektivanställda",
  "72": "Löner till tjänstemän och företagsledare",
  "73": "Kostnadsersättningar och förmåner",
  "74": "Pensionskostnader",
  "75": "Sociala och andra avgifter",
  "76": "Övriga personalkostnader",
  "77": "Nedskrivningar och återföringar",
  "78": "Avskrivningar enligt plan",
  "79": "Övriga rörelsekostnader och jämförelsestörande poster",
  "80": "Resultat från andelar i koncernföretag",
  "81": "Resultat från andelar i intresseföretag",
  "82": "Resultat från övriga finansiella anläggningstillgångar",
  "83": "Övriga ränteintäkter och liknande",
  "84": "Räntekostnader och liknande",
  "88": "Bokslutsdispositioner",
  "89": "Skatt och årets resultat",
};

const ASSET_SUBGROUPS = [
  { id: "fixed", title: "Anläggningstillgångar", prefixes: ["10", "11", "12", "13"] },
  { id: "current", title: "Omsättningstillgångar", prefixes: ["14", "15", "16", "17", "18", "19"] },
] as const;

const EQUITY_SUBGROUPS = [
  { id: "equity", title: "Eget kapital", prefixes: ["20", "21"] },
  { id: "liab", title: "Skulder", prefixes: ["22", "23", "24", "25", "26", "27", "28", "29"] },
] as const;

export function accountClass(number: string): string {
  return number.slice(0, 1);
}

export function accountGroupCode(number: string): string {
  return number.slice(0, 2);
}

/** Kreditnatur: eget kapital/skulder (2) och intäkter (3). */
export function isCreditAccount(number: string): boolean {
  const klass = accountClass(number);
  return klass === "2" || klass === "3";
}

function signedOre(value: number): number {
  return value === 0 ? 0 : value;
}

export function displayOre(number: string, rawDebitMinusCredit: number): number {
  return signedOre(
    isCreditAccount(number) ? -rawDebitMinusCredit : rawDebitMinusCredit
  );
}

export function yearStartIso(year: number): string {
  return `${year}-01-01`;
}

export function groupTitle(
  number: string,
  titles: Record<string, string>
): string {
  const code = accountGroupCode(number);
  return titles[code] ?? `Kontogrupp ${code}`;
}

function sumTriple(rows: readonly AmountTriple[]): AmountTriple {
  return rows.reduce(
    (sum, row) => ({
      openingOre: signedOre(sum.openingOre + row.openingOre),
      periodOre: signedOre(sum.periodOre + row.periodOre),
      closingOre: signedOre(sum.closingOre + row.closingOre),
    }),
    { openingOre: 0, periodOre: 0, closingOre: 0 }
  );
}

function toDisplayRow(account: AccountMovement): ReportAccountRow {
  return {
    number: account.number,
    name: account.name,
    openingOre: displayOre(account.number, account.openingOre),
    periodOre: displayOre(account.number, account.periodOre),
    closingOre: displayOre(account.number, account.closingOre),
  };
}

function buildGroups(
  accounts: readonly AccountMovement[],
  titles: Record<string, string>,
  display: (account: AccountMovement) => ReportAccountRow,
  isVisible: (row: ReportAccountRow) => boolean
): ReportGroup[] {
  const byCode = new Map<string, ReportAccountRow[]>();
  for (const account of accounts) {
    const row = display(account);
    if (!isVisible(row)) continue;
    const code = accountGroupCode(account.number);
    const list = byCode.get(code) ?? [];
    list.push(row);
    byCode.set(code, list);
  }

  return [...byCode.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([code, rows]) => {
      const accountsSorted = [...rows].sort((a, b) =>
        a.number.localeCompare(b.number)
      );
      return {
        code,
        title: titles[code] ?? `Kontogrupp ${code}`,
        accounts: accountsSorted,
        ...sumTriple(accountsSorted),
      };
    });
}

function groupsInPrefixes(
  groups: readonly ReportGroup[],
  prefixes: readonly string[]
): ReportGroup[] {
  return groups.filter((group) => prefixes.includes(group.code));
}

function blockFromGroups(
  id: string,
  title: string,
  groups: readonly ReportGroup[]
): ReportBlock {
  return {
    id,
    title,
    groups: [...groups],
    ...sumTriple(groups),
  };
}

function resultTriple(accounts: readonly AccountMovement[]): AmountTriple {
  let openingRaw = 0;
  let periodRaw = 0;
  let closingRaw = 0;
  for (const account of accounts) {
    const klass = accountClass(account.number);
    if (klass < "3" || klass > "8") continue;
    openingRaw += account.openingOre;
    periodRaw += account.periodOre;
    closingRaw += account.closingOre;
  }
  return {
    openingOre: signedOre(-openingRaw),
    periodOre: signedOre(-periodRaw),
    closingOre: signedOre(-closingRaw),
  };
}

export function buildBalanceReport(
  accounts: readonly AccountMovement[]
): BalanceReport {
  const class1 = accounts.filter((account) => accountClass(account.number) === "1");
  const class2 = accounts.filter((account) => accountClass(account.number) === "2");

  const assetGroups = buildGroups(
    class1,
    BALANS_GROUP_TITLES,
    toDisplayRow,
    (row) =>
      row.openingOre !== 0 || row.periodOre !== 0 || row.closingOre !== 0
  );
  const equityGroups = buildGroups(
    class2,
    BALANS_GROUP_TITLES,
    toDisplayRow,
    (row) =>
      row.openingOre !== 0 || row.periodOre !== 0 || row.closingOre !== 0
  );

  const calculatedResult = resultTriple(accounts);
  const equityWithResult = [...equityGroups];
  if (
    calculatedResult.openingOre !== 0 ||
    calculatedResult.periodOre !== 0 ||
    calculatedResult.closingOre !== 0
  ) {
    const resultGroup: ReportGroup = {
      code: "resultat",
      title: "Beräknat resultat",
      accounts: [
        {
          number: "",
          name: "Beräknat resultat",
          ...calculatedResult,
        },
      ],
      ...calculatedResult,
    };
    const firstLiability = equityWithResult.findIndex((group) =>
      EQUITY_SUBGROUPS[1].prefixes.includes(group.code)
    );
    if (firstLiability === -1) {
      equityWithResult.push(resultGroup);
    } else {
      equityWithResult.splice(firstLiability, 0, resultGroup);
    }
  }

  const assets = blockFromGroups("assets", "Tillgångar", [
    ...groupsInPrefixes(assetGroups, ASSET_SUBGROUPS[0].prefixes),
    ...groupsInPrefixes(assetGroups, ASSET_SUBGROUPS[1].prefixes),
  ]);
  const equityAndLiabilities = blockFromGroups(
    "equity",
    "Eget kapital och skulder",
    equityWithResult
  );

  return {
    assets,
    equityAndLiabilities,
    calculatedResult,
    balanced: assets.closingOre === equityAndLiabilities.closingOre,
  };
}

function toIncomeRow(account: AccountMovement): ReportAccountRow {
  return {
    number: account.number,
    name: account.name,
    openingOre: 0,
    periodOre: displayOre(account.number, account.periodOre),
    closingOre: displayOre(account.number, account.ytdOre),
  };
}

export function buildIncomeReport(
  accounts: readonly AccountMovement[]
): IncomeReport {
  const incomeAccounts = accounts.filter(
    (account) => accountClass(account.number) === "3"
  );
  const expenseAccounts = accounts.filter((account) => {
    const klass = accountClass(account.number);
    return klass >= "4" && klass <= "8";
  });

  const visible = (row: ReportAccountRow) =>
    row.periodOre !== 0 || row.closingOre !== 0;

  const income = blockFromGroups(
    "income",
    "Intäkter",
    buildGroups(incomeAccounts, RESULTAT_GROUP_TITLES, toIncomeRow, visible)
  );
  const expenses = blockFromGroups(
    "expenses",
    "Kostnader",
    buildGroups(expenseAccounts, RESULTAT_GROUP_TITLES, toIncomeRow, visible)
  );

  return {
    income,
    expenses,
    result: {
      periodOre: income.periodOre - expenses.periodOre,
      ytdOre: income.closingOre - expenses.closingOre,
    },
  };
}

