import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  accountKindForUser,
  aggregateTimeReportRows,
  formatClock,
  formatHours,
  isTimeEntryVisible,
  monthLabelSv,
  timeReportCaption,
  timeReportScope,
  type TimeEntryHint,
} from "./time-reports";

const NOVUS = "novus";
const KLOVER = "klover";
const ANNA = "anna";
const ERIK = "erik";

function entry(
  companyId: string,
  companyName: string,
  userId: string,
  workDate: string,
  minutes: number
): TimeEntryHint {
  return { companyId, companyName, userId, workDate, minutes };
}

describe("timeReportScope", () => {
  it("behandlar nuvarande användare som huvudkonto", () => {
    assert.equal(accountKindForUser({ id: ANNA }), "huvudkonto");
    assert.deepEqual(timeReportScope("huvudkonto", ANNA), {
      kind: "huvudkonto",
    });
  });

  it("anställd ser bara egna timmar", () => {
    const scope = timeReportScope("anstalld", ERIK);
    assert.deepEqual(scope, { kind: "anstalld", userId: ERIK });
    assert.equal(isTimeEntryVisible(ERIK, scope), true);
    assert.equal(isTimeEntryVisible(ANNA, scope), false);
    assert.equal(timeReportCaption(scope), "Dina timmar.");
  });

  it("huvudkonto ser allas timmar", () => {
    const scope = timeReportScope("huvudkonto", ANNA);
    assert.equal(isTimeEntryVisible(ANNA, scope), true);
    assert.equal(isTimeEntryVisible(ERIK, scope), true);
    assert.equal(timeReportCaption(scope), "Byråns alla timmar.");
  });
});

describe("aggregateTimeReportRows", () => {
  it("ger två rader för samma företag i två månader", () => {
    const rows = aggregateTimeReportRows(
      [
        entry(NOVUS, "Novus AB", ANNA, "2026-09-10", 180),
        entry(NOVUS, "Novus AB", ANNA, "2026-10-08", 120),
      ],
      { kind: "huvudkonto" }
    );
    assert.deepEqual(
      rows.map((row) => [row.companyName, row.monthLabel, row.hoursLabel]),
      [
        ["Novus AB", "oktober 2026", "2"],
        ["Novus AB", "september 2026", "3"],
      ]
    );
  });

  it("ger två rader för två företag i samma månad", () => {
    const rows = aggregateTimeReportRows(
      [
        entry(NOVUS, "Novus AB", ANNA, "2026-09-10", 180),
        entry(KLOVER, "Klöver AB", ERIK, "2026-09-20", 180),
      ],
      { kind: "huvudkonto" }
    );
    assert.deepEqual(
      rows.map((row) => [row.companyName, row.monthLabel, row.hoursLabel]),
      [
        ["Klöver AB", "september 2026", "3"],
        ["Novus AB", "september 2026", "3"],
      ]
    );
  });

  it("summerar flera personer på samma företag × månad för huvudkonto", () => {
    const rows = aggregateTimeReportRows(
      [
        entry(NOVUS, "Novus AB", ANNA, "2026-09-10", 120),
        entry(NOVUS, "Novus AB", ERIK, "2026-09-18", 60),
        entry(NOVUS, "Novus AB", ANNA, "2026-10-08", 120),
        entry(KLOVER, "Klöver AB", ERIK, "2026-09-20", 180),
      ],
      { kind: "huvudkonto" }
    );
    assert.deepEqual(
      rows.map((row) => [row.companyName, row.monthLabel, row.hoursLabel]),
      [
        ["Novus AB", "oktober 2026", "2"],
        ["Klöver AB", "september 2026", "3"],
        ["Novus AB", "september 2026", "3"],
      ]
    );
  });

  it("lägger poster under företag × månad, sorterade på datum", () => {
    const rows = aggregateTimeReportRows(
      [
        {
          ...entry(NOVUS, "Novus AB", ERIK, "2026-09-18", 60),
          startTime: "13:30",
          summary: "Momsfrågor",
        },
        {
          ...entry(NOVUS, "Novus AB", ANNA, "2026-09-10", 60),
          startTime: "09:00",
          summary: "Avstämning",
        },
        {
          ...entry(NOVUS, "Novus AB", ANNA, "2026-09-12", 60),
          startTime: "14:15",
          summary: "Bankhändelser",
        },
      ],
      { kind: "huvudkonto" }
    );
    assert.equal(rows.length, 1);
    assert.deepEqual(
      rows[0]?.entries.map((item) => [
        item.dateLabel,
        item.timeLabel,
        item.summary,
        item.hoursLabel,
      ]),
      [
        ["2026-09-10", "09:00", "Avstämning", "1"],
        ["2026-09-12", "14:15", "Bankhändelser", "1"],
        ["2026-09-18", "13:30", "Momsfrågor", "1"],
      ]
    );
  });

  it("filtrerar anställd till bara egna timmar", () => {
    const rows = aggregateTimeReportRows(
      [
        entry(NOVUS, "Novus AB", ANNA, "2026-09-10", 120),
        entry(NOVUS, "Novus AB", ERIK, "2026-09-18", 60),
        entry(KLOVER, "Klöver AB", ERIK, "2026-09-20", 180),
      ],
      { kind: "anstalld", userId: ERIK }
    );
    assert.deepEqual(
      rows.map((row) => [row.companyName, row.monthLabel, row.hoursLabel]),
      [
        ["Klöver AB", "september 2026", "3"],
        ["Novus AB", "september 2026", "1"],
      ]
    );
  });
});

describe("formatHours / monthLabelSv", () => {
  it("formaterar hela och halva timmar på svenska", () => {
    assert.equal(formatHours(180), "3");
    assert.equal(formatHours(120), "2");
    assert.equal(formatHours(90), "1,5");
  });

  it("skriver månad med svenskt namn", () => {
    assert.equal(monthLabelSv("2026-09"), "september 2026");
    assert.equal(monthLabelSv("2026-10"), "oktober 2026");
  });

  it("visar klockslag som HH:MM", () => {
    assert.equal(formatClock("9:00"), "09:00");
    assert.equal(formatClock("13:30:00"), "13:30");
  });
});
