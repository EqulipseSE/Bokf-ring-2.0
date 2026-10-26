import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  EMPTY_CLIENT_CELL,
  clientLatestVoucherLabel,
  formatClientLatest,
  latestVoucherByCompany,
} from "./client-list";

describe("latestVoucherByCompany", () => {
  it("väljer högst datum, sedan högst nummer", () => {
    const latest = latestVoucherByCompany([
      { companyId: "a", letter: "A", number: 2, date: "2026-02-10" },
      { companyId: "a", letter: "A", number: 3, date: "2026-10-05" },
      { companyId: "a", letter: "A", number: 1, date: "2026-01-15" },
      { companyId: "b", letter: "A", number: 1, date: "2026-03-01" },
    ]);
    assert.equal(latest.get("a")?.number, 3);
    assert.equal(latest.get("a")?.date, "2026-10-05");
    assert.equal(latest.get("b")?.number, 1);
  });

  it("tom lista ger tom map", () => {
    assert.equal(latestVoucherByCompany([]).size, 0);
  });
});

describe("formatClientLatest", () => {
  it("visar nummer och datum, eller streck utan verifikation", () => {
    assert.deepEqual(formatClientLatest("3", "2026-10-05"), {
      number: "3",
      date: "2026-10-05",
    });
    assert.deepEqual(formatClientLatest(null, null), {
      number: EMPTY_CLIENT_CELL,
      date: EMPTY_CLIENT_CELL,
    });
    assert.equal(clientLatestVoucherLabel(null, 1), EMPTY_CLIENT_CELL);
    assert.equal(
      clientLatestVoucherLabel(
        { companyId: "a", letter: "A", number: 3, date: "2026-10-05" },
        1
      ),
      "3"
    );
  });
});
