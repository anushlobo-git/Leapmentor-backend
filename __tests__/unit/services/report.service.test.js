const createReportService = require("../../../services/report.service");
const AppError = require("../../../utils/AppError");

jest.mock("../../../mappers/report.mapper", () => ({ toReportDTO: (v) => v }));

describe("Report Service Unit Tests", () => {
  let mockReportRepo,
    mockConnectRepo,
    mockCloudinary,
    mockFireAndForget,
    mockEmailUtils,
    service;

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

    service = createReportService(
      mockReportRepo,
      mockConnectRepo,
      (v) => v,
      mockCloudinary,
      mockFireAndForget,
      mockEmailUtils,
    );
  });

  test("createIncidentReport should reject descriptions falling below minimum character capacities", async () => {
    await expect(
      service.createIncidentReport(
        { _id: "u1" },
        { connectRequestId: "c1", complaintType: "Spam", description: "Short" },
        null,
      ),
    ).rejects.toThrow(
      new AppError(
        "Description payload metrics must encompass at least 10 characters",
        400,
      ),
    );
  });

  test("createIncidentReport should throw 403 if user credentials mismatch participant properties", async () => {
    mockConnectRepo.findById.mockResolvedValue({
      mentee: "mentee_id",
      mentor: "mentor_id",
    });

    await expect(
      service.createIncidentReport(
        { _id: "unrelated_user" },
        {
          connectRequestId: "c1",
          complaintType: "Spam",
          description: "Valid structural explanation lines text",
        },
        null,
      ),
    ).rejects.toThrow(
      new AppError(
        "Access denied: You are not an active participant inside this contract request session",
        403,
      ),
    );
  });
});
