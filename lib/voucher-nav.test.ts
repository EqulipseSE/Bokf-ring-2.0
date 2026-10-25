import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isDraftDirty,
  isOnVerifikationer,
  resolveKortHref,
  verifikationerBase,
  voucherSubmenuState,
} from "./voucher-nav";

const companyId = "acme";
const base = `/foretag/${companyId}/verifikationer`;

describe("verifikationer-navigering", () => {
  it("känner igen verifikationssidor och lämnar övriga", () => {
    assert.equal(verifikationerBase(companyId), base);
    assert.equal(isOnVerifikationer(base, companyId), true);
    assert.equal(isOnVerifikationer(`${base}/ny`, companyId), true);
    assert.equal(isOnVerifikationer(`${base}/kort`, companyId), true);
    assert.equal(isOnVerifikationer(`${base}/abc`, companyId), true);
    assert.equal(
      isOnVerifikationer(`/foretag/${companyId}/kontoplan`, companyId),
      false
    );
  });

  it("markerar Lista bara på listvyn och Kort på kort/ny", () => {
    assert.deepEqual(voucherSubmenuState(base, companyId), {
      lista: true,
      kort: false,
      ny: false,
    });
    assert.deepEqual(voucherSubmenuState(`${base}/kort`, companyId), {
      lista: false,
      kort: true,
      ny: false,
    });
    assert.deepEqual(voucherSubmenuState(`${base}/ny`, companyId), {
      lista: false,
      kort: true,
      ny: true,
    });
    assert.equal(
      voucherSubmenuState(`/foretag/${companyId}/kontoplan`, companyId),
      null
    );
  });

  it("styr Kort till utkast, senast visad eller tomt kort", () => {
    assert.equal(
      resolveKortHref({
        companyId,
        hasDirtyDraft: true,
        target: { kind: "saved", id: "old" },
      }),
      `${base}/ny`
    );
    assert.equal(
      resolveKortHref({
        companyId,
        hasDirtyDraft: false,
        target: { kind: "draft" },
      }),
      `${base}/ny`
    );
    assert.equal(
      resolveKortHref({
        companyId,
        hasDirtyDraft: false,
        target: { kind: "saved", id: "v-1" },
      }),
      `${base}/v-1`
    );
    assert.equal(
      resolveKortHref({
        companyId,
        hasDirtyDraft: false,
        target: null,
      }),
      `${base}/kort`
    );
  });

  it("räknar utkast som smutsigt vid text, rad eller underlag", () => {
    const emptyLine = {
      accountId: "",
      accountNumber: "",
      debit: "",
      credit: "",
    };
    assert.equal(
      isDraftDirty({
        text: "",
        dateChanged: false,
        attachment: false,
        lines: [emptyLine],
      }),
      false
    );
    assert.equal(
      isDraftDirty({
        text: "Hyra",
        dateChanged: false,
        attachment: false,
        lines: [emptyLine],
      }),
      true
    );
    assert.equal(
      isDraftDirty({
        text: "",
        dateChanged: true,
        attachment: false,
        lines: [emptyLine],
      }),
      true
    );
    assert.equal(
      isDraftDirty({
        text: "",
        dateChanged: false,
        attachment: false,
        lines: [{ ...emptyLine, accountNumber: "1910" }],
      }),
      true
    );
  });
});
