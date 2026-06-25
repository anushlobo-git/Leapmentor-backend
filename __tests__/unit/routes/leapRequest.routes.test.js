/**
 * @fileoverview Leap Request Routes Component Corporate Unit Tests
 * @description Verifies path registrations, user/admin middleware boundaries,
 * and endpoint controller validation bindings with zero live server execution.
 */

const createLeapRequestRoutes = require("../../../routes/leapRequest.routes");

const {
  getAllLeapRequestsQueryValidation,
  leapRequestIdParamValidation,
} = require("../../../validations/leapRequest.validation");

// Mock Express router to record and spy on initialization paths
const mockRouter = {
  get: jest.fn(),
  post: jest.fn(),
  patch: jest.fn(),
  use: jest.fn(),
};

jest.mock("express", () => ({
  Router: () => mockRouter,
}));

describe("LeapRequest Routes Configuration Matrix", () => {
  let mockLeapRequestController;
  let mockAuthenticate;
  let mockAdminAuthenticate;

  beforeEach(() => {
    mockLeapRequestController = {
      getMyRequest: jest.fn(),
      createRequest: jest.fn(),
      getAllRequests: jest.fn(),
      getPendingCount: jest.fn(),
      approveRequest: jest.fn(),
      rejectRequest: jest.fn(),
    };

    mockAuthenticate = jest.fn();
    mockAdminAuthenticate = jest.fn();

    createLeapRequestRoutes(
      mockLeapRequestController,
      mockAuthenticate,
      mockAdminAuthenticate,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Administrative Review Pipelines with Celebrated Request Validation Rules", () => {
    test("should verify query interceptors on the base administrative ledger GET path", () => {
      expect(mockRouter.get).toHaveBeenCalledWith(
        "/",
        getAllLeapRequestsQueryValidation,
        mockLeapRequestController.getAllRequests,
      );
    });

    test("should assert validation parameters on patch approval and rejection routes", () => {
      expect(mockRouter.patch).toHaveBeenCalledWith(
        "/:id/approve",
        leapRequestIdParamValidation,
        mockLeapRequestController.approveRequest,
      );
      expect(mockRouter.patch).toHaveBeenCalledWith(
        "/:id/reject",
        leapRequestIdParamValidation,
        mockLeapRequestController.rejectRequest,
      );
    });
  });
});
