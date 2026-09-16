/**
 * Comprehensive Utils Unit Test Suite
 * Targets 100% coverage across all utils files
 */

// ── Mocks must be declared before requires ────────────────────
jest.mock("../../../models/Notification", () => ({
  create: jest.fn(),
}));
jest.mock("../../../utils/mailer", () => ({
  sendMail: jest.fn(),
}));
jest.mock("pidusage", () => jest.fn());
jest.mock("../../../config/logger", () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));
jest.mock("../../../config/env", () => ({
  nodeEnv: "development",
  jwtSecret: "test-secret",
  jwtExpiresIn: "7d",
  jwtAccessSecret: "access-secret",
  jwtRefreshSecret: "refresh-secret",
}));

// ── Imports ───────────────────────────────────────────────────
const AppError = require("../../../utils/AppError");
const { sendSuccess, sendError, STATUS } = require("../../../utils/apiResponse");
const createCookieUtils = require("../../../utils/auth.cookies");
const createAuthUtils = require("../../../utils/auth.utils");
const createCacheUtility = require("../../../utils/cache");
const catchAsync = require("../../../utils/catchAsync");
const createNotification = require("../../../utils/createNotification");
const fireAndForgetEmail = require("../../../utils/fireAndForgetEmail");
const {
  generateAvailableSlots,
  generateSlotsFromSpecificDates,
  generateSlotsFromWeeklyHours,
} = require("../../../utils/generateSlots");
const generateToken = require("../../../utils/generateToken");
const { retryWithBackoff, withTimeout } = require("../../../utils/retryWithBackoff");
const { startResourceMonitor } = require("../../../utils/resourceMonitor");
const sendWithRetry = require("../../../utils/sendWithRetry");
const logger = require("../../../config/logger");
const Notification = require("../../../models/Notification");
const mailer = require("../../../utils/mailer");
const pidusage = require("pidusage");

// ── Helpers ───────────────────────────────────────────────────
const makeMockRes = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis(),
  cookie: jest.fn(),
  clearCookie: jest.fn(),
});

// ─────────────────────────────────────────────────────────────
describe("AppError", () => {
  test("sets message, statusCode and isOperational correctly", () => {
    const err = new AppError("Not Found", 404);
    expect(err.message).toBe("Not Found");
    expect(err.statusCode).toBe(404);
    expect(err.isOperational).toBe(true);
    expect(err instanceof Error).toBe(true);
  });

  test("creates AppError with 400 statusCode", () => {
    const err = new AppError("Bad request", 400);
    expect(err.statusCode).toBe(400);
    expect(err.isOperational).toBe(true);
  });

  test("creates AppError with 500 statusCode", () => {
    const err = new AppError("Server error", 500);
    expect(err.statusCode).toBe(500);
    expect(err.isOperational).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────
describe("apiResponse", () => {
  let res;
  beforeEach(() => { res = makeMockRes(); });

  test("sendSuccess sends 201 with data and message", () => {
    sendSuccess(res, { id: 1 }, "Created", 201);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: { id: 1 }, message: "Created" });
  });

  test("sendSuccess uses defaults when called with only res", () => {
    sendSuccess(res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: null, message: "Success" });
  });

  test("sendError attaches stack in development mode", () => {
    sendError(res, "Server crashed", 500, { detail: "DB down" }, "stack-trace");
    expect(res.status).toHaveBeenCalledWith(500);
    const call = res.json.mock.calls[0][0];
    expect(call.success).toBe(false);
    expect(call.message).toBe("Server crashed");
    expect(call.error).toEqual({ detail: "DB down" });
    expect(call.stack).toBe("stack-trace");
  });

  test("sendError omits stack when not in development mode", () => {
    const env = require("../../../config/env");
    const original = env.nodeEnv;
    env.nodeEnv = "production";
    sendError(res, "Oops", 500, null, "trace");
    const call = res.json.mock.calls[0][0];
    expect(call.stack).toBeUndefined();
    env.nodeEnv = original;
  });

  test("sendError uses defaults when only res is passed", () => {
    sendError(res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false, data: null, message: "Something went wrong", error: null,
    });
  });

  test("STATUS object has correct HTTP status codes", () => {
    expect(STATUS.OK).toBe(200);
    expect(STATUS.CREATED).toBe(201);
    expect(STATUS.NO_CONTENT).toBe(204);
    expect(STATUS.BAD_REQUEST).toBe(400);
    expect(STATUS.UNAUTHORIZED).toBe(401);
    expect(STATUS.FORBIDDEN).toBe(403);
    expect(STATUS.NOT_FOUND).toBe(404);
    expect(STATUS.CONFLICT).toBe(409);
    expect(STATUS.VALIDATION_ERROR).toBe(422);
    expect(STATUS.SERVER_ERROR).toBe(500);
  });
});

