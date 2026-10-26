import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assertDateOpen,
  buildPeriodRows,
  effectiveLockedThrough,
  formatIsoDateSv,
  isDateLocked,
  isLockBoundary,
  lockablePeriods,
  lockedPeriodError,
  nextLockTarget,
  parseYearQuery,
  periodEndIso,
  periodLockStatus,
  validateLockThrough,
} from "./period-lock";

describe("isDateLocked / assertDateOpen", () => {
  it("är olåst utan gräns", () => {
    assert.equal(isDateLocked("2026-01-15", null), false);
    assert.equal(assertDateOpen("2026-01-15", null).ok, true);
  });

  it("låser datum t.o.m. gränsen, men inte dagen efter", () => {
    assert.equal(isDateLocked("2026-01-31", "2026-01-31"), true);
    assert.equal(isDateLocked("2026-02-01", "2026-01-31"), false);
    assert.equal(isDateLocked("2025-12-31", "2026-01-31"), true);
    const blocked = assertDateOpen("2026-01-15", "2026-01-31");
    assert.equal(blocked.ok, false);
    if (!blocked.ok) {
      assert.equal(blocked.error, "Perioden är låst t.o.m. 31 januari 2026.");
    }
    assert.equal(assertDateOpen("2026-02-01", "2026-01-31").ok, true);
  });
});

describe("periodLockStatus", () => {
  it("markerar hela månader bakåt som låsta", () => {
    assert.equal(periodLockStatus("manad", 2026, 1, "2026-02-28"), "locked");
    assert.equal(periodLockStatus("manad", 2026, 2, "2026-02-28"), "locked");
    assert.equal(periodLockStatus("manad", 2026, 3, "2026-02-28"), "open");
  });

  it("låser hela kvartal, inte enstaka månader", () => {
    assert.equal(periodLockStatus("kvartal", 2026, 1, "2026-03-31"), "locked");
    assert.equal(periodLockStatus("kvartal", 2026, 2, "2026-03-31"), "open");
    assert.equal(periodLockStatus("kvartal", 2026, 1, "2026-02-15"), "open");
    assert.equal(periodLockStatus("kvartal", 2026, 1, "2026-01-31"), "open");
  });

  it("låser hela året vid helårsmoms", () => {
    assert.equal(periodLockStatus("ar", 2026, 1, "2026-12-31"), "locked");
    assert.equal(periodLockStatus("ar", 2026, 1, "2026-06-30"), "open");
    assert.equal(periodLockStatus("ar", 2027, 1, "2026-12-31"), "open");
  });

  it("ignorerar överblivna månadslås vid kvartal och helår", () => {
    assert.equal(effectiveLockedThrough("2026-01-31", "kvartal"), null);
    assert.equal(effectiveLockedThrough("2026-06-30", "ar"), null);
    assert.equal(effectiveLockedThrough("2026-01-31", "manad"), "2026-01-31");
    assert.equal(effectiveLockedThrough("2026-03-31", "kvartal"), "2026-03-31");
    assert.deepEqual(nextLockTarget("2026-01-31", 2026, "kvartal"), {
      year: 2026,
      number: 1,
      through: "2026-03-31",
      label: "kvartal 1 2026 (jan–mar)",
    });
    const leftover = buildPeriodRows("kvartal", 2026, "2026-01-31");
    assert.equal(leftover[0]?.status, "open");
    assert.equal(leftover[0]?.statusLabel, "Öppen");
    assert.equal(
      leftover.some((row) => row.statusLabel.includes("Delvis")),
      false
    );
  });
});

