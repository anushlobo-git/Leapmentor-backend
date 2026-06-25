/**
 * @fileoverview Admin Reports Routing Unit Tests
 * @description Verifies validation schema alignment and security stack placements.
 */

const createAdminReportsRoutes = require("../../../routes/admin-reports.routes");
const {
  getReportsQueryValidation,
  handleReportBodyValidation,
} = require("../../../validations/admin-reports.validation");

const mockRouter = {
  get: jest.fn(),
  patch: jest.fn(),
  post: jest.fn(),
  delete: jest.fn(),
  use: jest.fn(),
};

jest.mock("express", () => ({
  Router: () => mockRouter,
}));

describe("Admin Reports Routes Unit Tests", () => {
  let mockController;
  let mockAuthenticate;

  beforeEach(() => {
    mockController = {
      getReportStats: jest.fn(),
      getReports: jest.fn(),
      handleReport: jest.fn(),
      processRefund: jest.fn(),
      deleteSession: jest.fn(),
    };

    mockAuthenticate = jest.fn();

    createAdminReportsRoutes(mockController, mockAuthenticate);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("should enforce the authentication middleware guard at entry checkpoint", () => {
    expect(mockRouter.use).toHaveBeenCalledWith(mockAuthenticate);
  });

  test("should bind appropriate validation layers onto paginated query streams", () => {
    expect(mockRouter.get).toHaveBeenCalledWith(
      "/",
      getReportsQueryValidation,
      mockController.getReports,
    );
  });

  test("should bind mutation payload rules onto resolution checkpoints", () => {
    expect(mockRouter.patch).toHaveBeenCalledWith(
      "/:id",
      expect.any(Function),
      handleReportBodyValidation,
      mockController.handleReport,
    );
  });
});
