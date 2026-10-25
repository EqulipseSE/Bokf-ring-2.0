import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BALANS_GROUP_TITLES,
  RESULTAT_GROUP_TITLES,
  accountClass,
  accountGroupCode,
  buildBalanceReport,
  buildIncomeReport,
  displayOre,
  groupTitle,
  isCreditAccount,
  yearStartIso,
  type AccountMovement,
} from "./financial-reports";

function move(
  number: string,
  name: string,
  openingOre: number,
  periodOre: number,
  closingOre = openingOre + periodOre,
  ytdOre = closingOre
): AccountMovement {
  return { number, name, openingOre, periodOre, closingOre, ytdOre };
}

/** Balanserad uppsättning: IB 100 000 på bank mot EK, periodförsäljning och inköp. */
const SAMPLE: AccountMovement[] = [
  move("1930", "Företagskonto", 10_000_000, 6_250_000),
  move("2010", "Eget kapital", -10_000_000, 0),
  move("3001", "Försäljning av varor", 0, -5_000_000),
  move("2611", "Utgående moms på försäljning 25 %", 0, -1_250_000),
  move("4010", "Inköp av varor från Sverige", 0, 3_750_000),
  move("2641", "Ingående moms", 0, 937_500),
  move("2440", "Leverantörsskulder", 0, -4_687_500),
  move("5010", "Lokalhyra", 0, 0, 0, 0),
];

describe("accountClass / displayOre", () => {
  it("klassificerar BAS-nummer och vänder kreditkonton", () => {
    assert.equal(accountClass("1930"), "1");
    assert.equal(accountClass("2010"), "2");
    assert.equal(accountClass("3001"), "3");
    assert.equal(accountGroupCode("2641"), "26");
    assert.equal(isCreditAccount("1930"), false);
    assert.equal(isCreditAccount("2010"), true);
    assert.equal(isCreditAccount("3001"), true);
    assert.equal(isCreditAccount("4010"), false);
    assert.equal(displayOre("1930", 1_000_00), 1_000_00);
    assert.equal(displayOre("2010", -1_000_00), 1_000_00);
    assert.equal(displayOre("3001", -5_000_00), 5_000_00);
    assert.equal(displayOre("4010", 3_750_00), 3_750_00);
  });
});

describe("yearStartIso / groupTitle", () => {
  it("ger årets första dag och kända grupprubriker", () => {
    assert.equal(yearStartIso(2026), "2026-01-01");
    assert.equal(groupTitle("1930", BALANS_GROUP_TITLES), "Kassa och bank");
    assert.equal(groupTitle("2010", BALANS_GROUP_TITLES), "Eget kapital");
    assert.equal(
      groupTitle("3001", RESULTAT_GROUP_TITLES),
      "Försäljning och utfört arbete"
    );
    assert.equal(groupTitle("9999", BALANS_GROUP_TITLES), "Kontogrupp 99");
  });
});

