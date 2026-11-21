import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  EMPTY_CLIENT_CELL,
  formatClientLatestDate,
  latestVoucherByCompany,
  sortClientsByStatus,
} from "./client-list";

describe("latestVoucherByCompany", () => {
  it("väljer högst datum, sedan högst nummer", () => {
    const latest = latestVoucherByCompany([
      { companyId: "a", number: 2, date: "2026-02-10" },
      { companyId: "a", number: 3, date: "2026-10-05" },
      { companyId: "a", number: 1, date: "2026-01-15" },
      { companyId: "b", number: 1, date: "2026-03-01" },
    ]);
    assert.equal(latest.get("a")?.date, "2026-10-05");
    assert.equal(latest.get("b")?.date, "2026-03-01");
  });

  it("hoppar över andra serier än A och B", () => {
    const latest = latestVoucherByCompany([
      { companyId: "a", number: 9, date: "2026-12-01", series: "K" },
      { companyId: "a", number: 2, date: "2026-02-10", series: "A" },
      { companyId: "a", number: 1, date: "2026-11-01", series: "L" },
      { companyId: "a", number: 4, date: "2026-06-01", series: "B" },
    ]);
    assert.equal(latest.get("a")?.date, "2026-06-01");
    assert.equal(latest.get("a")?.number, 4);
  });

  it("tom lista ger tom map", () => {
    assert.equal(latestVoucherByCompany([]).size, 0);
  });
});

describe("formatClientLatestDate", () => {
  it("visar bara datum, eller streck utan verifikation", () => {
    assert.equal(formatClientLatestDate("2026-10-05"), "2026-10-05");
    assert.equal(formatClientLatestDate(null), EMPTY_CLIENT_CELL);
    assert.equal(formatClientLatestDate(""), EMPTY_CLIENT_CELL);
  });
});

describe("sortClientsByStatus", () => {
  it("sorterar på status och namn, samma pilriktning", () => {
    const rows = [
      { name: "Beta", status: "red" },
      { name: "Alfa", status: "green" },
      { name: "Gamma", status: "green" },
    ];
    assert.deepEqual(
      sortClientsByStatus(rows, "asc").map((row) => row.name),
      ["Alfa", "Gamma", "Beta"]
    );
    assert.deepEqual(
      sortClientsByStatus(rows, "desc").map((row) => row.name),
      ["Beta", "Gamma", "Alfa"]
    );
  });
});
