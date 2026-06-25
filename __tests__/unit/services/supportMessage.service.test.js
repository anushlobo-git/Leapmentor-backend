const createSupportMessageService = require("../../../services/supportMessage.service");
const AppError = require("../../../utils/AppError");

describe("Support Message Service Unit Tests", () => {
  let mockSupportMessageRepo,
    mockUserRepo,
    mockNotificationRepo,
    mockMapper,
    mockFireAndForget,
    mockSendSupportResolvedEmail,
    service;

  beforeEach(() => {
    mockSupportMessageRepo = {
      create: jest.fn(),
      findAllSortedByNewest: jest.fn(),
      updateStatusById: jest.fn(),
    };
    mockUserRepo = { findUserByEmail: jest.fn() };
    mockNotificationRepo = { createNotification: jest.fn() };
    mockMapper = jest.fn((val) => val);
    mockFireAndForget = jest.fn((task) => task());
    mockSendSupportResolvedEmail = jest.fn();

    service = createSupportMessageService(
      mockSupportMessageRepo,
      mockUserRepo,
      mockNotificationRepo,
      mockMapper,
      mockFireAndForget,
      mockSendSupportResolvedEmail,
    );
  });

  test("submitTicket should throw a 400 AppError if mandatory description lines are absent", async () => {
    await expect(
      service.submitTicket({ email: "user@test.com", subject: "Help" }),
    ).rejects.toThrow(
      new AppError(
        "All fields (email, subject, message) are required properties",
        400,
      ),
    );
  });

  test("resolveTicket should throw a 404 AppError if the target ticket doesn't exist", async () => {
    mockSupportMessageRepo.updateStatusById.mockResolvedValue(null);

    await expect(service.resolveTicket("invalid_ticket_id")).rejects.toThrow(
      new AppError(
        "Target support ticket metadata reference point not found",
        404,
      ),
    );
  });

  test("resolveTicket should write dashboard notification alerts if an email match is found", async () => {
    mockSupportMessageRepo.updateStatusById.mockResolvedValue({
      email: "user@test.com",
      subject: "Bug report",
    });
    mockUserRepo.findUserByEmail.mockResolvedValue({ _id: "user_uuid_123" });

    await service.resolveTicket("ticket_101");

    expect(mockNotificationRepo.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        recipient: "user_uuid_123",
        type: "support_resolved",
      }),
    );
    expect(mockFireAndForget).toHaveBeenCalled();
  });
});
