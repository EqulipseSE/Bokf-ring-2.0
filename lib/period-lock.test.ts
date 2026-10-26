import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assertDateOpen,
  buildMonthRows,
  formatIsoDateSv,
  isDateLocked,
  lockThroughMonth,
  lockableMonths,
  lockedPeriodError,
  monthLockStatus,
  nextLockTarget,
  parseYearQuery,
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

describe("monthLockStatus", () => {
  it("markerar hela månader bakåt som låsta", () => {
    assert.equal(monthLockStatus(2026, 1, "2026-02-28"), "locked");
    assert.equal(monthLockStatus(2026, 2, "2026-02-28"), "locked");
    assert.equal(monthLockStatus(2026, 3, "2026-02-28"), "open");
    assert.equal(monthLockStatus(2025, 12, "2026-02-28"), "locked");
  });

  it("markerar delvis låst när gränsen ligger mitt i månaden", () => {
    assert.equal(monthLockStatus(2026, 3, "2026-03-15"), "partial");
    assert.equal(monthLockStatus(2026, 2, "2026-03-15"), "locked");
    assert.equal(monthLockStatus(2026, 4, "2026-03-15"), "open");
  });
});

describe("nextLockTarget / lockableMonths", () => {
  it("börjar med januari när inget är låst", () => {
    assert.deepEqual(nextLockTarget(null, 2026), {
      year: 2026,
      month: 1,
      through: "2026-01-31",
    });
  });

  it("låser resten av en delvis låst månad innan nästa", () => {
    assert.deepEqual(nextLockTarget("2026-03-15", 2026), {
      year: 2026,
      month: 3,
      through: "2026-03-31",
    });
  });

  it("går framåt en månad i taget, över årsskifte", () => {
    assert.deepEqual(nextLockTarget("2026-01-31", 2026), {
      year: 2026,
      month: 2,
      through: "2026-02-28",
    });
    assert.deepEqual(nextLockTarget("2026-12-31", 2026), {
      year: 2027,
      month: 1,
      through: "2027-01-31",
    });
  });

  it("listar bara månader framifrån i valt år", () => {
    const fromFebruary = lockableMonths(2026, "2026-01-31");
    assert.equal(fromFebruary[0]?.month, 2);
    assert.equal(fromFebruary[0]?.through, "2026-02-28");
    assert.equal(fromFebruary.at(-1)?.month, 12);
    assert.equal(fromFebruary.length, 11);

    const afterYear = lockableMonths(2026, "2026-12-31");
    assert.deepEqual(afterYear, []);
  });
});

describe("validateLockThrough", () => {
  it("godkänner senare datum och avvisar luckor bakåt", () => {
    const ok = validateLockThrough("2026-03-31", "2026-01-31");
    assert.deepEqual(ok, { ok: true, through: "2026-03-31" });

    const tooEarly = validateLockThrough("2026-01-15", "2026-01-31");
    assert.equal(tooEarly.ok, false);
    if (!tooEarly.ok) {
      assert.match(tooEarly.error, /Redan låst t\.o\.m\. 31 januari 2026/);
    }

    const same = validateLockThrough("2026-01-31", "2026-01-31");
    assert.equal(same.ok, false);

    const invalid = validateLockThrough("2026-02-31", null);
    assert.equal(invalid.ok, false);
  });

  it("låser till och med en vald månad", () => {
    assert.equal(lockThroughMonth(2026, 2), "2026-02-28");
    assert.equal(lockThroughMonth(2024, 2), "2024-02-29");
  });
});

describe("buildMonthRows / format", () => {
  it("bygger årets månader med svensk status", () => {
    const rows = buildMonthRows(2026, "2026-02-10");
    assert.equal(rows.length, 12);
    assert.equal(rows[0]?.statusLabel, "Låst");
    assert.equal(rows[1]?.statusLabel, "Delvis låst t.o.m. 10 februari 2026");
    assert.equal(rows[2]?.statusLabel, "Öppen");
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
