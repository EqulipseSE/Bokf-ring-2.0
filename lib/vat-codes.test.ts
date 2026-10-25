import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BAS_ACCOUNTS } from "./db/bas-accounts";
import {
  VAT_CODES,
  defaultVatCode,
  isVatCode,
  parseVatCode,
  vatCodeName,
} from "./vat-codes";

describe("VAT_CODES", () => {
  it("har unika Visma-liknande koder med svenska namn", () => {
    const codes = VAT_CODES.map((item) => item.code);
    assert.equal(new Set(codes).size, codes.length);
    assert.deepEqual(codes, [
      "U25",
      "U12",
      "U6",
      "I25",
      "I12",
      "I6",
      "MF",
      "UEU",
      "IEU",
      "UOS",
      "IOS",
    ]);
    assert.ok(VAT_CODES.every((item) => item.name.trim().length > 0));
    assert.equal(vatCodeName("U25"), "Utgående moms 25 %");
    assert.equal(vatCodeName("MF"), "Momsfritt");
    assert.equal(vatCodeName(null), "");
  });
});

describe("parseVatCode", () => {
  it("godkänner systemkoder och tomt värde", () => {
    assert.deepEqual(parseVatCode("U25"), { ok: true, code: "U25" });
    assert.deepEqual(parseVatCode(""), { ok: true, code: null });
    assert.deepEqual(parseVatCode(null), { ok: true, code: null });
    assert.deepEqual(parseVatCode("  I12  "), { ok: true, code: "I12" });
  });

  it("avvisar okända koder", () => {
    const result = parseVatCode("MOMS25");
    assert.ok(!result.ok);
    assert.equal(result.error, "Ogiltig momskod.");
    assert.equal(isVatCode("U25"), true);
    assert.equal(isVatCode("X99"), false);
  });
});

describe("defaultVatCode", () => {
  it("sätter uppenbara moms- och försäljningskonton", () => {
    assert.equal(
      defaultVatCode("2611", "Utgående moms på försäljning inom Sverige, 25 %"),
      "U25"
    );
    assert.equal(
      defaultVatCode("2621", "Utgående moms på försäljning inom Sverige, 12 %"),
      "U12"
    );
    assert.equal(
      defaultVatCode("2631", "Utgående moms på försäljning inom Sverige, 6 %"),
      "U6"
    );
    assert.equal(defaultVatCode("2641", "Debiterad ingående moms"), "I25");
    assert.equal(
      defaultVatCode("3001", "Försäljning inom Sverige, 25 % moms"),
      "U25"
    );
    assert.equal(
      defaultVatCode("3011", "Försäljning av tjänster 25 %"),
      "U25"
    );
    assert.equal(
      defaultVatCode("4010", "Inköp av varor 25 %"),
      "I25"
    );
  });

  it("sätter momsfritt, EU och omvänd när namnet är tydligt", () => {
    assert.equal(
      defaultVatCode("3004", "Försäljning inom Sverige, momsfri"),
      "MF"
    );
    assert.equal(
      defaultVatCode("3108", "Försäljning varor till annat EU-land, momsfri"),
      "UEU"
    );
    assert.equal(
      defaultVatCode("4070", "Inköp av handelsvaror från annat EU-land"),
      "IEU"
    );
    assert.equal(
      defaultVatCode("2614", "Utgående moms omvänd betalskyldighet, 25 %"),
      "UOS"
    );
    assert.equal(
      defaultVatCode(
        "2647",
        "Ingående moms omvänd betalningsskyldighet varor och tjänster i Sverige"
      ),
      "IOS"
    );
    assert.equal(
      defaultVatCode(
        "4060",
        "Inköp av handelsvaror i Sverige, omvänd betalningsskyldighet"
      ),
      "IOS"
    );
  });

  it("lämnar tomt när det inte går att veta", () => {
    assert.equal(defaultVatCode("1930", "Företagskonto"), null);
    assert.equal(defaultVatCode("5010", "Lokalhyra"), null);
    assert.equal(defaultVatCode("6110", "Kontorsmaterial"), null);
    assert.equal(defaultVatCode("2650", "Redovisningskonto för moms"), null);
    assert.equal(defaultVatCode("3000", "Försäljning inom Sverige"), null);
    assert.equal(
      defaultVatCode("3106", "Försäljning varor till annat EU-land, momspliktig"),
      null
    );
    assert.equal(defaultVatCode("4010", "Inköp av handelsvaror i Sverige"), null);
  });

  it("sätter ingående moms på kostnadskonto bara när namnet nämner moms", () => {
    assert.equal(
      defaultVatCode("5460", "Förbrukningsmaterial, 25 % moms"),
      "I25"
    );
    assert.equal(defaultVatCode("5460", "Förbrukningsmaterial"), null);
  });

  it("ger bara systemkoder eller tomt för hela BAS", () => {
    for (const account of BAS_ACCOUNTS) {
      const code = defaultVatCode(account.number, account.name);
      assert.ok(
        code === null || isVatCode(code),
        `${account.number} ${account.name} → ${code}`
      );
    }
  });
});
