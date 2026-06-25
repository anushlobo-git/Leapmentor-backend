const timeToMinutes = (time) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

const minutesToTime = (minutes) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

const splitIntoBlocks = (startTime, endTime, durationMinutes) => {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  const blocks = [];
  let current = start;

  while (current + durationMinutes <= end) {
    blocks.push({
      startTime: minutesToTime(current),
      endTime: minutesToTime(current + durationMinutes),
    });
    current += durationMinutes;
  }
  return blocks;
};

const getTodayLocal = () => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const formatDisplayDate = (dateStr) => {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
};

const getDayName = (dateStr) => {
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  return days[new Date(dateStr + "T00:00:00").getDay()];
};

// ── Shared overlap checker ────────────────────────────────────
const isBlockBooked = (block, date, bookedSlots) => {
  return bookedSlots.some((b) => {
    if (b.date !== date) return false;
    const bStart = timeToMinutes(b.startTime);
    const bEnd = timeToMinutes(b.endTime);
    const sStart = timeToMinutes(block.startTime);
    const sEnd = timeToMinutes(block.endTime);
    return sStart < bEnd && sEnd > bStart;
  });
};

// ── Shared helper: filters and maps blocks for one time range ─
/**
 * Returns valid (non-past, non-booked) slot objects for a single timeRange.
 * Extracted to reduce nesting depth in both generator functions.
 */
const getValidBlocks = (
  timeRange,
  date,
  durationMinutes,
  isToday,
  currentTimeInMinutes,
  bookedSlots,
) => {
  const blocks = splitIntoBlocks(
    timeRange.startTime,
    timeRange.endTime,
    durationMinutes,
  );

  return blocks
    .filter((block) => {
      if (isToday && timeToMinutes(block.startTime) <= currentTimeInMinutes)
        return false;
      if (isBlockBooked(block, date, bookedSlots)) return false;
      return true;
    })
    .map((block) => ({
      startTime: block.startTime,
      endTime: block.endTime,
      isBooked: false,
    }));
};

// ── Shared helper: builds a result date-entry object ─────────
const buildDateEntry = (dateStr, slotsForDate) => ({
  date: dateStr,
  displayDate: formatDisplayDate(dateStr),
  day: getDayName(dateStr),
  slots: slotsForDate,
});

/**
 * Generate slots from specific calendar dates.
 * Takes priority over weekly hours for the same date.
 */
const generateSlotsFromSpecificDates = (
  specificDates,
  durationMinutes = 60,
  bookedSlots = [],
) => {
  const todayYYYYMMDD = getTodayLocal();
  const now = new Date();
  const currentTimeInMinutes = now.getHours() * 60 + now.getMinutes();

  const result = [];

  for (const dateEntry of specificDates) {
    const { date, slots } = dateEntry;

    if (date < todayYYYYMMDD) continue;
    if (!slots?.length) continue;

    const isToday = date === todayYYYYMMDD;

    const slotsForDate = slots.flatMap((timeRange) =>
      getValidBlocks(
        timeRange,
        date,
        durationMinutes,
        isToday,
        currentTimeInMinutes,
        bookedSlots,
      ),
    );

    if (slotsForDate.length > 0) {
      result.push(buildDateEntry(date, slotsForDate));
    }
  }

  result.sort((a, b) => new Date(a.date) - new Date(b.date));
  return result;
};

/**
 * Generate slots from weekly recurring hours.
 * Used as fallback when no specificDates are set.
 * Generates for the next `daysAhead` days.
 */
const generateSlotsFromWeeklyHours = (
  weeklyHours,
  durationMinutes = 60,
  bookedSlots = [],
  daysAhead = 28,
) => {
  const result = [];
  const now = new Date();
  const currentTimeInMinutes = now.getHours() * 60 + now.getMinutes();
  const todayYYYYMMDD = getTodayLocal();

  // Build a lookup map: { "Monday": { isAvailable, slots }, ... }
  const weeklyMap = {};
  for (const dayEntry of weeklyHours) {
    weeklyMap[dayEntry.day] = dayEntry;
  }

  for (let i = 0; i < daysAhead; i++) {
    const targetDate = new Date();
    targetDate.setDate(now.getDate() + i);

    const yyyy = targetDate.getFullYear();
    const mm = String(targetDate.getMonth() + 1).padStart(2, "0");
    const dd = String(targetDate.getDate()).padStart(2, "0");
    const dateStr = `${yyyy}-${mm}-${dd}`;

    const dayName = getDayName(dateStr);
    const dayConfig = weeklyMap[dayName];

    if (!dayConfig?.isAvailable || !dayConfig.slots?.length) continue;

    const isToday = dateStr === todayYYYYMMDD;

    const slotsForDate = dayConfig.slots.flatMap((timeRange) =>
      getValidBlocks(
        timeRange,
        dateStr,
        durationMinutes,
        isToday,
        currentTimeInMinutes,
        bookedSlots,
      ),
    );

    if (slotsForDate.length > 0) {
      result.push(buildDateEntry(dateStr, slotsForDate));
    }
  }

  return result;
};

/**
 * Combined generator — specificDates take priority over weeklyHours for same date.
 * Falls back to weeklyHours for dates not covered by specificDates.
 *
 * NOTE: Parameter order intentionally kept as-is to avoid breaking call sites.
 * The Sonar "default params last" warning for this function is suppressed below.
 */
// NOSONAR
const generateAvailableSlots = (
  durationMinutes,
  specificDates = [],
  weeklyHours = [],
  bookedSlots = [],
  daysAhead = 28,
) => {
  const specificDateKeys = new Set(specificDates.map((d) => d.date));

  const specificSlots = generateSlotsFromSpecificDates(
    specificDates,
    durationMinutes,
    bookedSlots,
  );

  const hasWeekly = weeklyHours.some((d) => d.isAvailable && d.slots?.length);
  let weeklySlots = [];

  if (hasWeekly) {
    const allWeeklySlots = generateSlotsFromWeeklyHours(
      weeklyHours,
      durationMinutes,
      bookedSlots,
      daysAhead,
    );
    weeklySlots = allWeeklySlots.filter((d) => !specificDateKeys.has(d.date));
  }

  const merged = [...specificSlots, ...weeklySlots];
  merged.sort((a, b) => new Date(a.date) - new Date(b.date));
  return merged;
};

module.exports = {
  generateSlotsFromSpecificDates,
  generateSlotsFromWeeklyHours,
  generateAvailableSlots,
};