// ─────────────────────────────────────────────────────────────
describe("auth.cookies", () => {
  let res;
  beforeEach(() => { res = makeMockRes(); });

  test("setAuthCookies sets refreshToken and authRole in non-prod mode", () => {
    const utils = createCookieUtils({ isProd: false });
    utils.setAuthCookies(res, "my-token", "mentor");
    expect(res.cookie).toHaveBeenCalledWith("refreshToken", "my-token", expect.objectContaining({ httpOnly: true, secure: false }));
    expect(res.cookie).toHaveBeenCalledWith("authRole", "mentor", expect.objectContaining({ httpOnly: false }));
  });

  test("setAuthCookies sets secure cookies in prod mode", () => {
    const utils = createCookieUtils({ isProd: true });
    utils.setAuthCookies(res, "prod-token", "mentee");
    expect(res.cookie).toHaveBeenCalledWith("refreshToken", "prod-token", expect.objectContaining({ secure: true, sameSite: "none" }));
  });

  test("setAuthCookies skips authRole when role is falsy", () => {
    const utils = createCookieUtils({ isProd: false });
    utils.setAuthCookies(res, "my-token", null);
    expect(res.cookie).toHaveBeenCalledTimes(1);
    expect(res.cookie).toHaveBeenCalledWith("refreshToken", "my-token", expect.any(Object));
  });

  test("clearAuthCookies clears both refreshToken and authRole", () => {
    const utils = createCookieUtils({ isProd: false });
    utils.clearAuthCookies(res);
    expect(res.clearCookie).toHaveBeenCalledWith("refreshToken", expect.any(Object));
    expect(res.clearCookie).toHaveBeenCalledWith("authRole", expect.objectContaining({ httpOnly: false }));
  });

  test("derives isProd from env.nodeEnv when config.isProd is not set", () => {
    const env = require("../../../config/env");
    const originalEnv = env.nodeEnv;
    env.nodeEnv = "production";
    const utils = createCookieUtils({});
    utils.setAuthCookies(res, "token", "admin");
    expect(res.cookie).toHaveBeenCalledWith("refreshToken", "token", expect.objectContaining({ secure: true }));
    env.nodeEnv = originalEnv;
  });
});

