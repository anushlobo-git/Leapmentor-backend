const createMessageService = require("../../../services/message.service");

jest.mock("../../../mappers/message.mapper", () => ({
  toMessageDTO: jest.fn((msg) => msg),
}));

describe("Message Service", () => {
  let mockMessageRepo, mockConnectRepo, service;

  beforeEach(() => {
    mockMessageRepo = {
      findPaginatedMessages: jest.fn(),
      countMessages: jest.fn(),
      markMessagesAsRead: jest.fn(),
      countUnreadMessages: jest.fn(),
    };
    mockConnectRepo = { findById: jest.fn() };

    service = createMessageService({
      messageRepository: mockMessageRepo,
      connectRequestRepository: mockConnectRepo,
    });
  });

  afterEach(() => jest.clearAllMocks());

  // ── getChatHistory ──────────────────────────────────────────────────────
  describe("getChatHistory", () => {
    test("throws 404 if connection not found", async () => {
      mockConnectRepo.findById.mockResolvedValue(null);

      await expect(
        service.getChatHistory("invalid_id", "u1", {}),
      ).rejects.toMatchObject({
        statusCode: 404,
        message: "Session context record not found matching criteria",
      });
    });

    test("throws 403 if user is neither mentor nor mentee", async () => {
      mockConnectRepo.findById.mockResolvedValue({
        mentor: "m1",
        mentee: "m2",
      });

      await expect(
        service.getChatHistory("room_01", "outsider", {}),
      ).rejects.toMatchObject({
        statusCode: 403,
        message:
          "Not authorized to view messages belonging to this session pool",
      });
    });

    test("returns paginated chat history for the mentor", async () => {
      mockConnectRepo.findById.mockResolvedValue({
        mentor: "mentor_1",
        mentee: "mentee_1",
      });
      mockMessageRepo.findPaginatedMessages.mockResolvedValue([{ text: "hi" }]);
      mockMessageRepo.countMessages.mockResolvedValue(1);
      mockMessageRepo.markMessagesAsRead.mockResolvedValue();

      const result = await service.getChatHistory("room_01", "mentor_1", {
        page: "1",
        limit: "10",
      });

      expect(mockMessageRepo.findPaginatedMessages).toHaveBeenCalledWith(
        "room_01",
        0,
        10,
      );
      expect(mockMessageRepo.markMessagesAsRead).toHaveBeenCalledWith(
        "room_01",
        "mentor_1",
      );
      expect(result).toEqual({
        messages: [{ text: "hi" }],
        totalCount: 1,
        page: 1,
        limit: 10,
        hasMore: false,
      });
    });

    test("returns paginated chat history for the mentee", async () => {
      mockConnectRepo.findById.mockResolvedValue({
        mentor: "mentor_1",
        mentee: "mentee_1",
      });
      mockMessageRepo.findPaginatedMessages.mockResolvedValue([]);
      mockMessageRepo.countMessages.mockResolvedValue(0);
      mockMessageRepo.markMessagesAsRead.mockResolvedValue();

      const result = await service.getChatHistory("room_01", "mentee_1", {});

      expect(result.page).toBe(1);
      expect(result.limit).toBe(30);
      expect(result.hasMore).toBe(false);
    });

    test("clamps limit to max cap of 50", async () => {
      mockConnectRepo.findById.mockResolvedValue({
        mentor: "u1",
        mentee: "u2",
      });
      mockMessageRepo.findPaginatedMessages.mockResolvedValue([]);
      mockMessageRepo.countMessages.mockResolvedValue(0);
      mockMessageRepo.markMessagesAsRead.mockResolvedValue();

      await service.getChatHistory("room_01", "u1", { limit: "999" });

      expect(mockMessageRepo.findPaginatedMessages).toHaveBeenCalledWith(
        "room_01",
        0,
        50,
      );
    });

    test("falls back to defaults when page and limit are not valid numbers", async () => {
      mockConnectRepo.findById.mockResolvedValue({
        mentor: "u1",
        mentee: "u2",
      });
      mockMessageRepo.findPaginatedMessages.mockResolvedValue([]);
      mockMessageRepo.countMessages.mockResolvedValue(0);
      mockMessageRepo.markMessagesAsRead.mockResolvedValue();

      await service.getChatHistory("room_01", "u1", {
        page: "abc",
        limit: "xyz",
      });

      expect(mockMessageRepo.findPaginatedMessages).toHaveBeenCalledWith(
        "room_01",
        0,
        30,
      );
    });

    test("hasMore is true when more messages remain beyond current page", async () => {
      mockConnectRepo.findById.mockResolvedValue({
        mentor: "u1",
        mentee: "u2",
      });
      const msgs = Array(10).fill({ text: "msg" });
      mockMessageRepo.findPaginatedMessages.mockResolvedValue(msgs);
      mockMessageRepo.countMessages.mockResolvedValue(25);
      mockMessageRepo.markMessagesAsRead.mockResolvedValue();

      const result = await service.getChatHistory("room_01", "u1", {
        page: "1",
        limit: "10",
      });

      expect(result.hasMore).toBe(true);
    });
  });

  // ── getUnreadMessagesCount ──────────────────────────────────────────────
  describe("getUnreadMessagesCount", () => {
    test("returns unread count from repository", async () => {
      mockMessageRepo.countUnreadMessages.mockResolvedValue(5);

      const result = await service.getUnreadMessagesCount("room_01", "u1");

      expect(mockMessageRepo.countUnreadMessages).toHaveBeenCalledWith(
        "room_01",
        "u1",
      );
      expect(result).toEqual({ unreadCount: 5 });
    });
  });
});
