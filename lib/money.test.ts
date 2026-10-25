import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseAmountToOre, parseSignedAmountToOre } from "./money";

describe("parseSignedAmountToOre", () => {
  it("tolkar svenska belopp med tecken", () => {
    assert.equal(parseSignedAmountToOre("1 250,50"), 125050);
    assert.equal(parseSignedAmountToOre("-1 000,00"), -100000);
    assert.equal(parseSignedAmountToOre("+250"), 25000);
    assert.equal(parseSignedAmountToOre("−125,5"), -12550);
    assert.equal(parseSignedAmountToOre(""), 0);
  });

  it("avvisar ogiltiga belopp", () => {
    assert.equal(parseSignedAmountToOre("abc"), null);
    assert.equal(parseSignedAmountToOre("1,234"), null);
  });

  it("lämnar osignerad parse orörd", () => {
    assert.equal(parseAmountToOre("-10"), null);
    assert.equal(parseAmountToOre("10,00"), 1000);
  });
});
