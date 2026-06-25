/**
 * @fileoverview Leap Request Controller Corporate Unit Tests
 * @description Validates HTTP boundary processing, payload mapping routers,
 * cookie configurations, and service invocation flows with zero live network activity.
 */

const createLeapRequestController = require("../../../controllers/leapRequest.controller");

describe("LeapRequest Controller", () => {
  let mockLeapRequestService;
  let controller;
  let mockReq;
  let mockRes;
  let mockNext;

  // Enforces Jest to wait until background catchAsync execution threads resolve completely
  const flushPromises = () => new Promise(setImmediate);

  beforeEach(() => {
    mockLeapRequestService = {
      getMyPendingRequest: jest.fn(),
      createLeapRequest: jest.fn(),
      getAllLeapRequests: jest.fn(),
      getPendingCount: jest.fn(),
      approveLeapRequest: jest.fn(),
      rejectLeapRequest: jest.fn(),
    };

    controller = createLeapRequestController(mockLeapRequestService);

    mockReq = {
      user: { _id: "mentee123" },
      query: {},
      params: {},
      admin: { _id: "admin789" },
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── getMyRequest ────────────────────────────────────────────────────────
  describe("getMyRequest", () => {
    test("should respond with 200 and return the raw data payload on successful matches", async () => {
      const mockPayload = { _id: "req001", status: "pending" };
      mockLeapRequestService.getMyPendingRequest.mockResolvedValue(mockPayload);

      await controller.getMyRequest(mockReq, mockRes, mockNext);
      await flushPromises();

      expect(mockLeapRequestService.getMyPendingRequest).toHaveBeenCalledWith(
        "mentee123",
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockPayload,
      });
    });

    test("should respond with 200 and explicitly return null if no request is active", async () => {
      mockLeapRequestService.getMyPendingRequest.mockResolvedValue(null);

      await controller.getMyRequest(mockReq, mockRes, mockNext);
      await flushPromises();

      expect(mockRes.json).toHaveBeenCalledWith({ success: true, data: null });
    });
  });

  // ── createRequest ───────────────────────────────────────────────────────
  describe("createRequest", () => {
    test("should respond with 201 when new credit requests are created successfully", async () => {
      const mockPayload = { _id: "req002", status: "pending" };
      mockLeapRequestService.createLeapRequest.mockResolvedValue(mockPayload);

      await controller.createRequest(mockReq, mockRes, mockNext);
      await flushPromises();

      expect(mockLeapRequestService.createLeapRequest).toHaveBeenCalledWith(
        "mentee123",
      );
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: "Request submitted successfully.",
        request: mockPayload,
      });
    });
  });

  // ── getAllRequests & getPendingCount ────────────────────────────────────
  describe("Administrative Query Ledger Operations", () => {
    test("getAllRequests should pass query state filters straight to the data service layer", async () => {
      mockReq.query.status = "approved";
      mockLeapRequestService.getAllLeapRequests.mockResolvedValue([]);

      await controller.getAllRequests(mockReq, mockRes, mockNext);
      await flushPromises();

      expect(mockLeapRequestService.getAllLeapRequests).toHaveBeenCalledWith(
        "approved",
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    test("getPendingCount should return a numerical object tracking unresolved tickets", async () => {
      mockLeapRequestService.getPendingCount.mockResolvedValue(42);

      await controller.getPendingCount(mockReq, mockRes, mockNext);
      await flushPromises();

      expect(mockLeapRequestService.getPendingCount).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith({ count: 42 });
    });
  });

  // ── approveRequest & rejectRequest ──────────────────────────────────────
  describe("Moderation Workflow Settlement Interventions", () => {
    test("approveRequest should call the service layer using route keys and moderator IDs", async () => {
      mockReq.params.id = "targetRequestID";
      mockLeapRequestService.approveLeapRequest.mockResolvedValue({
        newBalance: 1000,
        request: { _id: "targetRequestID", status: "approved" },
      });

      await controller.approveRequest(mockReq, mockRes, mockNext);
      await flushPromises();

      expect(mockLeapRequestService.approveLeapRequest).toHaveBeenCalledWith(
        "targetRequestID",
        "admin789",
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ newBalance: 1000 }),
      );
    });

    test("rejectRequest should flag processing logs as blocked cleanly", async () => {
      mockReq.params.id = "targetRequestID";
      mockLeapRequestService.rejectLeapRequest.mockResolvedValue({
        _id: "targetRequestID",
        status: "rejected",
      });

      await controller.rejectRequest(mockReq, mockRes, mockNext);
      await flushPromises();

      expect(mockLeapRequestService.rejectLeapRequest).toHaveBeenCalledWith(
        "targetRequestID",
        "admin789",
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Request rejected." }),
      );
    });
  });
});
