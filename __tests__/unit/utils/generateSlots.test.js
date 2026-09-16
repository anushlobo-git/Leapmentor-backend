/**
 * @fileoverview Full statement/branch coverage suite for utils/generateSlots.js
 */

const {
  generateSlotsFromSpecificDates,
  generateSlotsFromWeeklyHours,
  generateAvailableSlots,
} = require("../../../utils/generateSlots");

describe("generateSlots utils", () => {
  // Fixed "now" = Wednesday 2026-07-01 10:30 local time
  const FIXED_NOW = new Date(2026, 6, 1, 10, 30, 0);

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(FIXED_NOW);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ── generateSlotsFromSpecificDates ─────────────────────────────────────
  describe("generateSlotsFromSpecificDates", () => {
    test("skips dates strictly before today", () => {
      const result = generateSlotsFromSpecificDates(
        [
          {
            date: "2026-06-30",
            slots: [{ startTime: "09:00", endTime: "10:00" }],
          },
        ],
        60,
      );
      expect(result).toEqual([]);
    });

    test("skips entries with no slots array or empty slots", () => {
      const result = generateSlotsFromSpecificDates(
        [
          { date: "2026-07-05", slots: [] },
          { date: "2026-07-06" }, // slots undefined
        ],
        60,
      );
      expect(result).toEqual([]);
    });

    test("includes a future date and builds a full date entry", () => {
      const result = generateSlotsFromSpecificDates(
        [
          {
            date: "2026-07-05",
            slots: [{ startTime: "09:00", endTime: "11:00" }],
          },
        ],
        60,
      );
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        date: "2026-07-05",
        day: "Sunday",
      });
      expect(result[0].displayDate).toEqual(expect.any(String));
      expect(result[0].slots).toEqual([
        { startTime: "09:00", endTime: "10:00", isBooked: false },
        { startTime: "10:00", endTime: "11:00", isBooked: false },
      ]);
    });

    test("filters out past-time blocks for today's date (isToday branch)", () => {
      // FIXED_NOW is 10:30, so a 09:00-10:00 block on today should be excluded
      // and a 11:00-12:00 block should remain
      const result = generateSlotsFromSpecificDates(
        [
          {
            date: "2026-07-01",
            slots: [{ startTime: "09:00", endTime: "12:00" }],
          },
        ],
        60,
      );
      expect(result).toHaveLength(1);
      expect(result[0].slots).toEqual([
        { startTime: "11:00", endTime: "12:00", isBooked: false },
      ]);
    });

    test("excludes a date entirely when all its blocks are filtered out", () => {
      // Today, entire window already in the past relative to 10:30
      const result = generateSlotsFromSpecificDates(
        [
          {
            date: "2026-07-01",
            slots: [{ startTime: "08:00", endTime: "10:00" }],
          },
        ],
        60,
      );
      expect(result).toEqual([]);
    });

    test("excludes blocks that overlap an existing booked slot", () => {
      const result = generateSlotsFromSpecificDates(
        [
          {
            date: "2026-07-05",
            slots: [{ startTime: "09:00", endTime: "11:00" }],
          },
        ],
        60,
        [{ date: "2026-07-05", startTime: "09:00", endTime: "10:00" }],
      );
      expect(result[0].slots).toEqual([
        { startTime: "10:00", endTime: "11:00", isBooked: false },
      ]);
    });

    test("ignores booked slots on a different date (isBlockBooked date-mismatch branch)", () => {
      const result = generateSlotsFromSpecificDates(
        [
          {
            date: "2026-07-05",
            slots: [{ startTime: "09:00", endTime: "10:00" }],
          },
        ],
        60,
        [{ date: "2026-07-06", startTime: "09:00", endTime: "10:00" }],
      );
      expect(result[0].slots).toHaveLength(1);
    });

    test("sorts multiple date entries chronologically", () => {
      const result = generateSlotsFromSpecificDates(
        [
          {
            date: "2026-07-10",
            slots: [{ startTime: "09:00", endTime: "10:00" }],
          },
          {
            date: "2026-07-03",
            slots: [{ startTime: "09:00", endTime: "10:00" }],
          },
        ],
        60,
      );
      expect(result.map((r) => r.date)).toEqual(["2026-07-03", "2026-07-10"]);
    });

    test("defaults durationMinutes and bookedSlots when omitted", () => {
      const result = generateSlotsFromSpecificDates([
        {
          date: "2026-07-05",
          slots: [{ startTime: "09:00", endTime: "10:00" }],
        },
      ]);
      expect(result[0].slots).toEqual([
        { startTime: "09:00", endTime: "10:00", isBooked: false },
      ]);
    });

    test("flatMaps multiple time ranges within a single date", () => {
      const result = generateSlotsFromSpecificDates([
        {
          date: "2026-07-05",
          slots: [
            { startTime: "09:00", endTime: "10:00" },
            { startTime: "14:00", endTime: "15:00" },
          ],
        },
      ]);
      expect(result[0].slots).toHaveLength(2);
    });
  });

  // ── generateSlotsFromWeeklyHours ────────────────────────────────────────
  describe("generateSlotsFromWeeklyHours", () => {
    test("skips days with no matching weeklyMap entry", () => {
      // Only Monday configured; most days-ahead won't match
      const result = generateSlotsFromWeeklyHours(
        [
          {
            day: "Monday",
            isAvailable: true,
            slots: [{ startTime: "09:00", endTime: "10:00" }],
          },
        ],
        60,
        [],
        3,
      );
      // Wed(today)/Thu/Fri in range — none is Monday
      expect(result).toEqual([]);
    });

    test("skips days where isAvailable is false", () => {
      const result = generateSlotsFromWeeklyHours(
        [
          {
            day: "Wednesday",
            isAvailable: false,
            slots: [{ startTime: "09:00", endTime: "10:00" }],
          },
        ],
        60,
        [],
        1,
      );
      expect(result).toEqual([]);
    });

    test("skips days where isAvailable is true but slots array is empty/missing", () => {
      const result = generateSlotsFromWeeklyHours(
        [{ day: "Wednesday", isAvailable: true, slots: [] }],
        60,
        [],
        1,
      );
      expect(result).toEqual([]);
    });

    test("generates slots for an available day and respects isToday filtering", () => {
      const result = generateSlotsFromWeeklyHours(
        [
          {
            day: "Wednesday",
            isAvailable: true,
            slots: [{ startTime: "09:00", endTime: "12:00" }],
          },
        ],
        60,
        [],
        1,
      );
      expect(result).toHaveLength(1);
      expect(result[0].date).toBe("2026-07-01");
      // 09:00-10:00 filtered out since now is 10:30
      expect(result[0].slots).toEqual([
        { startTime: "11:00", endTime: "12:00", isBooked: false },
      ]);
    });

    test("excludes booked overlaps across generated days", () => {
      const result = generateSlotsFromWeeklyHours(
        [
          {
            day: "Thursday",
            isAvailable: true,
            slots: [{ startTime: "09:00", endTime: "10:00" }],
          },
        ],
        60,
        [{ date: "2026-07-02", startTime: "09:00", endTime: "10:00" }],
        2,
      );
      expect(result).toEqual([]);
    });

    test("uses default durationMinutes, bookedSlots, and daysAhead when omitted", () => {
      const result = generateSlotsFromWeeklyHours([
        {
          day: "Wednesday",
          isAvailable: true,
          slots: [{ startTime: "11:00", endTime: "12:00" }],
        },
      ]);
      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result[0].slots[0]).toEqual({
        startTime: "11:00",
        endTime: "12:00",
        isBooked: false,
      });
    });

    test("generates entries across multiple days within daysAhead window", () => {
      const result = generateSlotsFromWeeklyHours(
        [
          {
            day: "Wednesday",
            isAvailable: true,
            slots: [{ startTime: "11:00", endTime: "12:00" }],
          },
          {
            day: "Thursday",
            isAvailable: true,
            slots: [{ startTime: "09:00", endTime: "10:00" }],
          },
        ],
        60,
        [],
        2,
      );
      expect(result).toHaveLength(2);
      expect(result.map((r) => r.date)).toEqual(["2026-07-01", "2026-07-02"]);
    });
  });

  // ── generateAvailableSlots (combined generator) ─────────────────────────
  describe("generateAvailableSlots", () => {
    test("returns only specific-date slots when weeklyHours has no available days", () => {
      const result = generateAvailableSlots(
        60,
        [
          {
            date: "2026-07-05",
            slots: [{ startTime: "09:00", endTime: "10:00" }],
          },
        ],
        [{ day: "Monday", isAvailable: false, slots: [] }],
        [],
        5,
      );
      expect(result).toHaveLength(1);
      expect(result[0].date).toBe("2026-07-05");
    });

    test("merges weekly slots in, excluding dates already covered by specificDates", () => {
      const result = generateAvailableSlots(
        60,
        [
          {
            date: "2026-07-01",
            slots: [{ startTime: "11:00", endTime: "12:00" }],
          },
        ],
        [
          {
            day: "Wednesday",
            isAvailable: true,
            slots: [{ startTime: "13:00", endTime: "14:00" }],
          },
        ],
        [],
        1,
      );
      // Only one entry for 2026-07-01 (specific-date wins; weekly for same date is dropped)
      const julyFirstEntries = result.filter((r) => r.date === "2026-07-01");
      expect(julyFirstEntries).toHaveLength(1);
      expect(julyFirstEntries[0].slots).toEqual([
        { startTime: "11:00", endTime: "12:00", isBooked: false },
      ]);
    });

    test("includes weekly slots for dates not covered by specificDates", () => {
      const result = generateAvailableSlots(
        60,
        [],
        [
          {
            day: "Wednesday",
            isAvailable: true,
            slots: [{ startTime: "11:00", endTime: "12:00" }],
          },
        ],
        [],
        1,
      );
      expect(result).toHaveLength(1);
      expect(result[0].date).toBe("2026-07-01");
    });

    test("returns an empty array when neither specificDates nor weeklyHours produce anything", () => {
      const result = generateAvailableSlots(60, [], [], [], 1);
      expect(result).toEqual([]);
    });

    test("sorts the merged specific + weekly slots chronologically", () => {
      const result = generateAvailableSlots(
        60,
        [
          {
            date: "2026-07-10",
            slots: [{ startTime: "09:00", endTime: "10:00" }],
          },
        ],
        [
          {
            day: "Thursday",
            isAvailable: true,
            slots: [{ startTime: "09:00", endTime: "10:00" }],
          },
        ],
        [],
        2,
      );
      const dates = result.map((r) => r.date);
      const sorted = [...dates].sort((a, b) => new Date(a) - new Date(b));
      expect(dates).toEqual(sorted);
    });

    test("applies default parameters when only durationMinutes is passed", () => {
      const result = generateAvailableSlots(60);
      expect(result).toEqual([]);
    });
  });
});
