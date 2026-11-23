import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { extractPdfRuns } from "./pdf-runs";
import { salaryPostings } from "./salary-postings";

describe("salaryPostings", () => {
  it("läser löneunderlaget och hoppar över bankraden", () => {
    const bytes = readFileSync(
      "data/underlag/642a8cfb-2dc0-45f8-9a96-d6f5d8c3e6cb/dokument/76b2020f-9b98-4b6e-8a17-d3c79fd1c3c5.pdf"
    );
    const postings = salaryPostings(extractPdfRuns(bytes), "1930");
    assert.deepEqual(postings, [
      { accountNumber: "2710", debitOre: 0, creditOre: 1_800_000 },
      { accountNumber: "7010", debitOre: 6_000_000, creditOre: 0 },
      { accountNumber: "2731", debitOre: 0, creditOre: 1_885_200 },
      { accountNumber: "2920", debitOre: 0, creditOre: 720_000 },
      { accountNumber: "2940", debitOre: 0, creditOre: 226_224 },
      { accountNumber: "7510", debitOre: 1_885_200, creditOre: 0 },
      { accountNumber: "7290", debitOre: 720_000, creditOre: 0 },
      { accountNumber: "7519", debitOre: 226_224, creditOre: 0 },
    ]);
  });
});
