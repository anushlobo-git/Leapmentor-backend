/**
 * @fileoverview Compliance Tracking and Incident Dispute Router Unit Tests
 * @description Verifies layered validation check parameters, file attachment upload
 * intercepts, role-based pipeline boundaries, and administrative access isolation.
 */

const createReportRoutes = require("../../../routes/report.routes");

// Isolate the global express router layer to monitor endpoint registration hooks
const mockRouter = {
  use: jest.fn(),
  post: jest.fn(),
  get: jest.fn(),
  patch: jest.fn(),
};

jest.mock("express", () => ({
  Router: () => mockRouter,
}));

describe("Compliance Tracking and Incident Report Router Configuration Matrix", () => {
  let mockReportController;
  let mockMiddlewares;
  let mockValidations;

  beforeEach(() => {
    mockReportController = {
      submitReport: jest.fn(),
      getMyReport: jest.fn(),
      getAllReports: jest.fn(),
      updateReportStatus: jest.fn(),
    };

    mockMiddlewares = {
      authenticate: jest.fn(),
      requireRole: jest.fn((...roles) => `role_guard_${roles.join("_")}`),
      upload: {
        single: jest.fn((field) => `multer_single_${field}_interceptor`),
      },
    };

    mockValidations = {
      submitReportValidation: "celebrate_submit_report_shield",
      getMyReportValidation: "celebrate_get_my_report_shield",
      getAllReportsValidation: "celebrate_get_all_reports_shield",
      updateReportStatusValidation: "celebrate_update_status_shield",
    };

    // Instantiate using destructured configuration parameters
    createReportRoutes({
      reportController: mockReportController,
      middlewares: mockMiddlewares,
      validations: mockValidations,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Base Security Firewalls", () => {
    test("should establish mandatory identity verification at the initial entry point", () => {
      expect(mockRouter.use).toHaveBeenCalledWith(mockMiddlewares.authenticate);
    });
  });

  describe("User Track Endpoint Mappings (Mentor / Mentee privileges)", () => {
    test("should mount report submissions to dual-role guards and file upload interceptors using POST", () => {
      expect(mockMiddlewares.requireRole).toHaveBeenCalledWith(
        "mentor",
        "mentee",
      );
      expect(mockMiddlewares.upload.single).toHaveBeenCalledWith("screenshot");

      expect(mockRouter.post).toHaveBeenCalledWith(
        "/",
        "role_guard_mentor_mentee",
        "multer_single_screenshot_interceptor",
        "celebrate_submit_report_shield",
        mockReportController.submitReport,
      );
    });

    test("should mount customized report query chains behind dual-role check shields using GET", () => {
      expect(mockRouter.get).toHaveBeenCalledWith(
        "/my/:connectRequestId",
        "role_guard_mentor_mentee",
        "celebrate_get_my_report_shield",
        mockReportController.getMyReport,
      );
    });
  });

  describe("Compliance Panel Tracks Endpoints (Exclusive Administrator Realms)", () => {
    test("should establish the isolated administrative role block across subsequent operations", () => {
      expect(mockMiddlewares.requireRole).toHaveBeenCalledWith("admin");
      expect(mockRouter.use).toHaveBeenCalledWith("role_guard_admin");
    });

    test("should map panel dashboard collection streams to admin validation shields using GET", () => {
      expect(mockRouter.get).toHaveBeenCalledWith(
        "/admin",
        "celebrate_get_all_reports_shield",
        mockReportController.getAllReports,
      );
    });

    test("should map case file status mutations to administrative resolution handlers using PATCH", () => {
      expect(mockRouter.patch).toHaveBeenCalledWith(
        "/admin/:reportId",
        "celebrate_update_status_shield",
        mockReportController.updateReportStatus,
      );
    });
  });
});
