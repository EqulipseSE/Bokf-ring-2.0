import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { companyFromBolagsverket, legalFormFromBolagsverket } from "./bolagsverket";

describe("companyFromBolagsverket", () => {
  it("läser företagsnamn och aktiebolag", () => {
    const result = companyFromBolagsverket({
      organisationer: [
        {
          organisationsnamn: {
            organisationsnamnLista: [
              {
                namn: "Cykelbolaget AB",
                organisationsnamntyp: { kod: "FORETAGSNAMN" },
              },
            ],
          },
          organisationsform: { kod: "AB", klartext: "Aktiebolag" },
        },
      ],
    });
    assert.deepEqual(result, {
      name: "Cykelbolaget AB",
      legalForm: "ab",
      legalFormLabel: "Aktiebolag",
    });
  });

  it("mappar enskild näringsidkare och lämnar övriga former", () => {
    assert.equal(legalFormFromBolagsverket("E", "Enskild näringsidkare"), "ef");
    assert.equal(legalFormFromBolagsverket("HB", "Handelsbolag"), null);
  });
});