describe("buildBalanceReport", () => {
  it("delar tillgångar, eget kapital och skulder med IB/period/UB", () => {
    const report = buildBalanceReport(SAMPLE);
    const bank = report.assets.groups
      .flatMap((group) => group.accounts)
      .find((row) => row.number === "1930");
    assert.ok(bank);
    assert.equal(bank.openingOre, 100_000_00);
    assert.equal(bank.periodOre, 62_500_00);
    assert.equal(bank.closingOre, 162_500_00);

    const equity = report.equityAndLiabilities.groups
      .flatMap((group) => group.accounts)
      .find((row) => row.number === "2010");
    assert.ok(equity);
    assert.equal(equity.openingOre, 100_000_00);
    assert.equal(equity.periodOre, 0);
    assert.equal(equity.closingOre, 100_000_00);

    const vat = report.equityAndLiabilities.groups
      .flatMap((group) => group.accounts)
      .find((row) => row.number === "2611");
    assert.ok(vat);
    assert.equal(vat.closingOre, 12_500_00);
  });

  it("döljer nollkonton och lägger beräknat resultat så att rapporten balanserar", () => {
    const report = buildBalanceReport(SAMPLE);
    const numbers = [
      ...report.assets.groups.flatMap((group) =>
        group.accounts.map((row) => row.number)
      ),
      ...report.equityAndLiabilities.groups.flatMap((group) =>
        group.accounts.map((row) => row.number)
      ),
    ];
    assert.equal(numbers.includes("5010"), false);
    assert.equal(report.calculatedResult.periodOre, 12_500_00);
    assert.equal(report.calculatedResult.closingOre, 12_500_00);
    assert.equal(report.calculatedResult.openingOre, 0);
    assert.equal(report.assets.openingOre, 100_000_00);
    assert.equal(report.assets.closingOre, 162_500_00);
    assert.equal(report.equityAndLiabilities.closingOre, 162_500_00);
    assert.equal(report.balanced, true);

    const resultRow = report.equityAndLiabilities.groups
      .flatMap((group) => group.accounts)
      .find((row) => row.name === "Beräknat resultat");
    assert.ok(resultRow);
    assert.equal(resultRow.periodOre, 12_500_00);
  });

  it("visar förlust som negativt beräknat resultat", () => {
    const report = buildBalanceReport([
      move("1930", "Företagskonto", 10_000_00, -4_000_00),
      move("2010", "Eget kapital", -10_000_00, 0),
      move("5010", "Lokalhyra", 0, 4_000_00),
    ]);
    assert.equal(report.calculatedResult.periodOre, -4_000_00);
    assert.equal(report.balanced, true);
    assert.equal(report.assets.closingOre, 6_000_00);
    assert.equal(report.equityAndLiabilities.closingOre, 6_000_00);
  });
});

describe("buildIncomeReport", () => {
  it("summerar intäkter, kostnader och resultat för period och ackumulerat", () => {
    const report = buildIncomeReport(SAMPLE);
    assert.equal(report.income.title, "Intäkter");
    assert.equal(report.expenses.title, "Kostnader");
    assert.equal(report.income.periodOre, 50_000_00);
    assert.equal(report.income.closingOre, 50_000_00);
    assert.equal(report.expenses.periodOre, 37_500_00);
    assert.equal(report.expenses.closingOre, 37_500_00);
    assert.equal(report.result.periodOre, 12_500_00);
    assert.equal(report.result.ytdOre, 12_500_00);

    const sale = report.income.groups[0]?.accounts[0];
    assert.equal(sale?.number, "3001");
    assert.equal(sale?.periodOre, 50_000_00);
  });

  it("räknar ackumulerat separat från perioden och döljer nollrader", () => {
    const report = buildIncomeReport([
      move("3001", "Försäljning", 0, -10_000_00, -40_000_00, -40_000_00),
      move("4010", "Inköp", 0, 3_000_00, 15_000_00, 15_000_00),
      move("5010", "Lokalhyra", 0, 0, 0, 0),
    ]);
    assert.equal(report.result.periodOre, 7_000_00);
    assert.equal(report.result.ytdOre, 25_000_00);
    assert.equal(
      report.expenses.groups.some((group) =>
        group.accounts.some((row) => row.number === "5010")
      ),
      false
    );
  });

  it("tar med IB på resultaträkningen i ackumulerat men inte i perioden", () => {
    const report = buildIncomeReport([
      move("3001", "Försäljning", -8_000_00, -2_000_00, -10_000_00, -10_000_00),
    ]);
    const sale = report.income.groups[0]?.accounts[0];
    assert.equal(sale?.periodOre, 2_000_00);
    assert.equal(sale?.closingOre, 10_000_00);
    assert.equal(report.result.periodOre, 2_000_00);
    assert.equal(report.result.ytdOre, 10_000_00);
  });
});
