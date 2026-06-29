/**
 * @fileoverview Message Repository Corporate Unit Tests
 * @description Assures precise verification of paginated messaging slices, population rules,
 * unread indices tracking, and bulk mutations with zero network dependency.
 */

const createMessageRepository = require("../../../repositories/message.repository");

describe("Message Repository", () => {
  let mockMessageModel;
  let messageRepository;

  const mockMessageRecord = {
    _id: "msg123",
    connectRequest: "req999",
    sender: "user456",
    content: "Hey mentor, are we still on for our session today?",
    readAt: null,
    createdAt: new Date("2026-06-29"),
  };

  const mockRecordsArray = [mockMessageRecord];

  // Safe Factory: Decorates a genuine Promise instance to completely avoid "manual then" linter errors
  const makeChain = (resolvedValue = null) => {
    const promise = Promise.resolve(resolvedValue);

    // Attach Mongoose chain builders directly to the native Promise, returning itself for fluid chaining
    promise.populate = jest.fn().mockReturnValue(promise);
    promise.sort = jest.fn().mockReturnValue(promise);
    promise.skip = jest.fn().mockReturnValue(promise);
    promise.limit = jest.fn().mockReturnValue(promise);
    promise.lean = jest
      .fn()
      .mockImplementation(() => Promise.resolve(resolvedValue));

    return promise;
  };

  beforeEach(() => {
    mockMessageModel = {
      find: jest.fn(),
      countDocuments: jest.fn(),
      updateMany: jest.fn(),
    };
    messageRepository = createMessageRepository(mockMessageModel);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── findPaginatedMessages ───────────────────────────────────────────────
  describe("findPaginatedMessages", () => {
    test("should execute a full sequential chronological pagination matrix pipeline", async () => {
      const mockChain = makeChain(mockRecordsArray);
      mockMessageModel.find.mockReturnValue(mockChain);

      const result = await messageRepository.findPaginatedMessages(
        "req999",
        20,
        10,
      );

      expect(mockMessageModel.find).toHaveBeenCalledWith({
        connectRequest: "req999",
      });
      expect(mockChain.populate).toHaveBeenCalledWith("sender", "name email");
      expect(mockChain.sort).toHaveBeenCalledWith({ createdAt: 1 });
      expect(mockChain.skip).toHaveBeenCalledWith(20);
      expect(mockChain.limit).toHaveBeenCalledWith(10);
      expect(mockChain.lean).toHaveBeenCalled();
      expect(result).toEqual(mockRecordsArray);
    });
  });

  // ── countMessages ───────────────────────────────────────────────────────
  describe("countMessages", () => {
    test("should calculate total aggregated channel histories within specific request boundaries", async () => {
      mockMessageModel.countDocuments.mockResolvedValue(55);

      const count = await messageRepository.countMessages("req999");

      expect(mockMessageModel.countDocuments).toHaveBeenCalledWith({
        connectRequest: "req999",
      });
      expect(count).toBe(55);
    });
  });

  // ── markMessagesAsRead ──────────────────────────────────────────────────
  describe("markMessagesAsRead", () => {
    test("should execute bulk operational reads mapping flexible timestamp overrides safely", async () => {
      mockMessageModel.updateMany.mockResolvedValue({ modifiedCount: 3 });

      const result = await messageRepository.markMessagesAsRead(
        "req999",
        "user_exclusion_id",
      );

      expect(mockMessageModel.updateMany).toHaveBeenCalledWith(
        {
          connectRequest: "req999",
          sender: { $ne: "user_exclusion_id" },
          readAt: null,
        },
        {
          $set: { readAt: expect.any(Date) },
        },
      );
      expect(result).toEqual({ modifiedCount: 3 });
    });
  });

  // ── countUnreadMessages ─────────────────────────────────────────────────
  describe("countUnreadMessages", () => {
    test("should index target incoming streams calculating precise unread criteria counters", async () => {
      mockMessageModel.countDocuments.mockResolvedValue(3);

      const unreadCount = await messageRepository.countUnreadMessages(
        "req999",
        "my_user_id",
      );

      expect(mockMessageModel.countDocuments).toHaveBeenCalledWith({
        connectRequest: "req999",
        sender: { $ne: "my_user_id" },
        readAt: null,
      });
      expect(unreadCount).toBe(3);
    });
  });
});
