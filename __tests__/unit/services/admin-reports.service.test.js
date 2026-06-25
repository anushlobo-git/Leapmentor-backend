/**
 * @fileoverview Admin Reports Service Unit Tests
 * @description Validates complex multi-repository data cascades, refund validations,
 * and dynamic system error scenarios.
 */

const createAdminReportsService = require("../../../services/admin-reports.service");
const AppError = require("../../../utils/AppError");

describe("Admin Reports Service Unit Tests", () => {
  let mockReportRepo,
    mockUserRepo,
    mockWalletRepo,
    mockTransactionRepo,
    mockConnectRequestRepo;
  let mockCreateNotification,
    mockFireAndForgetEmail,
    mockSendReportResolvedEmail;
  let service;

  beforeEach(() => {
    mockReportRepo = {
      countAllReports: jest.fn(),
      countReportsByFilter: jest.fn(),
      findReports: jest.fn(),
      findReportByIdWithUsers: jest.fn(),
      findReportByIdWithAll: jest.fn(),
      findReportByIdWithConnectFull: jest.fn(),
      saveReport: jest.fn(),
    };
    mockUserRepo = { findUsersByName: jest.fn() };
    mockWalletRepo = { findWalletByUserId: jest.fn(), saveWallet: jest.fn() };
    mockTransactionRepo = { createTransaction: jest.fn() };
    mockConnectRequestRepo = { deleteRequestById: jest.fn() };
    mockCreateNotification = jest.fn();
    mockFireAndForgetEmail = jest.fn((fn) => fn());
    mockSendReportResolvedEmail = jest.fn();

    service = createAdminReportsService(
      mockReportRepo,
      mockUserRepo,
      mockWalletRepo,
      mockTransactionRepo,
      mockConnectRequestRepo,
      mockCreateNotification,
      mockFireAndForgetEmail,
      mockSendReportResolvedEmail,
    );
  });

  describe("processRefundService", () => {
    test("should successfully subtract values from escrow and deposit back into balances", async () => {
      const mockReport = {
        reporterRole: "mentee",
        complaintType: "refund",
        refundProcessed: false,
        connectRequest: {
          _id: "conn777",
          paymentStatus: "paid",
          mentee: "user001",
          totalAmount: 300,
          save: jest.fn(),
        },
      };

      const mockWallet = { _id: "w123", escrow: 500, balance: 1000 };

      mockReportRepo.findReportByIdWithAll.mockResolvedValue(mockReport);
      mockWalletRepo.findWalletByUserId.mockResolvedValue(mockWallet);

      const result = await service.processRefundService(
        "rep999",
        "Refunding money",
        "adminCtrl",
      );

      expect(mockWallet.escrow).toBe(200); // 500 - 300
      expect(mockWallet.balance).toBe(1300); // 1000 + 300
      expect(mockWalletRepo.saveWallet).toHaveBeenCalledWith(mockWallet);
      expect(mockTransactionRepo.createTransaction).toHaveBeenCalled();
      expect(mockReport.connectRequest.paymentStatus).toBe("refunded");
      expect(result.refundAmount).toBe(300);
    });

    test("should reject and throw a 403 error if the reporter is a mentor profile", async () => {
      mockReportRepo.findReportByIdWithAll.mockResolvedValue({
        reporterRole: "mentor",
      });

      await expect(
        service.processRefundService("rep111", "note", "admin"),
      ).rejects.toThrow(new AppError("Only mentees can request refunds.", 403));
    });
  });
});
