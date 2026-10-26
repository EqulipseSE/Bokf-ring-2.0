import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  EMPTY_CLIENT_CELL,
  formatClientLatestDate,
  latestVoucherByCompany,
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
