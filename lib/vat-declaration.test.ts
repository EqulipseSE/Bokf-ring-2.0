import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  MONTH_NAMES,
  VAT_BOX_IDS,
  VAT_BOX_SECTIONS,
  availableYears,
  buildVatPeriod,
  isVatAccountNumber,
  lastDayOfMonth,
  lineContributions,
  parseVatPeriod,
  periodQueryString,
  sumVatBoxes,
  vatToPayOre,
} from "./vat-declaration";

describe("VAT_BOX_SECTIONS", () => {
  it("täcker alla rutor exakt en gång i SKV-ordning", () => {
    const listed = VAT_BOX_SECTIONS.flatMap((section) => [...section.boxes]);
    assert.deepEqual(listed, [...VAT_BOX_IDS]);
    assert.deepEqual(
      VAT_BOX_SECTIONS.map((section) => section.id),
      ["A", "B", "C", "D", "E", "F", "G", "H"]
    );
  });
});

describe("isVatAccountNumber", () => {
  it("räknar 26xx som momskonto", () => {
    assert.equal(isVatAccountNumber("2611"), true);
    assert.equal(isVatAccountNumber("2641"), true);
    assert.equal(isVatAccountNumber("3001"), false);
    assert.equal(isVatAccountNumber("1930"), false);
  });
});

describe("lineContributions", () => {
  it("mappar U25 till ruta 05 på försäljning och 10 på momskonto", () => {
    assert.deepEqual(
      lineContributions({
        vatCode: "U25",
        accountNumber: "3001",
        debit: 0,
        credit: 1_000_00,
      }),
      [{ box: "05", ore: 1_000_00 }]
    );
    assert.deepEqual(
      lineContributions({
        vatCode: "U25",
        accountNumber: "2611",
        debit: 0,
        credit: 250_00,
      }),
      [{ box: "10", ore: 250_00 }]
    );
  });

  it("mappar U12 och U6 till 06/11 och 07/12", () => {
    assert.deepEqual(
      lineContributions({
        vatCode: "U12",
        accountNumber: "3002",
        debit: 0,
        credit: 500_00,
      }),
      [{ box: "06", ore: 500_00 }]
    );
    assert.deepEqual(
      lineContributions({
        vatCode: "U12",
        accountNumber: "2621",
        debit: 0,
        credit: 60_00,
      }),
      [{ box: "11", ore: 60_00 }]
    );
    assert.deepEqual(
      lineContributions({
        vatCode: "U6",
        accountNumber: "3003",
        debit: 0,
        credit: 200_00,
      }),
      [{ box: "07", ore: 200_00 }]
    );
    assert.deepEqual(
      lineContributions({
        vatCode: "U6",
        accountNumber: "2631",
        debit: 0,
        credit: 12_00,
      }),
      [{ box: "12", ore: 12_00 }]
    );
  });

  it("mappar ingående moms till ruta 48 bara på momskonto", () => {
    assert.deepEqual(
      lineContributions({
        vatCode: "I25",
        accountNumber: "2641",
        debit: 250_00,
        credit: 0,
      }),
      [{ box: "48", ore: 250_00 }]
    );
    assert.deepEqual(
      lineContributions({
        vatCode: "I25",
        accountNumber: "4010",
        debit: 1_000_00,
        credit: 0,
      }),
      []
    );
    assert.deepEqual(
      lineContributions({
        vatCode: "I12",
        accountNumber: "2640",
        debit: 12_00,
        credit: 0,
      }),
      [{ box: "48", ore: 12_00 }]
    );
  });

  it("mappar momsfritt, EU och omvänd där det är uppenbart", () => {
    assert.deepEqual(
      lineContributions({
        vatCode: "MF",
        accountNumber: "3004",
        debit: 0,
        credit: 800_00,
      }),
      [{ box: "41", ore: 800_00 }]
    );
    assert.deepEqual(
      lineContributions({
        vatCode: "UEU",
        accountNumber: "3108",
        debit: 0,
        credit: 2_000_00,
      }),
      [{ box: "35", ore: 2_000_00 }]
    );
    assert.deepEqual(
      lineContributions({
        vatCode: "IEU",
        accountNumber: "4070",
        debit: 1_500_00,
        credit: 0,
      }),
      [{ box: "20", ore: 1_500_00 }]
    );
    assert.deepEqual(
      lineContributions({
        vatCode: "UOS",
        accountNumber: "3000",
        debit: 0,
        credit: 4_000_00,
      }),
      [{ box: "40", ore: 4_000_00 }]
    );
    assert.deepEqual(
      lineContributions({
        vatCode: "UOS",
        accountNumber: "2614",
        debit: 0,
        credit: 1_000_00,
      }),
      [{ box: "30", ore: 1_000_00 }]
    );
    assert.deepEqual(
      lineContributions({
        vatCode: "IOS",
        accountNumber: "4060",
        debit: 4_000_00,
        credit: 0,
      }),
      [{ box: "24", ore: 4_000_00 }]
    );
    assert.deepEqual(
      lineContributions({
        vatCode: "IOS",
        accountNumber: "2647",
        debit: 1_000_00,
        credit: 0,
      }),
      [{ box: "48", ore: 1_000_00 }]
    );
  });

  it("ignorerar tom och okänd kod", () => {
    assert.deepEqual(
      lineContributions({
        vatCode: null,
        accountNumber: "3001",
        debit: 0,
        credit: 100,
      }),
      []
    );
    assert.deepEqual(
      lineContributions({
        vatCode: "X99",
        accountNumber: "3001",
        debit: 0,
        credit: 100,
      }),
      []
    );
  });

  it("kreditnota minskar underlaget", () => {
    assert.deepEqual(
      lineContributions({
        vatCode: "U25",
        accountNumber: "3001",
        debit: 1_000_00,
        credit: 0,
      }),
      [{ box: "05", ore: -1_000_00 }]
    );
  });
});