describe("nextLockTarget / lockablePeriods", () => {
  it("månadsmoms börjar med januari", () => {
    assert.deepEqual(nextLockTarget(null, 2026, "manad"), {
      year: 2026,
      number: 1,
      through: "2026-01-31",
      label: "januari 2026",
    });
  });

  it("kvartalsmoms låser bara hela kvartal framifrån", () => {
    assert.deepEqual(nextLockTarget(null, 2026, "kvartal"), {
      year: 2026,
      number: 1,
      through: "2026-03-31",
      label: "kvartal 1 2026 (jan–mar)",
    });
    assert.deepEqual(nextLockTarget("2026-03-31", 2026, "kvartal"), {
      year: 2026,
      number: 2,
      through: "2026-06-30",
      label: "kvartal 2 2026 (apr–jun)",
    });
    assert.equal(periodEndIso("kvartal", 2026, 4), "2026-12-31");
  });

  it("helårsmoms låser hela året", () => {
    assert.deepEqual(nextLockTarget(null, 2026, "ar"), {
      year: 2026,
      number: 1,
      through: "2026-12-31",
      label: "helår 2026",
    });
    assert.deepEqual(nextLockTarget("2026-12-31", 2026, "ar"), {
      year: 2027,
      number: 1,
      through: "2027-12-31",
      label: "helår 2027",
    });
  });

  it("listar bara perioder framifrån i valt år", () => {
    const months = lockablePeriods("manad", 2026, "2026-01-31");
    assert.equal(months[0]?.number, 2);
    assert.equal(months[0]?.through, "2026-02-28");
    assert.equal(months.length, 11);

    const quarters = lockablePeriods("kvartal", 2026, "2026-03-31");
    assert.deepEqual(
      quarters.map((row) => row.through),
      ["2026-06-30", "2026-09-30", "2026-12-31"]
    );
    assert.deepEqual(lockablePeriods("ar", 2026, "2026-12-31"), []);
  });
});

describe("validateLockThrough", () => {
  it("godkänner senare månadsslut och avvisar bakåt", () => {
    const ok = validateLockThrough("2026-03-31", "2026-01-31", "manad");
    assert.deepEqual(ok, { ok: true, through: "2026-03-31" });
    assert.equal(validateLockThrough("2026-01-15", "2026-01-31", "manad").ok, false);
    assert.equal(validateLockThrough("2026-02-15", null, "manad").ok, false);
  });

  it("avvisar datum mitt i kvartal eller år", () => {
    assert.equal(isLockBoundary("2026-03-31", "kvartal"), true);
    assert.equal(isLockBoundary("2026-02-28", "kvartal"), false);
    const mid = validateLockThrough("2026-02-28", null, "kvartal");
    assert.equal(mid.ok, false);
    if (!mid.ok) {
      assert.match(mid.error, /hela kvartal/);
    }
    const yearMid = validateLockThrough("2026-06-30", null, "ar");
    assert.equal(yearMid.ok, false);
    if (!yearMid.ok) {
      assert.match(yearMid.error, /hela året/);
    }
  });
});

describe("buildPeriodRows / format", () => {
  it("bygger månader, kvartal och helår med svensk status", () => {
    const months = buildPeriodRows("manad", 2026, "2026-02-10");
    assert.equal(months.length, 12);
    assert.equal(months[0]?.statusLabel, "Låst");
    assert.equal(months[1]?.statusLabel, "Delvis låst t.o.m. 10 februari 2026");
    assert.equal(months[2]?.statusLabel, "Öppen");

    const leftoverMonth = buildPeriodRows("kvartal", 2026, "2026-01-31");
    assert.equal(leftoverMonth[0]?.statusLabel, "Öppen");

    const quarters = buildPeriodRows("kvartal", 2026, "2026-03-31");
    assert.equal(quarters.length, 4);
    assert.equal(quarters[0]?.label, "kvartal 1 2026 (jan–mar)");
    assert.equal(quarters[0]?.status, "locked");
    assert.equal(quarters[1]?.status, "open");

    const years = buildPeriodRows("ar", 2026, null);
    assert.equal(years.length, 1);
    assert.equal(years[0]?.label, "helår 2026");
    assert.equal(formatIsoDateSv("2026-01-31"), "31 januari 2026");
    assert.equal(
      lockedPeriodError("2026-01-31"),
      "Perioden är låst t.o.m. 31 januari 2026."
    );
  });

  it("tolkar år i query", () => {
    assert.equal(parseYearQuery("2025", 2026), 2025);
    assert.equal(parseYearQuery("nope", 2026), 2026);
    assert.equal(parseYearQuery(["2027"], 2026), 2027);
  });
});
