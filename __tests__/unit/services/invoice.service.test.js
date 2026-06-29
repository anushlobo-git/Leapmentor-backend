/**
 * @fileoverview Invoice Business Service Unit Tests
 */

const createInvoiceService = require("../../../services/invoice.service");

describe("Invoice Service Unit Tests", () => {
  let mockConnectRequestRepo, mockAdminUserRepo, mockGenerateInvoice, service;

  beforeEach(() => {
    mockConnectRequestRepo = {
      findByIdWithParticipantsLean: jest.fn(),
    };
    mockAdminUserRepo = {
      findActiveAdminLean: jest.fn(),
    };
    mockGenerateInvoice = jest
      .fn()
      .mockResolvedValue(Buffer.from("%PDF-mock-binary-data"));

    service = createInvoiceService({
      connectRequestRepository: mockConnectRequestRepo,
      adminUserRepository: mockAdminUserRepo,
      generateInvoice: mockGenerateInvoice,
    });
  });

  afterEach(() => jest.clearAllMocks());

  const baseRequest = {
    _id: "507f1f78c24a82117184851a",
    mentee: { _id: "user_uuid_111", name: "Alice", email: "alice@test.com" },
    mentor: { name: "Bob", email: "bob@test.com" },
    paymentStatus: "paid",
    selectedSlots: [],
    confirmedSlot: {},
    sessionRate: 100,
    sessionCount: 1,
    totalAmount: 120,
    paidAt: new Date(),
  };

  test("should successfully build a PDF binary payload for a paid session", async () => {
    mockConnectRequestRepo.findByIdWithParticipantsLean.mockResolvedValue(
      baseRequest,
    );
    mockAdminUserRepo.findActiveAdminLean.mockResolvedValue({
      commissionRate: 20,
    });

    const result = await service.generateInvoicePdfBuffer({
      connectRequestId: "507f1f78c24a82117184851a",
      userId: "user_uuid_111",
    });

    expect(
      mockConnectRequestRepo.findByIdWithParticipantsLean,
    ).toHaveBeenCalledWith("507f1f78c24a82117184851a");
    expect(mockGenerateInvoice).toHaveBeenCalled();
    expect(result.invoiceNumber).toBe("INV-84851A");
    expect(result.pdfBuffer.toString()).toContain("%PDF-mock-binary-data");
  });

  test("should successfully build a PDF binary payload for a released session", async () => {
    mockConnectRequestRepo.findByIdWithParticipantsLean.mockResolvedValue({
      ...baseRequest,
      paymentStatus: "released",
    });
    mockAdminUserRepo.findActiveAdminLean.mockResolvedValue({
      commissionRate: 20,
    });

    const result = await service.generateInvoicePdfBuffer({
      connectRequestId: "507f1f78c24a82117184851a",
      userId: "user_uuid_111",
    });

    expect(result.invoiceNumber).toBe("INV-84851A");
  });

  test("should throw 404 if the session record does not exist", async () => {
    mockConnectRequestRepo.findByIdWithParticipantsLean.mockResolvedValue(null);

    await expect(
      service.generateInvoicePdfBuffer({
        connectRequestId: "507f1f78c24a82117184851a",
        userId: "user_id",
      }),
    ).rejects.toMatchObject({ statusCode: 404, message: "Session not found" });
  });

  test("should throw 403 if the user does not own the connection request", async () => {
    mockConnectRequestRepo.findByIdWithParticipantsLean.mockResolvedValue({
      mentee: { _id: "authorized_mentee_id" },
    });

    await expect(
      service.generateInvoicePdfBuffer({
        connectRequestId: "507f1f78c24a82117184851a",
        userId: "malicious_user",
      }),
    ).rejects.toMatchObject({
      statusCode: 403,
      message: "Not authorized to download this invoice",
    });
  });

  test("should throw 400 if payment status is not paid or released", async () => {
    mockConnectRequestRepo.findByIdWithParticipantsLean.mockResolvedValue({
      mentee: { _id: "user_111" },
      paymentStatus: "unpaid",
    });

    await expect(
      service.generateInvoicePdfBuffer({
        connectRequestId: "507f1f78c24a82117184851a",
        userId: "user_111",
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      message: "No paid invoice found for this session",
    });
  });

  test("should throw 400 if no admin user is found", async () => {
    mockConnectRequestRepo.findByIdWithParticipantsLean.mockResolvedValue(
      baseRequest,
    );
    mockAdminUserRepo.findActiveAdminLean.mockResolvedValue(null);

    await expect(
      service.generateInvoicePdfBuffer({
        connectRequestId: "507f1f78c24a82117184851a",
        userId: "user_uuid_111",
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      message: "Platform commission rate not configured",
    });
  });

  test("should throw 400 if admin commissionRate is zero (falsy)", async () => {
    mockConnectRequestRepo.findByIdWithParticipantsLean.mockResolvedValue(
      baseRequest,
    );
    mockAdminUserRepo.findActiveAdminLean.mockResolvedValue({
      commissionRate: 0,
    });

    await expect(
      service.generateInvoicePdfBuffer({
        connectRequestId: "507f1f78c24a82117184851a",
        userId: "user_uuid_111",
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      message: "Platform commission rate not configured",
    });
  });
});
