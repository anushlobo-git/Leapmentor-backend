// backend/utils/generateSlots.js

const timeToMinutes = (time) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

const minutesToTime = (minutes) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

/**
 * Break a time range into session-duration blocks
 */
const splitIntoBlocks = (startTime, endTime, durationMinutes) => {
  const start  = timeToMinutes(startTime);
  const end    = timeToMinutes(endTime);
  const blocks = [];

  let current = start;
  while (current + durationMinutes <= end) {
    blocks.push({
      startTime: minutesToTime(current),
      endTime:   minutesToTime(current + durationMinutes),
    });
    current += durationMinutes;
  }

  return blocks;
};

const getTodayLocal = () => {
  const now  = new Date();
  const yyyy = now.getFullYear();
  const mm   = String(now.getMonth() + 1).padStart(2, "0");
  const dd   = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const formatDisplayDate = (dateStr) => {
  const dateObj = new Date(dateStr + "T00:00:00");
  return dateObj.toLocaleDateString("en-US", {
    weekday: "short",
    month:   "short",
    day:     "numeric",
  });
};

const getDayName = (dateStr) => {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return days[new Date(dateStr + "T00:00:00").getDay()];
};

/**
 * Generate slots from specific dates (calendar-based)
 *
 * @param {Array}  specificDates   — [{ date: "YYYY-MM-DD", slots: [{startTime, endTime}] }]
 * @param {Number} durationMinutes — session duration
 * @param {Array}  bookedSlots     — already booked/pending slots
 * @returns {Array} grouped slots by date
 */
const generateSlotsFromSpecificDates = (specificDates, durationMinutes = 60, bookedSlots = []) => {
  const result               = [];
  const todayYYYYMMDD        = getTodayLocal();
  const now                  = new Date();
  const currentTimeInMinutes = now.getHours() * 60 + now.getMinutes();

  for (const dateEntry of specificDates) {
    const { date, slots } = dateEntry;

    if (date < todayYYYYMMDD) continue;
    if (!slots?.length) continue;

    const slotsForDate = [];
    const isToday      = date === todayYYYYMMDD;

    for (const timeRange of slots) {
      const blocks = splitIntoBlocks(timeRange.startTime, timeRange.endTime, durationMinutes);

      for (const block of blocks) {
        if (isToday && timeToMinutes(block.startTime) <= currentTimeInMinutes) continue;

        const isBooked = bookedSlots.some((b) => {
          if (b.date !== date) return false;
          const bStart = timeToMinutes(b.startTime);
          const bEnd   = timeToMinutes(b.endTime);
          const sStart = timeToMinutes(block.startTime);
          const sEnd   = timeToMinutes(block.endTime);
          // overlap: block starts before booked ends AND block ends after booked starts
          return sStart < bEnd && sEnd > bStart;
        });
        if (isBooked) continue;

        slotsForDate.push({ startTime: block.startTime, endTime: block.endTime, isBooked: false });
      }
    }

    if (slotsForDate.length > 0) {
      result.push({
        date,
        displayDate: formatDisplayDate(date),
        day:         getDayName(date),
        slots:       slotsForDate,
      });
    }
  }

  result.sort((a, b) => new Date(a.date) - new Date(b.date));
  return result;
};

module.exports = { generateSlotsFromSpecificDates };