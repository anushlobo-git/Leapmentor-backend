const createReportRoutes = require("../../../routes/report.routes");

const mockRouter = {
  use: jest.fn(),
  get: jest.fn(),
  post: jest.fn(),
  patch: jest.fn(),
};
jest.mock("express", () => ({ Router: () => mockRouter }));

describe("Report Router Unit Tests", () => {
  test("should anchor proper route structures assigning role checking gates", () => {
    const mockController = {
      getAllReports: "c_dashboard",
      updateReportStatus: "c_patch",
    };
    const mockMiddlewares = {
      authenticate: "auth_wall",
      requireRole: jest.fn((r) => `role_${r}`),
      upload: { single: jest.fn() },
    };
    const mockValidations = {
      getAllReportsValidation: "v_all",
      updateReportStatusValidation: "v_status",
    };

    createReportRoutes(mockController, mockMiddlewares, mockValidations);
    expect(mockRouter.use).toHaveBeenCalledWith("role_admin");
    expect(mockRouter.get).toHaveBeenCalledWith(
      "/admin",
      "v_all",
      "c_dashboard",
    );
  });
});