describe("sumVatBoxes", () => {
  it("summerar en typisk försäljning 25 % plus inköp", () => {
    const boxes = sumVatBoxes([
      { vatCode: "U25", accountNumber: "3001", debit: 0, credit: 10_000_00 },
      { vatCode: "U25", accountNumber: "2611", debit: 0, credit: 2_500_00 },
      { vatCode: "I25", accountNumber: "4010", debit: 4_000_00, credit: 0 },
      { vatCode: "I25", accountNumber: "2641", debit: 1_000_00, credit: 0 },
      { vatCode: null, accountNumber: "1930", debit: 12_500_00, credit: 0 },
    ]);
    assert.equal(boxes["05"], 10_000_00);
    assert.equal(boxes["10"], 2_500_00);
    assert.equal(boxes["48"], 1_000_00);
    assert.equal(boxes["49"], 1_500_00);
    assert.equal(boxes["06"], 0);
  });

  it("räknar ruta 49 som utgående minus ingående", () => {
    const boxes = sumVatBoxes([
      { vatCode: "U25", accountNumber: "2611", debit: 0, credit: 250_00 },
      { vatCode: "UOS", accountNumber: "2614", debit: 0, credit: 100_00 },
      { vatCode: "I25", accountNumber: "2641", debit: 400_00, credit: 0 },
    ]);
    assert.equal(vatToPayOre(boxes), -50_00);
    assert.equal(boxes["49"], -50_00);
    assert.equal(boxes["10"], 250_00);
    assert.equal(boxes["30"], 100_00);
    assert.equal(boxes["48"], 400_00);
  });
});

describe("buildVatPeriod", () => {
  it("ger månad, kvartal och helår med rätt datum", () => {
    assert.deepEqual(buildVatPeriod("manad", 2026, 10), {
      kind: "manad",
      year: 2026,
      number: 10,
      from: "2026-10-01",
      to: "2026-10-31",
      label: "oktober 2026",
    });
    assert.deepEqual(buildVatPeriod("kvartal", 2026, 4), {
      kind: "kvartal",
      year: 2026,
      number: 4,
      from: "2026-10-01",
      to: "2026-12-31",
      label: "kvartal 4 2026 (okt–dec)",
    });
    assert.deepEqual(buildVatPeriod("ar", 2026, 9), {
      kind: "ar",
      year: 2026,
      number: 1,
      from: "2026-01-01",
      to: "2026-12-31",
      label: "år 2026",
    });
  });

  it("hanterar februari skottår", () => {
    assert.equal(lastDayOfMonth(2024, 2), 29);
    assert.equal(buildVatPeriod("manad", 2024, 2).to, "2024-02-29");
    assert.equal(buildVatPeriod("manad", 2025, 2).to, "2025-02-28");
    assert.equal(MONTH_NAMES.length, 12);
  });
});

describe("parseVatPeriod", () => {
  it("läser query och faller tillbaka till innevarande månad", () => {
    const october = parseVatPeriod({}, "2026-10-25");
    assert.equal(october.kind, "manad");
    assert.equal(october.year, 2026);
    assert.equal(october.number, 10);
    assert.equal(october.from, "2026-10-01");

    const q = parseVatPeriod(
      { typ: "kvartal", ar: "2025", nr: "2" },
      "2026-10-25"
    );
    assert.equal(q.label, "kvartal 2 2025 (apr–jun)");
    assert.equal(q.from, "2025-04-01");
    assert.equal(q.to, "2025-06-30");

    const year = parseVatPeriod({ typ: "ar", ar: "2024" }, "2026-10-25");
    assert.equal(year.from, "2024-01-01");
    assert.equal(year.to, "2024-12-31");
  });

  it("ignorerar ogiltiga värden", () => {
    const period = parseVatPeriod(
      { typ: "vecka", ar: "nitton", nr: "99" },
      "2026-03-15"
    );
    assert.equal(period.kind, "manad");
    assert.equal(period.year, 2026);
    assert.equal(period.number, 12);
    assert.equal(period.from, "2026-12-01");
  });

  it("bygger querysträng tillbaka", () => {
    const period = buildVatPeriod("manad", 2026, 10);
    assert.equal(periodQueryString(period), "typ=manad&ar=2026&nr=10");
  });
});

describe("availableYears", () => {
  it("täcker några år bakåt och ett framåt", () => {
    const years = availableYears("2026-10-25", [2018]);
    assert.ok(years.includes(2020));
    assert.ok(years.includes(2026));
    assert.ok(years.includes(2027));
    assert.ok(years.includes(2018));
    assert.equal(years[0], 2018);
  });
});
