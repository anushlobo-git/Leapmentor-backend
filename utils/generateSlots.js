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

/**
 * Generate slots from specific calendar dates.
 * Takes priority over weekly hours for the same date.
 */
const generateSlotsFromSpecificDates = (
  specificDates,
  durationMinutes = 60,
  bookedSlots = [],
) => {
  const result = [];
  const todayYYYYMMDD = getTodayLocal();
  const now = new Date();
  const currentTimeInMinutes = now.getHours() * 60 + now.getMinutes();

  for (const dateEntry of specificDates) {
    const { date, slots } = dateEntry;
    if (date < todayYYYYMMDD) continue;
    if (!slots?.length) continue;

    const isToday = date === todayYYYYMMDD;
    const slotsForDate = [];

    for (const timeRange of slots) {
      const blocks = splitIntoBlocks(
        timeRange.startTime,
        timeRange.endTime,
        durationMinutes,
      );

      for (const block of blocks) {
        if (isToday && timeToMinutes(block.startTime) <= currentTimeInMinutes)
          continue;
        if (isBlockBooked(block, date, bookedSlots)) continue;
        slotsForDate.push({
          startTime: block.startTime,
          endTime: block.endTime,
          isBooked: false,
        });
      }
    }

    if (slotsForDate.length > 0) {
      result.push({
        date,
        displayDate: formatDisplayDate(date),
        day: getDayName(date),
        slots: slotsForDate,
      });
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
  daysAhead = 28, // generate 4 weeks ahead by default
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

    // Skip if day not configured or not available
    if (!dayConfig?.isAvailable || !dayConfig.slots?.length) continue;

    const isToday = dateStr === todayYYYYMMDD;
    const slotsForDate = [];

    for (const timeRange of dayConfig.slots) {
      const blocks = splitIntoBlocks(
        timeRange.startTime,
        timeRange.endTime,
        durationMinutes,
      );

      for (const block of blocks) {
        // Skip past slots for today
        if (isToday && timeToMinutes(block.startTime) <= currentTimeInMinutes)
          continue;
        if (isBlockBooked(block, dateStr, bookedSlots)) continue;
        slotsForDate.push({
          startTime: block.startTime,
          endTime: block.endTime,
          isBooked: false,
        });
      }
    }

    if (slotsForDate.length > 0) {
      result.push({
        date: dateStr,
        displayDate: formatDisplayDate(dateStr),
        day: dayName,
        slots: slotsForDate,
      });
    }
  }

  return result;
};

/**
 * Combined generator — specificDates take priority over weeklyHours for same date.
 * Falls back to weeklyHours for dates not covered by specificDates.
 */
const generateAvailableSlots = (
  specificDates = [],
  weeklyHours = [],
  durationMinutes,
  bookedSlots = [],
  daysAhead = 28,
) => {
  // Dates covered by specificDates take priority
  const specificDateKeys = new Set(specificDates.map((d) => d.date));

  // Generate from specificDates
  const specificSlots = generateSlotsFromSpecificDates(
    specificDates,
    durationMinutes,
    bookedSlots,
  );

  // Generate from weeklyHours — but skip dates already covered by specificDates
  const hasWeekly = weeklyHours.some((d) => d.isAvailable && d.slots?.length);
  let weeklySlots = [];

  if (hasWeekly) {
    const allWeeklySlots = generateSlotsFromWeeklyHours(
      weeklyHours,
      durationMinutes,
      bookedSlots,
      daysAhead,
    );
    // Filter out dates already covered by specificDates
    weeklySlots = allWeeklySlots.filter((d) => !specificDateKeys.has(d.date));
  }

  // Merge and sort by date
  const merged = [...specificSlots, ...weeklySlots];
  merged.sort((a, b) => new Date(a.date) - new Date(b.date));
  return merged;
};

module.exports = {
  generateSlotsFromSpecificDates,
  generateSlotsFromWeeklyHours,
  generateAvailableSlots,
};
