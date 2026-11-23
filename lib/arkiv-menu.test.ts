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
  it("visar meny 1 i den bestämda ordningen", () => {
    const groups = menuGroups(companyId);
    assert.deepEqual(
      groups.map((group) => group.label),
      [
        "Försäljning",
        "Inköp",
        "Lager",
        "Betalningar",
        "Bokföring",
        "Utskrifter",
        "Hjälp",
      ]
    );
    for (const label of ["Lager", "Betalningar", "Hjälp"]) {
      assert.deepEqual(
        groups.find((group) => group.label === label)?.items,
        []
      );
    }
  });

  it("har momskontroll i Bokföring och ingen momsdeklarationsknapp", () => {
    const groups = menuGroups(companyId);
    const bokforing = groups.find((group) => group.id === "bokforing");
    const utskrifter = groups.find((group) => group.id === "utskrifter");
    assert.deepEqual(
      bokforing?.items.slice(0, 3).map((item) => item.label),
      ["Verifikationer", "Underlag", "Momskontroll"]
    );
    assert.equal(
      bokforing?.items.some((item) => item.label === "Momsdeklaration"),
      false
    );
    assert.equal(
      utskrifter?.items.some((item) => item.label === "Momsdeklaration"),
      false
    );
  });

  it("lägger Periodlåsning under Bokföring", () => {
    const groups = menuGroups(companyId);
    const bokforing = groups.find((group) => group.id === "bokforing");
    assert.deepEqual(
      bokforing?.items.find((item) => item.label === "Periodlåsning"),
      {
        label: "Periodlåsning",
        href: companyHref(companyId, "periodlasning"),
        icon: "lock",
      }
    );
  });

  it("behåller Balansrapport och Resultatrapport under Utskrifter", () => {
    const groups = menuGroups(companyId);
    const utskrifter = groups.find((group) => group.id === "utskrifter");
    assert.deepEqual(
      utskrifter?.items.find((item) => item.label === "Balansrapport"),
      {
        label: "Balansrapport",
        href: companyHref(companyId, "balansrapport"),
        icon: "scale",
      }
    );
    assert.deepEqual(
      utskrifter?.items.map((item) => item.label),
      ["Balansrapport", "Resultatrapport", "Kontoanalys", "Huvudbok"]
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
