/**
 * @fileoverview Invoice Business Service Unit Tests
 * @description Assures valid verification of session ownership limits, settlement boundaries,
 * administrative commission rules, and binary document buffer compilations.
 */

const createInvoiceService = require("../../../services/invoice.service");
const AppError = require("../../../utils/AppError");

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

    service = createInvoiceService(
      mockConnectRequestRepo,
      mockAdminUserRepo,
      mockGenerateInvoice,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("should successfully build a PDF binary payload matching completed and valid account properties", async () => {
    const mockRequest = {
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
    mockConnectRequestRepo.findByIdWithParticipantsLean.mockResolvedValue(
      mockRequest,
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

  test("should throw a 404 exception if the targeted context session records do not exist", async () => {
    mockConnectRequestRepo.findByIdWithParticipantsLean.mockResolvedValue(null);

    await expect(
      service.generateInvoicePdfBuffer({
        connectRequestId: "507f1f78c24a82117184851a",
        userId: "user_id",
      }),
    ).rejects.toThrow(new AppError("Session not found", 404));
  });

  test("should throw a 403 Forbidden exception if the user parsing does not own the connection request", async () => {
    mockConnectRequestRepo.findByIdWithParticipantsLean.mockResolvedValue({
      mentee: { _id: "authorized_mentee_id" },
    });

    await expect(
      service.generateInvoicePdfBuffer({
        connectRequestId: "507f1f78c24a82117184851a",
        userId: "malicious_user",
      }),
    ).rejects.toThrow(
      new AppError("Not authorized to download this invoice", 403),
    );
  });

  test("should throw a 400 Bad Request exception if the transactional state remains unpaid or unfulfilled", async () => {
    mockConnectRequestRepo.findByIdWithParticipantsLean.mockResolvedValue({
      mentee: { _id: "user_111" },
      paymentStatus: "unpaid",
    });

    await expect(
      service.generateInvoicePdfBuffer({
        connectRequestId: "507f1f78c24a82117184851a",
        userId: "user_111",
      }),
    ).rejects.toThrow(
      new AppError("No paid invoice found for this session", 400),
    );
  });
});
