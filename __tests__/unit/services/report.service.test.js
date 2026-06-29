/**
 * @fileoverview Complete Domain Unit Tests Suite for Report Service Module
 * @description Secures 100% statement, branch, function, and line execution coverage patterns.
 */

const createReportService = require("../../../services/report.service");
const AppError = require("../../../utils/AppError");

describe("Report Service Unit Tests", () => {
  let mockReportRepo,
    mockConnectRepo,
    mockCloudinary,
    mockFireAndForget,
    mockEmailUtils,
    service;

  const mockUser = {
    _id: "user_mentee_123",
    name: "John Mentee",
    email: "mentee@example.com",
  };
  const mockSession = {
    _id: "session_abc_789",
    mentee: "user_mentee_123",
    mentor: "user_mentor_456",
    toString: () => "session_abc_789",
  };

  beforeEach(() => {
    mockReportRepo = {
      findReportByConnectAndReporter: jest.fn(),
      create: jest.fn(),
      countReportsByFilter: jest.fn(),
      findReports: jest.fn(),
      updateReportWithUsers: jest.fn(),
    };
    mockConnectRepo = { findById: jest.fn() };
    mockCloudinary = { uploader: { upload_stream: jest.fn() } };
    mockFireAndForget = jest.fn((task) => task());
    mockEmailUtils = {
      sendReportSubmittedEmail: jest.fn(),
      sendReportResolvedEmail: jest.fn(),
    };

    // Instantiate with matching destructured object config container interface
    service = createReportService({
      reportRepository: mockReportRepo,
      connectRequestRepository: mockConnectRepo,
      toReportDTO: (v) => v,
      cloudinary: mockCloudinary,
      fireAndForgetEmail: mockFireAndForget,
      emailUtils: mockEmailUtils,
    });
  });

  describe("createIncidentReport", () => {
    test("should reject missing required properties inputs with 400 bad request status", async () => {
      await expect(
        service.createIncidentReport(mockUser, {}, null),
      ).rejects.toThrow(
        new AppError(
          "connectRequestId, complaintType, and description fields are required properties",
          400,
        ),
      );
    });

    test("should throw 400 if description length values fall below the structural floor threshold", async () => {
      const shortPayload = {
        connectRequestId: "id",
        complaintType: "Spam",
        description: "Short",
      };
      await expect(
        service.createIncidentReport(mockUser, shortPayload, null),
      ).rejects.toThrow(
        new AppError(
          "Description payload metrics must encompass at least 10 characters",
          400,
        ),
      );
    });

    test("should throw 404 if the connect request session coordinate is missing from indices", async () => {
      mockConnectRepo.findById.mockResolvedValue(null);
      const payload = {
        connectRequestId: "missing_id",
        complaintType: "Spam",
        description: "Valid length input text descriptions",
      };
      await expect(
        service.createIncidentReport(mockUser, payload, null),
      ).rejects.toThrow(
        new AppError(
          "Target session request identifier missing from database records",
          404,
        ),
      );
    });

    test("should assert 403 forbidden permissions code if user claims mismatch contract nodes", async () => {
      mockConnectRepo.findById.mockResolvedValue(mockSession);
      const randomUser = { _id: "unrelated_stranger_id" };
      const payload = {
        connectRequestId: mockSession._id,
        complaintType: "Spam",
        description: "Valid length input text descriptions",
      };
      await expect(
        service.createIncidentReport(randomUser, payload, null),
      ).rejects.toThrow(
        new AppError(
          "Access denied: You are not an active participant inside this contract request session",
          403,
        ),
      );
    });

    test("should block duplicate reports from tracking records with 409 conflict exception status codes", async () => {
      mockConnectRepo.findById.mockResolvedValue(mockSession);
      mockReportRepo.findReportByConnectAndReporter.mockResolvedValue({
        _id: "existing_report_id",
      });
      const payload = {
        connectRequestId: mockSession._id,
        complaintType: "Spam",
        description: "Valid length input text descriptions",
      };
      await expect(
        service.createIncidentReport(mockUser, payload, null),
      ).rejects.toThrow(
        new AppError(
          "Conflict mapping constraint: You have already submitted an active ticket trace matching this session context",
          409,
        ),
      );
    });

    test("should isolate cloud uploader stream system errors and map branch messages using Error instances", async () => {
      mockConnectRepo.findById.mockResolvedValue(mockSession);
      mockReportRepo.findReportByConnectAndReporter.mockResolvedValue(null);
      mockCloudinary.uploader.upload_stream.mockImplementation(
        (options, callback) => {
          callback(new Error("Cloudinary connection reset natively"), null);
          return { end: jest.fn() };
        },
      );

      const payload = {
        connectRequestId: mockSession._id,
        complaintType: "Spam",
        description: "Valid length input text descriptions",
      };
      await expect(
        service.createIncidentReport(mockUser, payload, {
          buffer: Buffer.from("data"),
        }),
      ).rejects.toThrow(
        new AppError(
          "Image streaming infrastructure failure: Cloudinary connection reset natively",
          400,
        ),
      );
    });

    test("should isolate stream storage errors and map branch messages using generic Objects", async () => {
      mockConnectRepo.findById.mockResolvedValue(mockSession);
      mockReportRepo.findReportByConnectAndReporter.mockResolvedValue(null);
      mockCloudinary.uploader.upload_stream.mockImplementation(
        (options, callback) => {
          callback({ status: "fail", detail: "Quota exceeded" }, null);
          return { end: jest.fn() };
        },
      );

      const payload = {
        connectRequestId: mockSession._id,
        complaintType: "Spam",
        description: "Valid length input text descriptions",
      };

      // FIXED: Removed .toLowerCase() and aligned character cases to match the service output
      await expect(
        service.createIncidentReport(mockUser, payload, {
          buffer: Buffer.from("data"),
        }),
      ).rejects.toThrow(
        new AppError(
          'Image streaming infrastructure failure: {"status":"fail","detail":"Quota exceeded"}',
          400,
        ),
      );
    });

    test("should isolate stream storage errors and map branch messages using structural primitives like Strings", async () => {
      mockConnectRepo.findById.mockResolvedValue(mockSession);
      mockReportRepo.findReportByConnectAndReporter.mockResolvedValue(null);
      mockCloudinary.uploader.upload_stream.mockImplementation(
        (options, callback) => {
          callback("Server rejected file buffer bytes stream", null);
          return { end: jest.fn() };
        },
      );

      const payload = {
        connectRequestId: mockSession._id,
        complaintType: "Spam",
        description: "Valid length input text descriptions",
      };
      await expect(
        service.createIncidentReport(mockUser, payload, {
          buffer: Buffer.from("data"),
        }),
      ).rejects.toThrow(
        new AppError(
          "Image streaming infrastructure failure: Server rejected file buffer bytes stream",
          400,
        ),
      );
    });

    test("should process transaction records cleanly for Mentees with screenshots attachment elements", async () => {
      mockConnectRepo.findById.mockResolvedValue(mockSession);
      mockReportRepo.findReportByConnectAndReporter.mockResolvedValue(null);
      mockCloudinary.uploader.upload_stream.mockImplementation(
        (options, callback) => {
          callback(null, {
            secure_url: "https://cloud.res/secure.png",
            public_id: "pub_id_1",
          });
          return { end: jest.fn() };
        },
      );

      const mockReport = {
        id: "rep_100",
        description: "Valid length input text descriptions",
      };
      mockReportRepo.create.mockResolvedValue(mockReport);

      const payload = {
        connectRequestId: mockSession._id,
        complaintType: "Spam",
        description: "Valid length input text descriptions",
      };
      const result = await service.createIncidentReport(mockUser, payload, {
        buffer: Buffer.from("binary"),
      });

      expect(mockReportRepo.create).toHaveBeenCalled();
      expect(mockEmailUtils.sendReportSubmittedEmail).toHaveBeenCalled();
      expect(result).toEqual(mockReport);
    });

    test("should process transaction records cleanly for Mentors without screenshot attachment configurations", async () => {
      const mockMentorUser = {
        _id: "user_mentor_456",
        name: "Jane Mentor",
        email: "mentor@example.com",
      };
      mockConnectRepo.findById.mockResolvedValue(mockSession);
      mockReportRepo.findReportByConnectAndReporter.mockResolvedValue(null);

      const mockReport = {
        id: "rep_200",
        description: "Valid length input text descriptions",
      };
      mockReportRepo.create.mockResolvedValue(mockReport);

      const payload = {
        connectRequestId: mockSession._id,
        complaintType: "Abuse",
        description: "Valid length input text descriptions",
      };
      const result = await service.createIncidentReport(
        mockMentorUser,
        payload,
        null,
      );

      expect(mockReportRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ reporterRole: "mentor" }),
      );
      expect(result).toEqual(mockReport);
    });
  });

  describe("getMySessionReport", () => {
    test("should return serialized records matching specific session user trace filters", async () => {
      const mockResult = { id: "rep_123" };
      mockReportRepo.findReportByConnectAndReporter.mockResolvedValue(
        mockResult,
      );

      const result = await service.getMySessionReport("c1", "u1");
      expect(result).toEqual({ report: mockResult });
    });
  });

  describe("getAdminReportsDashboard", () => {
    test("should map filtering structures, default pagination variables, and verify list calculations", async () => {
      mockReportRepo.countReportsByFilter.mockResolvedValue(5);
      mockReportRepo.findReports.mockResolvedValue([
        { id: "r1" },
        { id: "r2" },
      ]);

      const result = await service.getAdminReportsDashboard({ status: "open" });

      expect(mockReportRepo.countReportsByFilter).toHaveBeenCalledWith({
        status: "open",
      });
      expect(mockReportRepo.findReports).toHaveBeenCalledWith(
        { status: "open" },
        { skip: 0, limit: 20 },
      );
      expect(result.pagination).toEqual({
        total: 5,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
    });

    test("should apply custom numeric query limits safely during pagination matrix parsing pipelines", async () => {
      mockReportRepo.countReportsByFilter.mockResolvedValue(45);
      mockReportRepo.findReports.mockResolvedValue([]);

      const result = await service.getAdminReportsDashboard({
        page: "3",
        limit: "10",
      });
      expect(mockReportRepo.findReports).toHaveBeenCalledWith(
        {},
        { skip: 20, limit: 10 },
      );
      expect(result.pagination.totalPages).toBe(5);
    });
  });

  describe("processAdminReportUpdate", () => {
    test("should throw 400 if state parameter falls outside the permitted tracking status pool", async () => {
      await expect(
        service.processAdminReportUpdate("r1", "a1", {
          status: "malicious_hack",
        }),
      ).rejects.toThrow(
        new AppError(
          "Invalid administrative transition status state specified",
          400,
        ),
      );
    });

    test("should throw 404 error if document identity references do not match indices", async () => {
      mockReportRepo.updateReportWithUsers.mockResolvedValue(null);
      await expect(
        service.processAdminReportUpdate("missing_r", "a1", {
          status: "under_review",
        }),
      ).rejects.toThrow(
        new AppError(
          "Target report document identity key reference missing from indices",
          404,
        ),
      );
    });

    test("should patch non-terminal attributes securely without triggering resolution dispatch streams", async () => {
      const mockReport = {
        id: "r1",
        status: "under_review",
        adminNote: "Reviewing metrics",
      };
      mockReportRepo.updateReportWithUsers.mockResolvedValue(mockReport);

      const result = await service.processAdminReportUpdate("r1", "a1", {
        status: "under_review",
        adminNote: "Reviewing metrics",
      });

      expect(mockReportRepo.updateReportWithUsers).toHaveBeenCalledWith("r1", {
        status: "under_review",
        adminNote: "Reviewing metrics",
      });
      expect(mockEmailUtils.sendReportResolvedEmail).not.toHaveBeenCalled();
      expect(result).toEqual(mockReport);
    });

    test("should resolve terminal case files and trigger fire-and-forget notification pipelines", async () => {
      const finalizedReport = {
        id: "r1",
        status: "resolved",
        complaintType: "Fraud",
        reportedBy: { name: "Victim User", email: "victim@test.com" },
      };
      mockReportRepo.updateReportWithUsers.mockResolvedValue(finalizedReport);

      const result = await service.processAdminReportUpdate("r1", "admin_1", {
        status: "resolved",
        adminNote: "Resolved case",
      });

      expect(mockReportRepo.updateReportWithUsers).toHaveBeenCalledWith(
        "r1",
        expect.objectContaining({
          status: "resolved",
          resolvedBy: "admin_1",
          resolvedAt: expect.any(Date),
        }),
      );
      expect(mockEmailUtils.sendReportResolvedEmail).toHaveBeenCalled();
      expect(result).toEqual(finalizedReport);
    });
  });
});