// ─────────────────────────────────────────────────────────────
describe("auth.utils", () => {
  const mockJwt = {
    sign: jest.fn().mockReturnValue("signed-token"),
    verify: jest.fn(),
  };
  const mockCrypto = {
    createHmac: jest.fn().mockReturnValue({
      update: jest.fn().mockReturnThis(),
      digest: jest.fn().mockReturnValue("mocked-hash"),
    }),
  };
  const mockGoogleClient = { auth: "mock" };
  const authUtils = createAuthUtils(
    {
      jwtSecret: "secret",
      jwtAccessSecret: "access-secret",
      jwtRefreshSecret: "refresh-secret",
      stateSecret: "state-secret",
      jwtExpiresIn: "7d",
    },
    mockJwt,
    mockCrypto,
    mockGoogleClient
  );

  beforeEach(() => jest.clearAllMocks());

  test("signToken calls jwt.sign with id and secret", () => {
    const token = authUtils.signToken("user123");
    expect(mockJwt.sign).toHaveBeenCalledWith({ id: "user123" }, "secret", { expiresIn: "7d" });
    expect(token).toBe("signed-token");
  });

  test("signAccessToken signs with access secret and 15m expiry", () => {
    authUtils.signAccessToken("user456");
    expect(mockJwt.sign).toHaveBeenCalledWith({ id: "user456", type: "access" }, "access-secret", { expiresIn: "15m" });
  });

  test("signRefreshToken signs with refresh secret and 7d expiry", () => {
    authUtils.signRefreshToken("user789");
    expect(mockJwt.sign).toHaveBeenCalledWith({ id: "user789", type: "refresh" }, "refresh-secret", { expiresIn: "7d" });
  });

  test("validateRoles returns valid=true for mentor", () => {
    expect(authUtils.validateRoles(["mentor"])).toEqual({ valid: true, uniqueRoles: ["mentor"] });
  });

  test("validateRoles returns valid=true for mentee", () => {
    expect(authUtils.validateRoles(["mentee"])).toEqual({ valid: true, uniqueRoles: ["mentee"] });
  });

  test("validateRoles returns valid=true for both roles", () => {
    const result = authUtils.validateRoles(["mentor", "mentee"]);
    expect(result.valid).toBe(true);
  });

  test("validateRoles returns valid=false for invalid role", () => {
    const result = authUtils.validateRoles(["admin"]);
    expect(result.valid).toBe(false);
    expect(result.message).toContain("Invalid role");
  });

  test("validateRoles deduplicates roles", () => {
    const result = authUtils.validateRoles(["mentor", "mentor"]);
    expect(result.valid).toBe(true);
    expect(result.uniqueRoles).toHaveLength(1);
  });

  test("signState creates base64.hash state string", () => {
    const state = authUtils.signState({ redirect: "/dashboard" });
    expect(state).toContain(".mocked-hash");
    expect(mockCrypto.createHmac).toHaveBeenCalledWith("sha256", "state-secret");
  });

  test("verifyState throws on tampered signature", () => {
    expect(() => authUtils.verifyState("validdata.wrongsig")).toThrow("Invalid state parameter");
  });

  test("verifyState accepts valid state and returns payload", () => {
    const crypto = require("crypto");
    const realUtils = createAuthUtils(
      { jwtSecret: "s", jwtAccessSecret: "a", jwtRefreshSecret: "r", stateSecret: "real-state" },
      mockJwt, crypto, {}
    );
    const payload = { userId: "abc" };
    const signed = realUtils.signState(payload);
    const decoded = realUtils.verifyState(signed);
    expect(decoded).toEqual(payload);
  });

  test("googleClient is exposed on returned object", () => {
    expect(authUtils.googleClient).toBe(mockGoogleClient);
  });
});

