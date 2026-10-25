import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  arkivItems,
  companyHref,
  isArkivPath,
  menuGroups,
} from "../app/foretag/[id]/menu";

const companyId = "11111111-1111-4111-8111-111111111111";

describe("arkivItems", () => {
  it("har precis tre poster till sidomenyn", () => {
    const items = arkivItems(companyId);
    assert.deepEqual(
      items.map((item) => item.label),
      ["Öppna företag", "Företagsinställningar", "Import/export"]
    );
    assert.equal(items[0]?.href, "/klientforetag");
    assert.equal(
      items[1]?.href,
      companyHref(companyId, "foretagsinstallningar")
    );
    assert.equal(items[2]?.href, companyHref(companyId, "importexport"));
  });
});

describe("menuGroups", () => {
  it("lämnar bara Bokföring och Utskrifter i ikonraden", () => {
    const groups = menuGroups(companyId);
    assert.deepEqual(
      groups.map((group) => group.id),
      ["bokforing", "utskrifter"]
    );
  });
});

describe("isArkivPath", () => {
  it("känner igen Arkiv-sidor men inte Bokföring", () => {
    assert.equal(
      isArkivPath(`/foretag/${companyId}/foretagsinstallningar`, companyId),
      true
    );
    assert.equal(
      isArkivPath(`/foretag/${companyId}/importexport`, companyId),
      true
    );
    assert.equal(
      isArkivPath(`/foretag/${companyId}/verifikationer`, companyId),
      false
    );
  });
});
