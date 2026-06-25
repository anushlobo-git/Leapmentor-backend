/**
 * @fileoverview Cache Utility Corporate Unit Tests
 * @description Validates cache hit/miss flows, serialization guards,
 * and eviction fallback states during infrastructure crashes.
 */

const createCacheUtility = require("../../../utils/cache.js");

describe("Cache Utility", () => {
  let mockRedisClient;
  let mockLogger;
  let cacheUtility;
  let mockFetchFunction;

  const mockPayload = { id: "data123", dynamic: true };

  beforeEach(() => {
    mockRedisClient = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };

    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
    };

    mockFetchFunction = jest.fn();
    cacheUtility = createCacheUtility(mockRedisClient, mockLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getOrSetCache", () => {
    test("should return serialized data immediately on cache hit paths without triggering callbacks", async () => {
      mockRedisClient.get.mockResolvedValue(JSON.stringify(mockPayload));

      const result = await cacheUtility.getOrSetCache(
        "test-key",
        3600,
        mockFetchFunction,
      );

      expect(mockRedisClient.get).toHaveBeenCalledWith("test-key");
      expect(mockFetchFunction).not.toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining("Cache HIT"),
      );
      expect(result).toEqual(mockPayload);
    });

    test("should trigger callbacks, store results, and return payloads on cache miss paths", async () => {
      mockRedisClient.get.mockResolvedValue(null);
      mockFetchFunction.mockResolvedValue(mockPayload);
      mockRedisClient.set.mockResolvedValue("OK");

      const result = await cacheUtility.getOrSetCache(
        "test-key",
        3600,
        mockFetchFunction,
      );

      expect(mockRedisClient.get).toHaveBeenCalledWith("test-key");
      expect(mockFetchFunction).toHaveBeenCalled();
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        "test-key",
        JSON.stringify(mockPayload),
        "EX",
        3600,
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining("Cache MISS"),
      );
      expect(result).toEqual(mockPayload);
    });

    test("should gracefully degrade to database fetches if the Redis read connection crashes", async () => {
      mockRedisClient.get.mockRejectedValue(new Error("Connection Timeout"));
      mockFetchFunction.mockResolvedValue(mockPayload);

      const result = await cacheUtility.getOrSetCache(
        "broken-key",
        3600,
        mockFetchFunction,
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining("Redis connection failure on GET"),
      );
      expect(mockFetchFunction).toHaveBeenCalled();
      expect(result).toEqual(mockPayload);
    });
  });

  // ── NEW: EVICTION UNIT TESTS ───────────────────────────────────────────
  describe("evictCache", () => {
    test("should issue a native deletion call and log execution telemetry on successful purges", async () => {
      mockRedisClient.del.mockResolvedValue(1);

      await cacheUtility.evictCache("target-purge-key");

      expect(mockRedisClient.del).toHaveBeenCalledWith("target-purge-key");
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining("Cache EVICT"),
      );
    });

    test("should intercept database errors silently without causing application crashes if server sever occurs", async () => {
      mockRedisClient.del.mockRejectedValue(
        new Error("Redis Node Disconnected"),
      );

      await expect(
        cacheUtility.evictCache("target-purge-key"),
      ).resolves.not.toThrow();
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining("Redis connection failure on DEL"),
      );
    });
  });
});
