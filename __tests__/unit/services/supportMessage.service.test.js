/**
 * @fileoverview Complete Domain Unit Tests Suite for Support Ticket Lifecycle Module
 * @description Secures 100% statement, branch, function, and line execution coverage patterns.
 */

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

    // Instantiate using the correct named parameter configuration interface matching the source
    service = createSupportMessageService({
      supportMessageRepository: mockSupportMessageRepo,
      userRepository: mockUserRepo,
      notificationRepository: mockNotificationRepo,
      toSupportMessageDTO: mockMapper,
      fireAndForgetEmail: mockFireAndForget,
      sendSupportResolvedEmail: mockSendSupportResolvedEmail,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("submitTicket HelpCenter Ingestion Gateway", () => {
    test("should throw a 400 AppError if mandatory description or metadata lines are absent", async () => {
      await expect(
        service.submitTicket({ email: "user@test.com", subject: "Help" }),
      ).rejects.toThrow(
        new AppError(
          "All fields (email, subject, message) are required properties",
          400,
        ),
      );
    });

    test("should use the explicit user role if specified in the ingestion payload", async () => {
      const mockTicket = {
        email: "mentor@test.com",
        subject: "Billing",
        message: "Error",
        role: "mentor",
      };
      mockSupportMessageRepo.create.mockResolvedValue(mockTicket);

      const result = await service.submitTicket(mockTicket);

      expect(mockSupportMessageRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ role: "mentor", status: "open" }),
      );
      expect(result).toEqual(mockTicket);
    });

    test("should fall back gracefully onto DEFAULT_USER_ROLE if a role indicator isn't provided", async () => {
      const payloadWithoutRole = {
        email: "guest@test.com",
        subject: "Bug",
        message: "UI broken",
      };
      mockSupportMessageRepo.create.mockResolvedValue({
        ...payloadWithoutRole,
        role: "user",
      });

      await service.submitTicket(payloadWithoutRole);

      expect(mockSupportMessageRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ role: "user" }),
      );
    });
  });

  describe("fetchAllTickets Ledger Lookups", () => {
    test("should return a chronological timeline array containing mapped DTO ticket items", async () => {
      const rawTicketsList = [{ subject: "Ticket A" }, { subject: "Ticket B" }];
      mockSupportMessageRepo.findAllSortedByNewest.mockResolvedValue(
        rawTicketsList,
      );

      const result = await service.fetchAllTickets();

      expect(
        mockSupportMessageRepo.findAllSortedByNewest,
      ).toHaveBeenCalledTimes(1);
      expect(mockMapper).toHaveBeenCalledTimes(2);
      expect(result).toEqual(rawTicketsList);
    });
  });

  describe("resolveTicket Cross-Channel Resolution Workflows", () => {
    test("should throw a 404 AppError if the target ticket identity doesn't match a record", async () => {
      mockSupportMessageRepo.updateStatusById.mockResolvedValue(null);

      await expect(service.resolveTicket("invalid_ticket_id")).rejects.toThrow(
        new AppError(
          "Target support ticket metadata reference point not found",
          404,
        ),
      );
    });

    test("should dispatch dashboard notifications and email updates if an internal email match is found", async () => {
      const mockTicket = {
        email: "registered@test.com",
        subject: "Escrow Bug",
      };
      mockSupportMessageRepo.updateStatusById.mockResolvedValue(mockTicket);
      mockUserRepo.findUserByEmail.mockResolvedValue({ _id: "user_uuid_123" });

      const result = await service.resolveTicket("ticket_101");

      expect(mockSupportMessageRepo.updateStatusById).toHaveBeenCalledWith(
        "ticket_101",
        "resolved",
      );
      expect(mockUserRepo.findUserByEmail).toHaveBeenCalledWith(
        "registered@test.com",
      );

      expect(mockNotificationRepo.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          recipient: "user_uuid_123",
          type: "support_resolved",
          message:
            'Your support request "Escrow Bug" has been resolved by our team.',
        }),
      );

      expect(mockSendSupportResolvedEmail).toHaveBeenCalledWith({
        toEmail: "registered@test.com",
        subject: "Escrow Bug",
      });
      expect(result).toEqual(mockTicket);
    });

    test("should bypass database notification creation for public unauthenticated guest ticket emails", async () => {
      const guestTicket = {
        email: "guest-out-of-band@test.com",
        subject: "Partnership Inquiry",
      };
      mockSupportMessageRepo.updateStatusById.mockResolvedValue(guestTicket);
      mockUserRepo.findUserByEmail.mockResolvedValue(null); // Explicitly trigger the user absence branch

      const result = await service.resolveTicket("ticket_202");

      expect(mockNotificationRepo.createNotification).not.toHaveBeenCalled();
      expect(mockSendSupportResolvedEmail).toHaveBeenCalledWith({
        toEmail: "guest-out-of-band@test.com",
        subject: "Partnership Inquiry",
      });
      expect(result).toEqual(guestTicket);
    });
  });
});
