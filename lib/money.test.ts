import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { completeAmountDecimals, parseAmountToOre, parseSignedAmountToOre } from "./money";

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

describe("completeAmountDecimals", () => {
  it("fyller ut till två decimaler", () => {
    assert.equal(completeAmountDecimals("100"), "100,00");
    assert.equal(completeAmountDecimals("100,5"), "100,50");
    assert.equal(completeAmountDecimals("100,50"), "100,50");
    assert.equal(completeAmountDecimals("-12,3"), "-12,30");
    assert.equal(completeAmountDecimals(""), "");
    assert.equal(completeAmountDecimals("abc"), "abc");
  });
});