// ─────────────────────────────────────────────────────────────
describe("cache.js", () => {
  let mockRedis, mockLogger, cache;

  beforeEach(() => {
    mockRedis = { get: jest.fn(), set: jest.fn(), del: jest.fn() };
    mockLogger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };
    cache = createCacheUtility(mockRedis, mockLogger);
  });

  test("getOrSetCache returns parsed value on cache HIT", async () => {
    mockRedis.get.mockResolvedValue(JSON.stringify({ val: 42 }));
    const val = await cache.getOrSetCache("key1", 60, jest.fn());
    expect(val).toEqual({ val: 42 });
    // logger.info is called with just the message string (no second arg)
    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining("HIT"));
  });

  test("getOrSetCache calls fetchFunction on cache MISS and writes to cache", async () => {
    mockRedis.get.mockResolvedValue(null);
    mockRedis.set.mockResolvedValue("OK");
    const fetchFn = jest.fn().mockResolvedValue({ data: "fresh" });
    const val = await cache.getOrSetCache("key2", 60, fetchFn);
    expect(val).toEqual({ data: "fresh" });
    expect(mockRedis.set).toHaveBeenCalledWith("key2", JSON.stringify({ data: "fresh" }), "EX", 60);
  });

  test("getOrSetCache does NOT write to cache if fetchFunction returns null", async () => {
    mockRedis.get.mockResolvedValue(null);
    const fetchFn = jest.fn().mockResolvedValue(null);
    await cache.getOrSetCache("key3", 60, fetchFn);
    expect(mockRedis.set).not.toHaveBeenCalled();
  });

  test("getOrSetCache does NOT write to cache if fetchFunction returns undefined", async () => {
    mockRedis.get.mockResolvedValue(null);
    const fetchFn = jest.fn().mockResolvedValue(undefined);
    await cache.getOrSetCache("key4", 60, fetchFn);
    expect(mockRedis.set).not.toHaveBeenCalled();
  });

  test("getOrSetCache gracefully handles Redis GET failure and falls through to fetchFunction", async () => {
    mockRedis.get.mockRejectedValue(new Error("Redis down"));
    mockRedis.set.mockResolvedValue("OK");
    const fetchFn = jest.fn().mockResolvedValue({ fallback: true });
    const val = await cache.getOrSetCache("key5", 60, fetchFn);
    expect(val).toEqual({ fallback: true });
    expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining("Redis connection failure on GET"));
  });

  test("getOrSetCache handles corrupted JSON in cache and re-fetches", async () => {
    mockRedis.get.mockResolvedValue("{INVALID_JSON}");
    mockRedis.del.mockResolvedValue(1);
    mockRedis.set.mockResolvedValue("OK");
    const fetchFn = jest.fn().mockResolvedValue({ recovered: true });
    const val = await cache.getOrSetCache("key6", 60, fetchFn);
    expect(val).toEqual({ recovered: true });
    expect(mockRedis.del).toHaveBeenCalledWith("key6");
  });

  test("getOrSetCache handles del failure on corrupted entry gracefully", async () => {
    mockRedis.get.mockResolvedValue("{BAD}");
    mockRedis.del.mockRejectedValue(new Error("Del failed"));
    mockRedis.set.mockResolvedValue("OK");
    const fetchFn = jest.fn().mockResolvedValue("ok");
    const val = await cache.getOrSetCache("key7", 60, fetchFn);
    expect(val).toBe("ok");
    expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining("Failed to evict"));
  });

  test("getOrSetCache gracefully handles Redis SET failure", async () => {
    mockRedis.get.mockResolvedValue(null);
    mockRedis.set.mockRejectedValue(new Error("SET error"));
    const fetchFn = jest.fn().mockResolvedValue({ item: 1 });
    const val = await cache.getOrSetCache("key8", 60, fetchFn);
    expect(val).toEqual({ item: 1 });
    expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining("Redis connection failure on SET"));
  });

  test("evictCache deletes key and logs success", async () => {
    mockRedis.del.mockResolvedValue(1);
    await cache.evictCache("evict-key");
    expect(mockRedis.del).toHaveBeenCalledWith("evict-key");
    // cache.js: logger.info(`♻️ Cache EVICT | Key: ${key}`) — single arg
    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining("EVICT"));
  });

  test("evictCache gracefully handles Redis DEL failure", async () => {
    mockRedis.del.mockRejectedValue(new Error("DEL failed"));
    await cache.evictCache("bad-key");
    // cache.js: logger.error(`🚨 Redis connection failure on DEL...`) — single arg
    expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining("Redis connection failure on DEL"));
  });
});

