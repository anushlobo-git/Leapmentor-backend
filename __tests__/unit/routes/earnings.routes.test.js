/**
 * @fileoverview Mentor Earnings Router Unit Tests
 * @description Assures valid alignment of HTTP methods, path strings, and specific role validation middleware stacks.
 */

const createEarningsRoutes = require("../../../routes/earnings.routes");

// Isolate the Express Router engine to audit endpoint registration array metrics
const mockRouter = {
  get: jest.fn(),
  post: jest.fn(),
};
jest.mock("express", () => ({
  Router: () => mockRouter,
}));

describe("Mentor Earnings Router Unit Tests", () => {
  let mockController, mockMiddlewares, mockValidations;

  beforeEach(() => {
    mockController = {
      getEarningsSummary: jest.fn(),
      getEarningsChart: jest.fn(),
      getPayoutHistory: jest.fn(),
      withdrawEarnings: jest.fn(),
    };

    mockMiddlewares = {
      authenticate: "middleware_auth_guard",
      requireRole: jest.fn((role) => `middleware_role_guard_${role}`),
    };

    mockValidations = {
      getEarningsChartValidation: "celebrate_chart_middleware",
      getPayoutHistoryValidation: "celebrate_payouts_middleware",
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("should anchor lookups and trend graphs to correct authentication and celebrate guards", () => {
    createEarningsRoutes(mockController, mockMiddlewares, mockValidations);

    expect(mockMiddlewares.requireRole).toHaveBeenCalledWith("mentor");
    expect(mockRouter.get).toHaveBeenCalledWith(
      "/",
      "middleware_auth_guard",
      "middleware_role_guard_mentor",
      mockController.getEarningsSummary,
    );
    expect(mockRouter.get).toHaveBeenCalledWith(
      "/chart",
      "middleware_auth_guard",
      "middleware_role_guard_mentor",
      "celebrate_chart_middleware",
      mockController.getEarningsChart,
    );
  });

  test("should enforce paginated lookups and outbound disbursement validation limits", () => {
    createEarningsRoutes(mockController, mockMiddlewares, mockValidations);

    expect(mockRouter.get).toHaveBeenCalledWith(
      "/payouts",
      "middleware_auth_guard",
      "middleware_role_guard_mentor",
      "celebrate_payouts_middleware",
      mockController.getPayoutHistory,
    );
    expect(mockRouter.post).toHaveBeenCalledWith(
      "/withdraw",
      "middleware_auth_guard",
      "middleware_role_guard_mentor",
      mockController.withdrawEarnings,
    );
  });
});
