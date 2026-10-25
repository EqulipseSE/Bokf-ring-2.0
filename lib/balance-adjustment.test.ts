import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  balanceAdjustmentText,
  linesForBalanceDiff,
} from "./balance-adjustment";

describe("linesForBalanceDiff", () => {
  it("ökar saldo med debet på kontot och kredit på motkontot", () => {
    const result = linesForBalanceDiff("a", "b", 125000);
    assert.deepEqual(result, {
      ok: true,
      lines: [
        { accountId: "a", debitOre: 125000, creditOre: 0 },
        { accountId: "b", debitOre: 0, creditOre: 125000 },
      ],
    });
  });

  it("minskar saldo med kredit på kontot och debet på motkontot", () => {
    const result = linesForBalanceDiff("a", "b", -5000);
    assert.deepEqual(result, {
      ok: true,
      lines: [
        { accountId: "a", debitOre: 0, creditOre: 5000 },
        { accountId: "b", debitOre: 5000, creditOre: 0 },
      ],
    });
  });

  it("kräver annat motkonto och en faktisk diff", () => {
    assert.equal(linesForBalanceDiff("a", "a", 100).ok, false);
    assert.equal(linesForBalanceDiff("a", "b", 0).ok, false);
    assert.equal(linesForBalanceDiff("a", "", 100).ok, false);
  });
});

describe("balanceAdjustmentText", () => {
  it("skriver svensk verifikationstext", () => {
    assert.equal(
      balanceAdjustmentText("opening", "1930", "Företagskonto"),
      "Ingående saldo 1930 Företagskonto"
    );
    assert.equal(
      balanceAdjustmentText("closing", "2440", "Leverantörsskulder"),
      "Utgående saldo 2440 Leverantörsskulder"
    );
  });
});
