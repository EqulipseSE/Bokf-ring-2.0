import assert from "node:assert/strict";
import test from "node:test";
import { customerPaymentDate } from "./customer-payment";

const payments = [
  { date: "2026-10-06", amountOre: 2100000, referenceNumber: "1005" },
  { date: "2026-11-06", amountOre: 289800, referenceNumber: "1" },
];

test("matches invoice number and amount", () => {
  assert.equal(
    customerPaymentDate({ number: "1", totalOre: 289800 }, payments),
    "2026-11-06"
  );
});

test("ignores another invoice with a different amount", () => {
  assert.equal(customerPaymentDate({ number: "1", totalOre: 100 }, payments), null);
});

test("matches a stored reference", () => {
  assert.equal(
    customerPaymentDate({ number: "9", totalOre: 2100000, reference: "1005" }, payments),
    "2026-10-06"
  );
});
