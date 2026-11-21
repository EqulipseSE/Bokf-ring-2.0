import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { bookAccountForOpeningBalance } from "./bank-account";

describe("bookAccountForOpeningBalance", () => {
  it("antar 1930 när ingående saldo är 0", () => {
    assert.equal(bookAccountForOpeningBalance(0), "1930");
  });

  it("gissar inte när saldot redan finns", () => {
    assert.equal(bookAccountForOpeningBalance(10_000), null);
  });
});
