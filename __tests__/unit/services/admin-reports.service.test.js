/**
 * @fileoverview Admin Reports Service Unit Tests
 * @description Validates complex multi-repository data cascades, refund validations,
 * and dynamic system error scenarios with full branch coverage.
 */

const createAdminReportsService = require("../../../services/admin-reports.service");
const AppError = require("../../../utils/AppError");

describe("Admin Reports Service", () => {
  let mockReportRepository;
  let mockUserRepository;
  let mockWalletRepository;
  let mockTransactionRepository;
  let mockConnectRequestRepository;
  let mockCreateNotification;
  let mockFireAndForgetEmail;
  let mockSendReportResolvedEmail;
  let mockToReportDTO;
  let service;

  beforeEach(() => {
    mockReportRepository = {
      countAllReports: jest.fn(),
      countReportsByFilter: jest.fn(),
      findReports: jest.fn(),
      findReportByIdWithUsers: jest.fn(),
      findReportByIdWithAll: jest.fn(),
      findReportByIdWithConnectFull: jest.fn(),
      saveReport: jest.fn(),
    };
    mockUserRepository = { findUsersByName: jest.fn() };
    mockWalletRepository = {
      findWalletByUserId: jest.fn(),
      saveWallet: jest.fn(),
    };
    mockTransactionRepository = { createTransaction: jest.fn() };
    mockConnectRequestRepository = { deleteRequestById: jest.fn() };
    mockCreateNotification = jest.fn().mockResolvedValue(undefined);
    mockFireAndForgetEmail = jest.fn((fn) => fn()); // immediately invoke the callback
    mockSendReportResolvedEmail = jest.fn().mockResolvedValue(undefined);
    mockToReportDTO = jest.fn((r) => ({ DTO: true, id: r._id }));

    // ✅ Correct instantiation — matches the destructured signature
    service = createAdminReportsService({
      reportRepository: mockReportRepository,
      userRepository: mockUserRepository,
      walletRepository: mockWalletRepository,
      transactionRepository: mockTransactionRepository,
      connectRequestRepository: mockConnectRequestRepository,
      createNotification: mockCreateNotification,
      fireAndForgetEmail: mockFireAndForgetEmail,
      sendReportResolvedEmail: mockSendReportResolvedEmail,
      toReportDTO: mockToReportDTO,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── getReportStatsService ───────────────────────────────────────────────
  describe("getReportStatsService", () => {
    test("should return totalReports, pendingResolution, and resolvedToday counts", async () => {
      mockReportRepository.countAllReports.mockResolvedValue(20);
      mockReportRepository.countReportsByFilter
        .mockResolvedValueOnce(5) // pendingResolution
        .mockResolvedValueOnce(3); // resolvedToday

      const result = await service.getReportStatsService();

      expect(mockReportRepository.countAllReports).toHaveBeenCalled();
      expect(result).toEqual({
        totalReports: 20,
        pendingResolution: 5,
        resolvedToday: 3,
      });
    });
  });

  // ── getReportsService ───────────────────────────────────────────────────
  describe("getReportsService", () => {
    test("should return paginated reports with default page and limit", async () => {
      mockReportRepository.countReportsByFilter.mockResolvedValue(2);
      mockReportRepository.findReports.mockResolvedValue([
        { _id: "r1" },
        { _id: "r2" },
      ]);

      const result = await service.getReportsService({});

      expect(mockReportRepository.findReports).toHaveBeenCalledWith(
        {},
        { skip: 0, limit: 10 },
      );
      expect(result.reports).toEqual([
        { DTO: true, id: "r1" },
        { DTO: true, id: "r2" },
      ]);
      expect(result.pagination).toEqual({
        totalCount: 2,
        currentPage: 1,
        totalPages: 1,
        hasMore: false,
      });
    });

    test("should apply status filter when status param is provided", async () => {
      mockReportRepository.countReportsByFilter.mockResolvedValue(0);
      mockReportRepository.findReports.mockResolvedValue([]);

      await service.getReportsService({ status: "open" });

      expect(mockReportRepository.countReportsByFilter).toHaveBeenCalledWith({
        status: "open",
      });
    });

    test("should apply $or user filter when search param is provided", async () => {
      mockUserRepository.findUsersByName.mockResolvedValue([
        { _id: "u1" },
        { _id: "u2" },
      ]);
      mockReportRepository.countReportsByFilter.mockResolvedValue(0);
      mockReportRepository.findReports.mockResolvedValue([]);

      await service.getReportsService({ search: "Alice" });

      expect(mockUserRepository.findUsersByName).toHaveBeenCalledWith("Alice");
      expect(mockReportRepository.countReportsByFilter).toHaveBeenCalledWith({
        $or: [
          { reportedBy: { $in: ["u1", "u2"] } },
          { reportedUser: { $in: ["u1", "u2"] } },
        ],
      });
    });

    test("should skip user search when search param is blank", async () => {
      mockReportRepository.countReportsByFilter.mockResolvedValue(0);
      mockReportRepository.findReports.mockResolvedValue([]);

      await service.getReportsService({ search: "   " });

      expect(mockUserRepository.findUsersByName).not.toHaveBeenCalled();
    });

    test("should cap limit at 20 and compute correct skip for page 3", async () => {
      mockReportRepository.countReportsByFilter.mockResolvedValue(100);
      mockReportRepository.findReports.mockResolvedValue([]);

      const result = await service.getReportsService({ page: 3, limit: 999 });

      expect(mockReportRepository.findReports).toHaveBeenCalledWith(
        {},
        { skip: 40, limit: 20 },
      );
      expect(result.pagination.hasMore).toBe(true);
    });

    test("should default page to 1 when invalid page value is passed", async () => {
      mockReportRepository.countReportsByFilter.mockResolvedValue(0);
      mockReportRepository.findReports.mockResolvedValue([]);

      await service.getReportsService({ page: "abc" });

      expect(mockReportRepository.findReports).toHaveBeenCalledWith(
        {},
        { skip: 0, limit: 10 },
      );
    });
  });

  // ── handleReportService ─────────────────────────────────────────────────
  describe("handleReportService", () => {
    test("should throw 400 if status is not resolved or dismissed", async () => {
      await expect(
        service.handleReportService("rep1", { status: "invalid" }, "adm1"),
      ).rejects.toMatchObject({
        statusCode: 400,
        message: "Status must be resolved or dismissed.",
      });
    });

    test("should throw 404 if report is not found", async () => {
      mockReportRepository.findReportByIdWithUsers.mockResolvedValue(null);

      await expect(
        service.handleReportService("rep1", { status: "resolved" }, "adm1"),
      ).rejects.toMatchObject({
        statusCode: 404,
        message: "Report not found.",
      });
    });

    test("should resolve a report, send notification and email when recipientId and email exist", async () => {
      const mockReport = {
        _id: "rep1",
        status: "open",
        adminNote: "",
        reportedBy: { _id: "u1", name: "Alice", email: "alice@test.com" },
        reportedUser: { name: "Bob" },
        connectRequest: "conn1",
        complaintType: "harassment",
        reporterRole: "mentee",
      };
      mockReportRepository.findReportByIdWithUsers.mockResolvedValue(
        mockReport,
      );
      mockReportRepository.saveReport.mockResolvedValue(mockReport);

      const result = await service.handleReportService(
        "rep1",
        { status: "resolved", adminNote: "Looks valid" },
        "adm1",
      );

      expect(mockReport.status).toBe("resolved");
      expect(mockReport.adminNote).toBe("Looks valid");
      expect(mockReport.resolvedBy).toBe("adm1");
      expect(mockCreateNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          recipient: "u1",
          title: "Your report has been resolved ✅",
        }),
      );
      expect(mockFireAndForgetEmail).toHaveBeenCalled();
      expect(result).toEqual({ DTO: true, id: "rep1" });
    });

    test("should use dismissed notification message when status is dismissed", async () => {
      const mockReport = {
        _id: "rep2",
        status: "open",
        adminNote: "",
        reportedBy: { _id: "u2", name: "Alice", email: "alice@test.com" },
        reportedUser: { name: "Bob" },
        connectRequest: "conn2",
        complaintType: "spam",
        reporterRole: "mentee",
      };
      mockReportRepository.findReportByIdWithUsers.mockResolvedValue(
        mockReport,
      );
      mockReportRepository.saveReport.mockResolvedValue(mockReport);

      await service.handleReportService(
        "rep2",
        { status: "dismissed" },
        "adm1",
      );

      expect(mockCreateNotification).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Your report has been reviewed" }),
      );
    });

    test("should not send notification if reportedBy has no _id", async () => {
      const mockReport = {
        _id: "rep3",
        status: "open",
        adminNote: "",
        reportedBy: null, // no recipient
        reportedUser: { name: "Bob" },
        connectRequest: "conn3",
        complaintType: "spam",
        reporterRole: "mentee",
      };
      mockReportRepository.findReportByIdWithUsers.mockResolvedValue(
        mockReport,
      );
      mockReportRepository.saveReport.mockResolvedValue(mockReport);

      await service.handleReportService("rep3", { status: "resolved" }, "adm1");

      expect(mockCreateNotification).not.toHaveBeenCalled();
      expect(mockFireAndForgetEmail).not.toHaveBeenCalled();
    });

    test("should not send email if reportedBy has no email", async () => {
      const mockReport = {
        _id: "rep4",
        status: "open",
        adminNote: "",
        reportedBy: { _id: "u4", name: "Alice" }, // no email
        reportedUser: null,
        connectRequest: "conn4",
        complaintType: "spam",
        reporterRole: "mentee",
      };
      mockReportRepository.findReportByIdWithUsers.mockResolvedValue(
        mockReport,
      );
      mockReportRepository.saveReport.mockResolvedValue(mockReport);

      await service.handleReportService("rep4", { status: "resolved" }, "adm1");

      expect(mockCreateNotification).toHaveBeenCalled();
      expect(mockFireAndForgetEmail).not.toHaveBeenCalled();
    });

    test("should append adminNote to notification message when provided", async () => {
      const mockReport = {
        _id: "rep5",
        status: "open",
        adminNote: "",
        reportedBy: { _id: "u5", name: "Alice", email: "a@test.com" },
        reportedUser: { name: "Bob" },
        connectRequest: "conn5",
        complaintType: "spam",
        reporterRole: "mentee",
      };
      mockReportRepository.findReportByIdWithUsers.mockResolvedValue(
        mockReport,
      );
      mockReportRepository.saveReport.mockResolvedValue(mockReport);

      await service.handleReportService(
        "rep5",
        { status: "dismissed", adminNote: "No evidence found" },
        "adm1",
      );

      const notifCall = mockCreateNotification.mock.calls[0][0];
      expect(notifCall.message).toContain("Note: No evidence found");
    });
  });

  // ── processRefundService ────────────────────────────────────────────────
  describe("processRefundService", () => {
    test("should throw 404 if report is not found", async () => {
      mockReportRepository.findReportByIdWithAll.mockResolvedValue(null);

      await expect(
        service.processRefundService("rep1", "note", "adm1"),
      ).rejects.toMatchObject({
        statusCode: 404,
        message: "Report not found.",
      });
    });

    test("should throw 403 if reporterRole is not mentee", async () => {
      mockReportRepository.findReportByIdWithAll.mockResolvedValue({
        reporterRole: "mentor",
      });

      await expect(
        service.processRefundService("rep1", "note", "adm1"),
      ).rejects.toMatchObject({
        statusCode: 403,
        message: "Only mentees can request refunds.",
      });
    });

    test("should throw 400 if complaintType is not refund", async () => {
      mockReportRepository.findReportByIdWithAll.mockResolvedValue({
        reporterRole: "mentee",
        complaintType: "harassment",
      });

      await expect(
        service.processRefundService("rep1", "note", "adm1"),
      ).rejects.toMatchObject({
        statusCode: 400,
        message: "This report is not a refund request.",
      });
    });

    test("should throw 400 if refund has already been processed", async () => {
      mockReportRepository.findReportByIdWithAll.mockResolvedValue({
        reporterRole: "mentee",
        complaintType: "refund",
        refundProcessed: true,
      });

      await expect(
        service.processRefundService("rep1", "note", "adm1"),
      ).rejects.toMatchObject({
        statusCode: 400,
        message: "Refund already processed.",
      });
    });

    test("should throw 404 if connectRequest is missing", async () => {
      mockReportRepository.findReportByIdWithAll.mockResolvedValue({
        reporterRole: "mentee",
        complaintType: "refund",
        refundProcessed: false,
        connectRequest: null,
      });

      await expect(
        service.processRefundService("rep1", "note", "adm1"),
      ).rejects.toMatchObject({
        statusCode: 404,
        message: "Session not found.",
      });
    });

    test("should throw 400 if session payment status is not paid", async () => {
      mockReportRepository.findReportByIdWithAll.mockResolvedValue({
        reporterRole: "mentee",
        complaintType: "refund",
        refundProcessed: false,
        connectRequest: {
          paymentStatus: "pending",
          mentee: "u1",
          totalAmount: 100,
        },
      });

      await expect(
        service.processRefundService("rep1", "note", "adm1"),
      ).rejects.toMatchObject({
        statusCode: 400,
        message: "Session has not been paid.",
      });
    });

    test("should throw 404 if mentee wallet is not found", async () => {
      mockReportRepository.findReportByIdWithAll.mockResolvedValue({
        reporterRole: "mentee",
        complaintType: "refund",
        refundProcessed: false,
        connectRequest: {
          paymentStatus: "paid",
          mentee: "u1",
          totalAmount: 100,
        },
      });
      mockWalletRepository.findWalletByUserId.mockResolvedValue(null);

      await expect(
        service.processRefundService("rep1", "note", "adm1"),
      ).rejects.toMatchObject({
        statusCode: 404,
        message: "Mentee wallet not found.",
      });
    });

    test("should process refund correctly, update wallet, create transaction and send email", async () => {
      const mockConnectRequest = {
        _id: "conn1",
        paymentStatus: "paid",
        mentee: "u1",
        totalAmount: 300,
        save: jest.fn(),
      };
      const mockReport = {
        reporterRole: "mentee",
        complaintType: "refund",
        refundProcessed: false,
        connectRequest: mockConnectRequest,
        reportedBy: { name: "Alice", email: "alice@test.com" },
        reporterRole: "mentee",
      };
      const mockWallet = { escrow: 500, balance: 1000 };

      mockReportRepository.findReportByIdWithAll.mockResolvedValue(mockReport);
      mockWalletRepository.findWalletByUserId.mockResolvedValue(mockWallet);
      mockReportRepository.saveReport.mockResolvedValue(mockReport);

      const result = await service.processRefundService(
        "rep1",
        "Refund OK",
        "adm1",
      );

      expect(mockWallet.escrow).toBe(200); // 500 - 300
      expect(mockWallet.balance).toBe(1300); // 1000 + 300
      expect(mockWalletRepository.saveWallet).toHaveBeenCalledWith(mockWallet);
      expect(mockTransactionRepository.createTransaction).toHaveBeenCalledWith(
        expect.objectContaining({ type: "escrow_refund", amount: 300 }),
      );
      expect(mockConnectRequest.paymentStatus).toBe("refunded");
      expect(mockConnectRequest.status).toBe("rejected");
      expect(mockConnectRequest.save).toHaveBeenCalled();
      expect(mockReport.refundProcessed).toBe(true);
      expect(mockFireAndForgetEmail).toHaveBeenCalled();
      expect(result.refundAmount).toBe(300);
    });

    test("should use default adminNote when none is provided", async () => {
      const mockConnectRequest = {
        _id: "conn2",
        paymentStatus: "paid",
        mentee: "u1",
        totalAmount: 100,
        save: jest.fn(),
      };
      const mockReport = {
        reporterRole: "mentee",
        complaintType: "refund",
        refundProcessed: false,
        connectRequest: mockConnectRequest,
        reportedBy: null, // no email → skip fireAndForgetEmail
      };
      const mockWallet = { escrow: 200, balance: 0 };

      mockReportRepository.findReportByIdWithAll.mockResolvedValue(mockReport);
      mockWalletRepository.findWalletByUserId.mockResolvedValue(mockWallet);
      mockReportRepository.saveReport.mockResolvedValue(mockReport);

      await service.processRefundService("rep1", "   ", "adm1"); // blank note

      expect(mockReport.adminNote).toBe("Refund processed by admin.");
      expect(mockFireAndForgetEmail).not.toHaveBeenCalled();
    });
  });

  // ── deleteSessionService ────────────────────────────────────────────────
  describe("deleteSessionService", () => {
    test("should throw 404 if report is not found", async () => {
      mockReportRepository.findReportByIdWithConnectFull.mockResolvedValue(
        null,
      );

      await expect(
        service.deleteSessionService("rep1", "note", "adm1"),
      ).rejects.toMatchObject({
        statusCode: 404,
        message: "Report not found.",
      });
    });

    test("should throw 404 if connectRequest is missing", async () => {
      mockReportRepository.findReportByIdWithConnectFull.mockResolvedValue({
        connectRequest: null,
      });

      await expect(
        service.deleteSessionService("rep1", "note", "adm1"),
      ).rejects.toMatchObject({
        statusCode: 404,
        message: "Session not found or already deleted.",
      });
    });

    test("should delete session, notify both parties, and resolve report", async () => {
      const mockReport = {
        connectRequest: {
          _id: "conn1",
          mentee: { _id: "m1", name: "Alice" },
          mentor: { _id: "t1", name: "Bob" },
        },
        adminNote: "",
        status: "open",
      };
      mockReportRepository.findReportByIdWithConnectFull.mockResolvedValue(
        mockReport,
      );
      mockConnectRequestRepository.deleteRequestById.mockResolvedValue(
        undefined,
      );
      mockReportRepository.saveReport.mockResolvedValue(mockReport);

      await service.deleteSessionService("rep1", "Removed per policy", "adm1");

      expect(
        mockConnectRequestRepository.deleteRequestById,
      ).toHaveBeenCalledWith("conn1");
      expect(mockCreateNotification).toHaveBeenCalledTimes(2);
      expect(mockCreateNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          recipient: "m1",
          title: "Session removed by admin",
        }),
      );
      expect(mockCreateNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          recipient: "t1",
          title: "Session removed by admin",
        }),
      );
      expect(mockReport.status).toBe("resolved");
      expect(mockReport.adminNote).toBe("Removed per policy");
    });

    test("should use default adminNote and handle missing mentee/mentor ids gracefully", async () => {
      // Branch: menteeId = connectRequest.mentee?._id || connectRequest.mentee (plain string id)
      // Branch: if (menteeId) and if (mentorId) when one is missing
      const mockReport = {
        connectRequest: {
          _id: "conn2",
          mentee: "rawMenteeId", // plain string, no ._id
          mentor: null, // no mentor → skip notification
        },
        adminNote: "",
        status: "open",
      };
      mockReportRepository.findReportByIdWithConnectFull.mockResolvedValue(
        mockReport,
      );
      mockConnectRequestRepository.deleteRequestById.mockResolvedValue(
        undefined,
      );
      mockReportRepository.saveReport.mockResolvedValue(mockReport);

      await service.deleteSessionService("rep1", "   ", "adm1"); // blank note

      expect(mockCreateNotification).toHaveBeenCalledTimes(1); // only mentee notified
      expect(mockReport.adminNote).toBe("Session deleted by admin.");
    });
  });
});
