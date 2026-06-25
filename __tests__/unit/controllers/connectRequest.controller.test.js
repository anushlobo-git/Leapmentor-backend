/**
 * @fileoverview Connection Request Controller Unit Tests
 * @description Validates structural parameters delivery, payload consistency,
 * HTTP status codes mapping, and boundary exception cascading.
 */

const createConnectRequestController = require("../../../controllers/connectRequest.controller");

describe("Connection Request Controller Unit Tests", () => {
  let mockConnectRequestService, controller, mockReq, mockRes, mockNext;

  const flushPromises = () => new Promise(setImmediate);

  beforeEach(() => {
    mockConnectRequestService = {
      sendConnectRequestService: jest.fn(),
      getMyRequestsService: jest.fn(),
      getIncomingRequestsService: jest.fn(),
      respondToRequestService: jest.fn(),
      cancelRequestService: jest.fn(),
      referRequestService: jest.fn(),
      getOngoingConnectsService: jest.fn(),
      getConnectDetailService: jest.fn(),
    };

    controller = createConnectRequestController(mockConnectRequestService);

    mockReq = {
      user: { _id: "user_uuid_123" },
      body: {},
      params: {},
      query: {},
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

  test("sendConnectRequest should return 201 and output verification payloads on success", async () => {
    mockReq.body = { mentorId: "mentor_456", message: "Hello" };
    const mockCreatedResult = { _id: "request_id_999", status: "pending" };
    mockConnectRequestService.sendConnectRequestService.mockResolvedValue(
      mockCreatedResult,
    );

    await controller.sendConnectRequest(mockReq, mockRes, mockNext);
    await flushPromises();

    expect(
      mockConnectRequestService.sendConnectRequestService,
    ).toHaveBeenCalledWith("user_uuid_123", mockReq.body, mockReq.user);
    expect(mockRes.status).toHaveBeenCalledWith(201);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: true,
      message: "Connect request sent successfully",
      request: mockCreatedResult,
    });
  });

  test("respondToRequest should map successful status variations with a 200 code", async () => {
    mockReq.params.id = "req_123";
    mockReq.body = { status: "accepted" };
    mockConnectRequestService.respondToRequestService.mockResolvedValue({
      _id: "req_123",
      status: "accepted",
    });

    await controller.respondToRequest(mockReq, mockRes, mockNext);
    await flushPromises();

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: true,
      message: "Request accepted successfully",
      request: expect.objectContaining({ status: "accepted" }),
    });
  });

  test("cancelRequest should confirm termination with a 200 status code", async () => {
    mockReq.params.id = "req_456";
    mockConnectRequestService.cancelRequestService.mockResolvedValue();

    await controller.cancelRequest(mockReq, mockRes, mockNext);
    await flushPromises();

    expect(mockConnectRequestService.cancelRequestService).toHaveBeenCalledWith(
      "req_456",
      "user_uuid_123",
    );
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: true,
      message: "Request cancelled successfully",
    });
  });

  test("referRequest should spread execution metrics alongside success logs", async () => {
    mockReq.params.id = "req_789";
    const servicePayload = {
      originalRequest: { status: "referred" },
      newRequest: { status: "pending" },
    };
    mockConnectRequestService.referRequestService.mockResolvedValue(
      servicePayload,
    );

    await controller.referRequest(mockReq, mockRes, mockNext);
    await flushPromises();

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: true,
      message: "Request referred successfully",
      ...servicePayload,
    });
  });

  test("should catch service rejections and delegate them safely downstream to next()", async () => {
    const mockError = new Error("Not authorized to view this session");
    mockConnectRequestService.getConnectDetailService.mockRejectedValue(
      mockError,
    );
    mockReq.params.id = "req_unauth";

    await controller.getConnectDetail(mockReq, mockRes, mockNext);
    await flushPromises();

    expect(mockNext).toHaveBeenCalledWith(mockError);
    expect(mockRes.status).not.toHaveBeenCalled();
  });
});
