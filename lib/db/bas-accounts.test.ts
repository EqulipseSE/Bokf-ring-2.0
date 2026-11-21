import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  accountsForBasChart,
  BAS_ACCOUNTS,
  BAS_YEAR,
  defaultVatCode,
  matchesAccountQuery,
  parseAccountDrafts,
  parseBasChart,
} from "./bas-accounts";

describe("BAS-kontoplanen", () => {
  it("är hela BAS 2026 med unika fyrsiffriga nummer", () => {
    assert.equal(BAS_YEAR, 2026);
    assert.equal(BAS_ACCOUNTS.length, 1283);
    assert.equal(BAS_ACCOUNTS.find((account) => account.number === "6240")?.name, "Dataprogramvaror");
    assert.equal(
      BAS_ACCOUNTS.find((account) => account.number === "5711")?.name,
      "Faktura- och påminnelseavgifter"
    );
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

describe("accountsForBasChart", () => {
  it("skiljer AB från EF i eget kapital", () => {
    const ab = new Set(accountsForBasChart("bas-2026-ab").map((a) => a.number));
    const ef = new Set(accountsForBasChart("bas-2026-ef").map((a) => a.number));

    for (const number of ["2010", "2011", "2013", "2018", "2019", "2050", "3401"]) {
      assert.equal(ab.has(number), false, number);
      assert.equal(ef.has(number), true, number);
    }
    assert.equal(ab.has("6240"), true);
    assert.equal(ef.has("6240"), true);
    for (const number of ["2081", "2086", "2091", "2099"]) {
      assert.equal(ab.has(number), true, number);
      assert.equal(ef.has(number), false, number);
    }
    for (const number of ["2023", "2061", "2083", "2088"]) {
      assert.equal(ab.has(number), false, number);
      assert.equal(ef.has(number), false, number);
    }
    assert.equal(ab.has("1930"), true);
    assert.equal(ef.has("1930"), true);
    assert.ok(ab.size < BAS_ACCOUNTS.length);
    assert.ok(ef.size < BAS_ACCOUNTS.length);
  });

  it("godkänner bara de två kontoplanerna", () => {
    assert.deepEqual(parseBasChart("bas-2026-ab"), { ok: true, value: "bas-2026-ab" });
    assert.equal(parseBasChart("bas-2026").ok, false);
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
