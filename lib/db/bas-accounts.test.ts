import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BAS_ACCOUNTS,
  BAS_YEAR,
  defaultVatCode,
  matchesAccountQuery,
  parseAccountDrafts,
} from "./bas-accounts";

describe("BAS-kontoplanen", () => {
  it("är hela BAS 2026 med unika fyrsiffriga nummer", () => {
    assert.equal(BAS_YEAR, 2026);
    assert.equal(BAS_ACCOUNTS.length, 1282);
    const numbers = BAS_ACCOUNTS.map((a) => a.number);
    assert.equal(new Set(numbers).size, numbers.length);
    assert.ok(numbers.every((n) => /^\d{4}$/.test(n)));
    assert.ok(BAS_ACCOUNTS.every((a) => a.name.trim().length > 0));
    assert.equal(BAS_ACCOUNTS[0]?.number, "1010");
    assert.equal(BAS_ACCOUNTS.at(-1)?.number, "8999");
  });

  it("innehåller vanliga konton med officiella namn", () => {
    const byNumber = new Map(BAS_ACCOUNTS.map((a) => [a.number, a.name]));
    assert.equal(byNumber.get("1510"), "Kundfordringar");
    assert.equal(byNumber.get("1930"), "Företagskonto");
    assert.equal(byNumber.get("2440"), "Leverantörsskulder");
    assert.equal(byNumber.get("2611"), "Utgående moms på försäljning inom Sverige, 25 %");
    assert.equal(byNumber.get("3001"), "Försäljning inom Sverige, 25 % moms");
    assert.equal(byNumber.get("5010"), "Lokalhyra");
    assert.equal(byNumber.get("8999"), "Årets resultat");
  });
});

describe("parseAccountDrafts", () => {
  it("godkänner en redigerad lista och sorterar den", () => {
    const result = parseAccountDrafts(
      JSON.stringify([
        { number: "3011", name: "Försäljning av tjänster 25 %" },
        { number: "1930", name: "Företagskonto Handelsbanken" },
      ])
    );
    assert.ok("accounts" in result);
    assert.deepEqual(result.accounts, [
      { number: "1930", name: "Företagskonto Handelsbanken" },
      { number: "3011", name: "Försäljning av tjänster 25 %" },
    ]);
  });

  it("avvisar dubbletter, tomt namn och felaktigt nummer", () => {
    const empty = parseAccountDrafts("[]");
    assert.ok("error" in empty);
    assert.equal(empty.error, "Kontoplanen måste innehålla minst ett konto.");

    const badNumber = parseAccountDrafts(
      JSON.stringify([{ number: "19", name: "Kassa" }])
    );
    assert.ok("error" in badNumber);
    assert.match(badNumber.error, /fyra siffror/);

    const duplicate = parseAccountDrafts(
      JSON.stringify([
        { number: "1930", name: "A" },
        { number: "1930", name: "B" },
      ])
    );
    assert.ok("error" in duplicate);
    assert.match(duplicate.error, /mer än en gång/);

    const blankName = parseAccountDrafts(
      JSON.stringify([{ number: "1930", name: "  " }])
    );
    assert.ok("error" in blankName);
    assert.match(blankName.error, /saknar namn/);
  });
});

describe("defaultVatCode", () => {
  it("sätter momskod på tydliga moms- och försäljningskonton", () => {
    assert.equal(
      defaultVatCode("2611", "Utgående moms på försäljning inom Sverige, 25 %"),
      "U25"
    );
    assert.equal(defaultVatCode("2641", "Debiterad ingående moms"), "I25");
    assert.equal(
      defaultVatCode("3001", "Försäljning inom Sverige, 25 % moms"),
      "U25"
    );
    assert.equal(defaultVatCode("1930", "Företagskonto"), null);
  });
});

describe("matchesAccountQuery", () => {
  it("matchar var som helst i nummer och namn", () => {
    const account = { number: "6072", name: "Reklam och PR" };
    assert.equal(matchesAccountQuery(account, "pr"), true);
    assert.equal(matchesAccountQuery(account, "607"), true);
    assert.equal(matchesAccountQuery(account, "hyra"), false);
  });
});
