import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatOre } from "./money";
import {
  assertVoucherEditable,
  buildVoucherSnapshot,
  describeVoucherChange,
  formatChangeTimestamp,
  formatSnapshotLine,
  snapshotsEqual,
  validateVoucherLines,
  type VoucherSnapshot,
  type VoucherSnapshotLine,
} from "./voucher-changes";

function line(
  patch: Partial<VoucherSnapshotLine> & { accountId: string; accountNumber: string }
): VoucherSnapshotLine {
  return {
    accountName: patch.accountName ?? "Konto",
    debit: patch.debit ?? 0,
    credit: patch.credit ?? 0,
    vatCode: patch.vatCode ?? null,
    ...patch,
  };
}

function snap(
  patch: Partial<VoucherSnapshot> = {}
): VoucherSnapshot {
  return buildVoucherSnapshot(
    patch.date ?? "2026-10-15",
    patch.text ?? "Hyra oktober",
    patch.lines ?? [
      line({
        accountId: "a",
        accountNumber: "5010",
        accountName: "Lokalhyra",
        debit: 100000,
        vatCode: "I25",
      }),
      line({
        accountId: "b",
        accountNumber: "1930",
        accountName: "Företagskonto",
        credit: 100000,
      }),
    ]
  );
}

describe("describeVoucherChange", () => {
  it("listar datum, text och radändringar", () => {
    const before = snap();
    const after = snap({
      date: "2026-10-20",
      text: "Lokalhyra oktober",
      lines: [
        line({
          accountId: "a",
          accountNumber: "5010",
          accountName: "Lokalhyra",
          debit: 125000,
          vatCode: "I25",
        }),
        line({
          accountId: "c",
          accountNumber: "1910",
          accountName: "Kassa",
          credit: 125000,
        }),
      ],
    });
    const items = describeVoucherChange(before, after);
    assert.deepEqual(
      items.map((item) => item.label),
      ["Datum", "Text", "Rad 1", "Rad 2"]
    );
    assert.equal(items[0]?.from, "2026-10-15");
    assert.equal(items[0]?.to, "2026-10-20");
    assert.equal(items[1]?.from, "Hyra oktober");
    assert.equal(items[1]?.to, "Lokalhyra oktober");
    assert.ok(items[2]?.from?.includes(formatOre(100000)));
    assert.ok(items[2]?.to?.includes(formatOre(125000)));
    assert.ok(items[3]?.from?.includes("1930"));
    assert.ok(items[3]?.to?.includes("1910"));
  });

  it("märker en tillagd rad", () => {
    const before = snap({
      lines: [
        line({
          accountId: "a",
          accountNumber: "5010",
          accountName: "Lokalhyra",
          debit: 100000,
        }),
        line({
          accountId: "b",
          accountNumber: "1930",
          accountName: "Företagskonto",
          credit: 100000,
        }),
      ],
    });
    const after = snap({
      lines: [
        ...before.lines,
        line({
          accountId: "c",
          accountNumber: "2641",
          accountName: "Debiterad ingående moms",
          debit: 25000,
          vatCode: "I25",
        }),
      ],
    });
    const items = describeVoucherChange(before, after);
    assert.equal(items[0]?.label, "Rad 3 tillagd");
    assert.equal(items[0]?.from, null);
    assert.ok(items[0]?.to?.includes("2641"));
  });

  it("märker tillagda och borttagna rader", () => {
    const before = snap({
      lines: [
        line({
          accountId: "a",
          accountNumber: "5010",
          accountName: "Lokalhyra",
          debit: 100000,
        }),
        line({
          accountId: "moms",
          accountNumber: "2641",
          accountName: "Debiterad ingående moms",
          debit: 25000,
          vatCode: "I25",
        }),
        line({
          accountId: "b",
          accountNumber: "1930",
          accountName: "Företagskonto",
          credit: 125000,
        }),
      ],
    });
    const after = snap({
      lines: [
        line({
          accountId: "a",
          accountNumber: "5010",
          accountName: "Lokalhyra",
          debit: 100000,
        }),
        line({
          accountId: "b",
          accountNumber: "1930",
          accountName: "Företagskonto",
          credit: 100000,
        }),
      ],
    });
    const items = describeVoucherChange(before, after);
    assert.equal(items[0]?.label, "Rad 2");
    assert.ok(items[0]?.from?.includes("2641"));
    assert.ok(items[0]?.to?.includes("1930"));
    assert.equal(items[1]?.label, "Rad 3 borttagen");
    assert.ok(items[1]?.from?.includes("1930"));
    assert.equal(items[1]?.to, null);
  });

  it("ignorerar identiska ögonblicksbilder", () => {
    const voucher = snap();
    assert.equal(describeVoucherChange(voucher, voucher).length, 0);
    assert.equal(snapshotsEqual(voucher, { ...voucher, text: "Hyra oktober" }), true);
    assert.equal(snapshotsEqual(voucher, snap({ text: "Annat" })), false);
  });
});

describe("formatSnapshotLine / formatChangeTimestamp", () => {
  it("skriver konto, sida och momskod", () => {
    assert.equal(
      formatSnapshotLine(
        line({
          accountId: "a",
          accountNumber: "5010",
          accountName: "Lokalhyra",
          debit: 100000,
          vatCode: "I25",
        })
      ),
      `5010 Lokalhyra, debet ${formatOre(100000)} · I25`
    );
  });

  it("visar Stockholm-tid som ÅÅÅÅ-MM-DD TT:MM", () => {
    // 20:13 UTC 26 okt 2026 = 21:13 CET (sommartid slutade 25 okt 2026).
    assert.equal(
      formatChangeTimestamp(new Date("2026-10-26T20:13:00.000Z")),
      "2026-10-26 21:13"
    );
  });
});

describe("assertVoucherEditable", () => {
  it("tillåter ändring i öppen period", () => {
    assert.equal(assertVoucherEditable("2026-10-15", "2026-10-20", null).ok, true);
    assert.equal(
      assertVoucherEditable("2026-10-15", "2026-10-20", "2026-09-30").ok,
      true
    );
  });

  it("stoppar när nuvarande eller nytt datum är låst", () => {
    const currentLocked = assertVoucherEditable(
      "2026-09-15",
      "2026-10-15",
      "2026-09-30"
    );
    assert.equal(currentLocked.ok, false);
    if (!currentLocked.ok) {
      assert.equal(currentLocked.error, "Perioden är låst t.o.m. 30 september 2026.");
    }
    const nextLocked = assertVoucherEditable(
      "2026-10-15",
      "2026-09-15",
      "2026-09-30"
    );
    assert.equal(nextLocked.ok, false);
  });
});

describe("validateVoucherLines", () => {
  it("kräver balanserade rader med konto", () => {
    const ok = validateVoucherLines([
      { accountId: "a", debitOre: 10000, creditOre: 0 },
      { accountId: "b", debitOre: 0, creditOre: 10000 },
    ]);
    assert.equal(ok.ok, true);
  });

  it("avvisar obalans, en rad och saknat konto", () => {
    assert.equal(
      validateVoucherLines([
        { accountId: "a", debitOre: 10000, creditOre: 0 },
      ]).ok,
      false
    );
    assert.equal(
      validateVoucherLines([
        { accountId: "a", debitOre: 10000, creditOre: 0 },
        { accountId: "b", debitOre: 0, creditOre: 5000 },
      ]).ok,
      false
    );
    assert.equal(
      validateVoucherLines([
        { accountId: "", debitOre: 10000, creditOre: 0 },
        { accountId: "b", debitOre: 0, creditOre: 10000 },
      ]).ok,
      false
    );
  });
});
