/**
 * @fileoverview Admin Routes Component Corporate Unit Tests
 * @description Assures precise registration verification of URL path mappings,
 * middleware security stack bounds, and verb controller bindings with zero server execution.
 */

const createAdminRoutes = require("../../../routes/admin.routes");

const {
  adminLoginValidation,
  getUsersQueryValidation,
  getEngagementsQueryValidation,
  userIdParamValidation,
} = require("../../../validations/admin.validation");

// Mock Express router mechanics globally to spy on registration invocations
const mockRouter = {
  post: jest.fn(),
  get: jest.fn(),
  patch: jest.fn(),
  delete: jest.fn(),
  use: jest.fn(),
};

jest.mock("express", () => ({
  Router: () => mockRouter,
}));

describe("Admin Routes Configuration Matrix", () => {
  let mockAdminController;
  let mockLeapRequestController;
  let mockAdminAuthenticate;

  beforeEach(() => {
    mockAdminController = {
      adminLogin: jest.fn(),
      adminLogout: jest.fn(),
      adminMe: jest.fn(),
      getStats: jest.fn(),
      getUserGrowth: jest.fn(),
      getMentorIndustryStats: jest.fn(),
      getEngagementStats: jest.fn(),
      getUsers: jest.fn(),
      getUserDetail: jest.fn(),
      deleteUser: jest.fn(),
      blockUser: jest.fn(),
      unblockUser: jest.fn(),
      getEngagements: jest.fn(),
    };

    mockLeapRequestController = {
      getPendingCount: jest.fn(),
    };

    mockAdminAuthenticate = jest.fn();

    // Initialize the route mapping tree
    createAdminRoutes(
      mockAdminController,
      mockLeapRequestController,
      mockAdminAuthenticate,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Authentication Endpoint Mappings", () => {
    test("should bind login validation rules to the post auth login path", () => {
      expect(mockRouter.post).toHaveBeenCalledWith(
        "/auth/login",
        adminLoginValidation,
        mockAdminController.adminLogin,
      );
    });

    test("should bind logout parameters to the post auth logout path", () => {
      expect(mockRouter.post).toHaveBeenCalledWith(
        "/auth/logout",
        mockAdminController.adminLogout,
      );
    });

    test("should establish the global authentication firewall middleware across the route matrix", () => {
      expect(mockRouter.use).toHaveBeenCalledWith(mockAdminAuthenticate);
    });

    test("should bind access identity profiles to the profile lookup endpoint", () => {
      expect(mockRouter.get).toHaveBeenCalledWith(
        "/auth/me",
        mockAdminController.adminMe,
      );
    });
  });

  describe("Metrics and Telemetry Endpoint Mappings", () => {
    test("should bind analytics aggregations to high-level metric routers", () => {
      expect(mockRouter.get).toHaveBeenCalledWith(
        "/stats",
        mockAdminController.getStats,
      );
      expect(mockRouter.get).toHaveBeenCalledWith(
        "/user-growth",
        mockAdminController.getUserGrowth,
      );
      expect(mockRouter.get).toHaveBeenCalledWith(
        "/stats/mentor-industries",
        mockAdminController.getMentorIndustryStats,
      );
    });
  });

  describe("User Profile Interventions Mappings", () => {
    test("should verify query interceptors on the users ledger path", () => {
      expect(mockRouter.get).toHaveBeenCalledWith(
        "/users",
        getUsersQueryValidation,
        mockAdminController.getUsers,
      );
    });

    test("should protect individual account paths using param validation filters", () => {
      expect(mockRouter.get).toHaveBeenCalledWith(
        "/users/:userId",
        userIdParamValidation,
        mockAdminController.getUserDetail,
      );
      expect(mockRouter.delete).toHaveBeenCalledWith(
        "/users/:userId",
        userIdParamValidation,
        mockAdminController.deleteUser,
      );
    });

    test("should attach lifecycle path parameters to account modification modifiers", () => {
      expect(mockRouter.patch).toHaveBeenCalledWith(
        "/users/:userId/block",
        mockAdminController.blockUser,
      );
      expect(mockRouter.patch).toHaveBeenCalledWith(
        "/users/:userId/unblock",
        mockAdminController.unblockUser,
      );
    });
  });

  describe("Ecosystem Contracts & Allocation Queue Mappings", () => {
    test("should map structured transaction queries to engagement trackers", () => {
      expect(mockRouter.get).toHaveBeenCalledWith(
        "/engagements",
        getEngagementsQueryValidation,
        mockAdminController.getEngagements,
      );
    });

    test("should link the separate leap request cross-cutting controller to the credit queue route", () => {
      expect(mockRouter.get).toHaveBeenCalledWith(
        "/leap-requests/pending-count",
        mockLeapRequestController.getPendingCount,
      );
    });
  });
});
