const createMessageService = require("../../../services/message.service");
const AppError = require("../../../utils/AppError");

jest.mock("../../../mappers/message.mapper", () => ({
  toMessageDTO: jest.fn((msg) => msg),
}));

describe("Message Service Unit Tests", () => {
  let mockMessageRepo, mockConnectRepo, service;

  beforeEach(() => {
    mockMessageRepo = {
      findPaginatedMessages: jest.fn(),
      countMessages: jest.fn(),
      markMessagesAsRead: jest.fn(),
      countUnreadMessages: jest.fn(),
    };
    mockConnectRepo = { findById: jest.fn() };

    service = createMessageService(mockMessageRepo, mockConnectRepo);
  });

  test("getChatHistory should fail with a 404 error if connection references evaluate to null", async () => {
    mockConnectRepo.findById.mockResolvedValue(null);

    await expect(
      service.getChatHistory("invalid_id", "u1", {}),
    ).rejects.toThrow(
      new AppError("Session context record not found matching criteria", 404),
    );
  });

  test("getChatHistory should block third-party access requests with a 403 status code", async () => {
    mockConnectRepo.findById.mockResolvedValue({ mentor: "m1", mentee: "m2" });

    await expect(
      service.getChatHistory("room_01", "unauthorized_user", {}),
    ).rejects.toThrow(
      new AppError(
        "Not authorized to view messages belonging to this session pool",
        403,
      ),
    );
  });
});