// ─────────────────────────────────────────────────────────────
describe("catchAsync", () => {
  test("does not call next when async fn resolves", async () => {
    const next = jest.fn();
    const fn = catchAsync(async () => "result");
    await fn({}, {}, next);
    expect(next).not.toHaveBeenCalled();
  });

  test("calls next with error when async fn rejects", async () => {
    const next = jest.fn();
    const fn = catchAsync(async () => { throw new Error("async error"); });
    await fn({}, {}, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

// ─────────────────────────────────────────────────────────────
describe("createNotification", () => {
  beforeEach(() => jest.clearAllMocks());

  test("creates notification and logs success", async () => {
    Notification.create.mockResolvedValue({ _id: "notif123" });
    await createNotification({ recipient: "u1", type: "alert", title: "Hi", message: "Hello" });
    expect(Notification.create).toHaveBeenCalledWith(expect.objectContaining({ recipient: "u1", type: "alert" }));
    expect(logger.info).toHaveBeenCalledWith("Notification created", expect.any(Object));
  });

  test("logs error when Notification.create fails", async () => {
    Notification.create.mockRejectedValue(new Error("DB error"));
    await createNotification({ recipient: "u2", type: "info", title: "T", message: "M" });
    expect(logger.error).toHaveBeenCalledWith("Failed to create notification", expect.any(Object));
  });

  test("uses empty object as default for metadata", async () => {
    Notification.create.mockResolvedValue({ _id: "n1" });
    await createNotification({ recipient: "u3", type: "info", title: "T", message: "M" });
    expect(Notification.create).toHaveBeenCalledWith(expect.objectContaining({ metadata: {} }));
  });
});

// ─────────────────────────────────────────────────────────────
// NOTE: fireAndForgetEmail uses setImmediate + async inside.
// Do NOT use jest.useFakeTimers() anywhere in this file at describe-scope
// as it freezes setImmediate for all tests. Fake timers are scoped to
// retryWithBackoff / sendWithRetry using beforeEach/afterEach below.
describe("fireAndForgetEmail", () => {
  beforeEach(() => jest.clearAllMocks());

  test("calls emailFn and logs success in background", async () => {
    const emailFn = jest.fn().mockResolvedValue(true);
    fireAndForgetEmail(emailFn, "welcome-email");
    // Flush the setImmediate queue, then allow the async fn inside to resolve
    await new Promise((resolve) => setImmediate(resolve));
    await Promise.resolve(); // allow the inner async to settle
    expect(emailFn).toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining("welcome-email"));
  });

  test("logs error and does not throw when emailFn fails", async () => {
    const emailFn = jest.fn().mockRejectedValue(new Error("SMTP failure"));
    fireAndForgetEmail(emailFn, "otp-email");
    await new Promise((resolve) => setImmediate(resolve));
    await Promise.resolve();
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining("otp-email"),
      expect.any(Object)
    );
  });
});

// ─────────────────────────────────────────────────────────────
describe("generateSlots", () => {
  const FUTURE_DATE = "2099-12-25";
  const PAST_DATE = "2000-01-01";

  test("generateSlotsFromSpecificDates skips past dates", () => {
    const result = generateSlotsFromSpecificDates(
      [{ date: PAST_DATE, slots: [{ startTime: "09:00", endTime: "10:00" }] }], 60
    );
    expect(result).toHaveLength(0);
  });

  test("generateSlotsFromSpecificDates skips entries with empty slots", () => {
    const result = generateSlotsFromSpecificDates(
      [{ date: FUTURE_DATE, slots: [] }], 60
    );
    expect(result).toHaveLength(0);
  });

  test("generateSlotsFromSpecificDates skips entries with null slots", () => {
    const result = generateSlotsFromSpecificDates(
      [{ date: FUTURE_DATE, slots: null }], 60
    );
    expect(result).toHaveLength(0);
  });

  test("generateSlotsFromSpecificDates generates valid slots for future date", () => {
    const result = generateSlotsFromSpecificDates(
      [{ date: FUTURE_DATE, slots: [{ startTime: "09:00", endTime: "11:00" }] }], 60
    );
    expect(result).toHaveLength(1);
    expect(result[0].slots).toHaveLength(2);
    expect(result[0].slots[0].startTime).toBe("09:00");
    expect(result[0].slots[0].isBooked).toBe(false);
  });

  test("generateSlotsFromSpecificDates excludes exactly-booked slots", () => {
    // Booking 09:00-10:00 exactly: blocks 09:00 slot, leaves 10:00 free (bEnd===sStart so no overlap)
    const booked = [{ date: FUTURE_DATE, startTime: "09:00", endTime: "10:00" }];
    const result = generateSlotsFromSpecificDates(
      [{ date: FUTURE_DATE, slots: [{ startTime: "09:00", endTime: "11:00" }] }], 60, booked
    );
    expect(result[0].slots).toHaveLength(1);
    expect(result[0].slots[0].startTime).toBe("10:00");
  });

  test("generateSlotsFromSpecificDates returns empty array when all slots booked", () => {
    const booked = [
      { date: FUTURE_DATE, startTime: "09:00", endTime: "10:00" },
      { date: FUTURE_DATE, startTime: "10:00", endTime: "11:00" },
    ];
    const result = generateSlotsFromSpecificDates(
      [{ date: FUTURE_DATE, slots: [{ startTime: "09:00", endTime: "11:00" }] }], 60, booked
    );
    expect(result).toHaveLength(0);
  });

  test("generateSlotsFromSpecificDates sorts results by date ascending", () => {
    const date1 = "2099-12-24";
    const date2 = "2099-12-25";
    const result = generateSlotsFromSpecificDates([
      { date: date2, slots: [{ startTime: "09:00", endTime: "10:00" }] },
      { date: date1, slots: [{ startTime: "09:00", endTime: "10:00" }] },
    ], 60);
    expect(result[0].date).toBe(date1);
    expect(result[1].date).toBe(date2);
  });

  test("generateSlotsFromSpecificDates has correct displayDate and day fields", () => {
    const result = generateSlotsFromSpecificDates(
      [{ date: FUTURE_DATE, slots: [{ startTime: "09:00", endTime: "10:00" }] }], 60
    );
    expect(result[0]).toHaveProperty("displayDate");
    expect(result[0]).toHaveProperty("day");
  });

  test("generateSlotsFromWeeklyHours generates slots for available days", () => {
    const days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayName = days[tomorrow.getDay()];
    const weeklyHours = [{ day: dayName, isAvailable: true, slots: [{ startTime: "09:00", endTime: "11:00" }] }];
    const result = generateSlotsFromWeeklyHours(weeklyHours, 60, [], 3);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].slots[0].startTime).toBe("09:00");
  });

  test("generateSlotsFromWeeklyHours skips days marked as not available", () => {
    const weeklyHours = [{ day: "Monday", isAvailable: false, slots: [{ startTime: "09:00", endTime: "10:00" }] }];
    const result = generateSlotsFromWeeklyHours(weeklyHours, 60, [], 7);
    const mondayResults = result.filter(d => d.day === "Monday");
    expect(mondayResults).toHaveLength(0);
  });

  test("generateSlotsFromWeeklyHours skips days with empty slots array", () => {
    const weeklyHours = [{ day: "Tuesday", isAvailable: true, slots: [] }];
    const result = generateSlotsFromWeeklyHours(weeklyHours, 60, [], 14);
    const tuesdayResults = result.filter(d => d.day === "Tuesday");
    expect(tuesdayResults).toHaveLength(0);
  });

  test("generateSlotsFromWeeklyHours skips days not in weeklyMap", () => {
    // Only Saturday in config — all other days should produce no results
    const weeklyHours = [{ day: "Saturday", isAvailable: true, slots: [{ startTime: "09:00", endTime: "10:00" }] }];
    const result = generateSlotsFromWeeklyHours(weeklyHours, 60, [], 7);
    result.forEach(d => expect(d.day).toBe("Saturday"));
  });

  test("generateAvailableSlots returns empty array with no config", () => {
    const result = generateAvailableSlots(60, [], [], [], 7);
    expect(Array.isArray(result)).toBe(true);
  });

  test("generateAvailableSlots uses specificDates with priority over weekly for same date", () => {
    const days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yyyy = tomorrow.getFullYear();
    const mm = String(tomorrow.getMonth() + 1).padStart(2, "0");
    const dd = String(tomorrow.getDate()).padStart(2, "0");
    const tomorrowStr = `${yyyy}-${mm}-${dd}`;
    const dayName = days[tomorrow.getDay()];

    const weeklyHours = [{ day: dayName, isAvailable: true, slots: [{ startTime: "14:00", endTime: "16:00" }] }];
    const specificDates = [{ date: tomorrowStr, slots: [{ startTime: "09:00", endTime: "10:00" }] }];
    const result = generateAvailableSlots(60, specificDates, weeklyHours, [], 3);
    const tomorrowResult = result.find(d => d.date === tomorrowStr);
    expect(tomorrowResult).toBeDefined();
    expect(tomorrowResult.slots[0].startTime).toBe("09:00");
  });

  test("generateAvailableSlots with only specificDates returns them", () => {
    const result = generateAvailableSlots(
      60,
      [{ date: FUTURE_DATE, slots: [{ startTime: "10:00", endTime: "11:00" }] }],
      [], [], 7
    );
    expect(result).toHaveLength(1);
    expect(result[0].date).toBe(FUTURE_DATE);
  });

  test("isBlockBooked: partial overlap blocks the slot (sStart < bEnd && sEnd > bStart)", () => {
    // Booking 08:30-09:30 overlaps 09:00-10:00 (09:00 < 09:30 && 10:00 > 08:30) → blocked
    // Does NOT overlap 10:00-11:00 (10:00 < 09:30 is false) → free
    const booked = [{ date: FUTURE_DATE, startTime: "08:30", endTime: "09:30" }];
    const result = generateSlotsFromSpecificDates(
      [{ date: FUTURE_DATE, slots: [{ startTime: "09:00", endTime: "11:00" }] }], 60, booked
    );
    const times = (result[0]?.slots || []).map(s => s.startTime);
    expect(times).not.toContain("09:00"); // blocked by overlap
    expect(times).toContain("10:00");     // free — booking ends before this slot starts
  });
});

// ─────────────────────────────────────────────────────────────
describe("generateToken", () => {
  test("returns a non-empty string token", () => {
    const token = generateToken("user-id-123");
    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────
describe("retryWithBackoff", () => {
  // Fake timers scoped properly — activated per test, not at describe-load-time
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  test("resolves immediately on first success", async () => {
    const fn = jest.fn().mockResolvedValue("ok");
    const promise = retryWithBackoff(fn, "test-op");
    await jest.runAllTimersAsync();
    await promise;
    expect(fn).toHaveBeenCalledTimes(1);
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining("succeeded"), expect.any(Object));
  });

  test("retries on failure and succeeds on second attempt", async () => {
    const fn = jest.fn()
      .mockRejectedValueOnce(new Error("first fail"))
      .mockResolvedValueOnce("ok");
    const promise = retryWithBackoff(fn, "retry-op");
    await jest.runAllTimersAsync();
    await promise;
    expect(fn).toHaveBeenCalledTimes(2);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("Retrying"), expect.any(Object));
  });

  test("throws lastError after all retries exhausted", async () => {
    const fn = jest.fn().mockRejectedValue(new Error("persistent fail"));
    // Attach .catch() BEFORE advancing timers to prevent unhandled rejection warning
    const promise = retryWithBackoff(fn, "exhaust-op");
    const settled = promise.then(() => ({ ok: true }), (e) => ({ ok: false, err: e }));
    await jest.runAllTimersAsync();
    const result = await settled;
    expect(result.ok).toBe(false);
    expect(result.err.message).toBe("persistent fail");
    expect(fn).toHaveBeenCalledTimes(3);
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining("failed after"), expect.any(Object));
  });

  test("calls onExhausted callback instead of throwing when provided", async () => {
    const fn = jest.fn().mockRejectedValue(new Error("always fails"));
    const onExhausted = jest.fn();
    const promise = retryWithBackoff(fn, "exhaust-cb", { onExhausted });
    await jest.runAllTimersAsync();
    await promise;
    expect(onExhausted).toHaveBeenCalledWith(expect.any(Error));
  });

  test("uses withTimeout when timeoutMs option is provided", async () => {
    const fn = jest.fn().mockResolvedValue("quick");
    const promise = retryWithBackoff(fn, "timed-op", { timeoutMs: 5000 });
    await jest.runAllTimersAsync();
    await promise;
    expect(fn).toHaveBeenCalledTimes(1);
  });

  test("withTimeout resolves when promise resolves before timeout", async () => {
    const p = Promise.resolve("fast");
    const result = await withTimeout(p, 5000, "test");
    expect(result).toBe("fast");
  });

  test("withTimeout rejects when timeout fires before promise", async () => {
    // Create a promise that never resolves
    const p = new Promise(() => {});
    const racePromise = withTimeout(p, 100, "slow-op");
    jest.advanceTimersByTime(200);
    await expect(racePromise).rejects.toThrow("Timeout: slow-op exceeded 100ms");
  });
});

// ─────────────────────────────────────────────────────────────
describe("resourceMonitor", () => {
  beforeEach(() => jest.clearAllMocks());

  test("startResourceMonitor returns a timer handle with explicit interval", () => {
    const timer = startResourceMonitor(100000);
    expect(timer).toBeDefined();
    clearInterval(timer);
  });

  test("startResourceMonitor uses default 60s interval when called without args", () => {
    // Covers the default parameter branch: intervalMs = 60_000
    const timer = startResourceMonitor();
    expect(timer).toBeDefined();
    clearInterval(timer);
  });

  test("logs resource usage stats on each interval tick", async () => {
    pidusage.mockResolvedValue({ cpu: 5.5, memory: 1024 * 1024 * 100, elapsed: 5000 });
    const timer = startResourceMonitor(50);
    await new Promise((r) => setTimeout(r, 120));
    clearInterval(timer);
    expect(logger.info).toHaveBeenCalledWith(
      "Resource usage snapshot",
      expect.objectContaining({ cpu_percent: expect.any(Number), memory_mb: expect.any(Number) })
    );
  });

  test("logs error when pidusage throws", async () => {
    pidusage.mockRejectedValue(new Error("pidusage failed"));
    const timer = startResourceMonitor(50);
    await new Promise((r) => setTimeout(r, 120));
    clearInterval(timer);
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining("Resource monitor failed"));
  });
});

// ─────────────────────────────────────────────────────────────
describe("sendWithRetry", () => {
  // Properly scoped fake timers — not at describe-load-time
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  test("calls mailer.sendMail with provided mail options", async () => {
    mailer.sendMail.mockResolvedValue({ messageId: "abc123" });
    const mailOptions = { to: "test@example.com", subject: "Hello", html: "<p>Hi</p>" };
    const promise = sendWithRetry(mailOptions, "test-email");
    await jest.runAllTimersAsync();
    await promise;
    expect(mailer.sendMail).toHaveBeenCalledWith(mailOptions);
  });

  test("uses default label when no label provided — covers default param branch", async () => {
    mailer.sendMail.mockResolvedValue({ messageId: "abc" });
    // sendWithRetry(mailOptions, label = "email") — call without label to hit default
    const promise = sendWithRetry({ to: "a@b.com" });
    await jest.runAllTimersAsync();
    await promise;
    expect(mailer.sendMail).toHaveBeenCalled();
  });

  test("throws after all retries are exhausted on persistent failure", async () => {
    mailer.sendMail.mockRejectedValue(new Error("SMTP timeout"));
    // Attach catch BEFORE advancing timers to prevent unhandled rejection
    const promise = sendWithRetry({ to: "fail@test.com" }, "fail-email");
    const settled = promise.then(() => ({ ok: true }), (e) => ({ ok: false, err: e }));
    await jest.runAllTimersAsync();
    const result = await settled;
    expect(result.ok).toBe(false);
    expect(result.err.message).toBe("SMTP timeout");
  });
});
