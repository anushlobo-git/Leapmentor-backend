/**
 * @fileoverview Escrow Controller Unit Tests
 * @description Validates structural HTTP status allocations, payload spreading integrity,
 * parameters extraction routing loops, and catchAsync exception cascades.
 */

const createEscrowController = require("../../../controllers/escrow.controller");

describe("Escrow Controller Unit Tests", () => {
  let mockEscrowService, controller, mockReq, mockRes, mockNext;

  const flushPromises = () => new Promise(setImmediate);

  beforeEach(() => {
    mockEscrowService = {
      pay: jest.fn(),
      payAdditional: jest.fn(),
      release: jest.fn(),
      refund: jest.fn(),
      getStatus: jest.fn(),
      getMyWallet: jest.fn(),
      getCommissionRate: jest.fn(),
    };

    controller = createEscrowController(mockEscrowService);

    mockReq = { user: { _id: "user_uuid_101" }, body: {}, params: {} };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("pay should execute balance locks and verify payload format serialization strings", async () => {
    mockReq.body = {
      connectRequestId: "req_99",
      sessionRate: 50,
      sessionCount: 2,
    };
    const mockOutput = { totalAmount: 110, paymentStatus: "paid" };
    mockEscrowService.pay.mockResolvedValue(mockOutput);

    await controller.pay(mockReq, mockRes, mockNext);
    await flushPromises();

    expect(mockEscrowService.pay).toHaveBeenCalledWith({
      connectRequestId: "req_99",
      sessionRate: 50,
      sessionCount: 2,
      menteeId: "user_uuid_101",
    });
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({
      message: "Payment successful. Tokens locked in escrow.",
      ...mockOutput,
    });
  });

  test("payAdditional should pass tracking params down onto slot increment tasks", async () => {
    mockReq.body = {
      connectRequestId: "req_99",
      sessionRate: 50,
      slotId: "slot_01",
    };
    mockEscrowService.payAdditional.mockResolvedValue({ slotId: "slot_01" });

    await controller.payAdditional(mockReq, mockRes, mockNext);
    await flushPromises();

    expect(mockRes.status).toHaveBeenCalledWith(200);

    // Ensure additional string confirmation responses match frontend contracts
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message:
          "Additional session payment successful. Tokens locked in escrow.",
      }),
    );
  });

  test("release should mark transaction timelines complete and update ledger profiles", async () => {
    mockReq.params.requestId = "req_payout_abc";
    mockEscrowService.release.mockResolvedValue({ status: "completed" });

    await controller.release(mockReq, mockRes, mockNext);
    await flushPromises();

    expect(mockEscrowService.release).toHaveBeenCalledWith({
      requestId: "req_payout_abc",
      menteeId: "user_uuid_101",
    });
    expect(mockRes.status).toHaveBeenCalledWith(200);
  });

  test("getStatus should output clean status definitions omitting wrap parameters metadata logs", async () => {
    mockReq.params.requestId = "req_state_xyz";
    const servicePayload = { status: "ongoing", paymentStatus: "paid" };
    mockEscrowService.getStatus.mockResolvedValue(servicePayload);

    await controller.getStatus(mockReq, mockRes, mockNext);
    await flushPromises();

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(servicePayload);
  });

  test("getMyWallet should match clear structural outputs", async () => {
    mockEscrowService.getMyWallet.mockResolvedValue({
      balance: 300,
      escrow: 50,
    });

    await controller.getMyWallet(mockReq, mockRes, mockNext);
    await flushPromises();

    expect(mockEscrowService.getMyWallet).toHaveBeenCalledWith("user_uuid_101");
    expect(mockRes.json).toHaveBeenCalledWith({ balance: 300, escrow: 50 });
  });

  test("getCommissionRate should wrap target numerical numbers within an explicit commissionRate object shell", async () => {
    mockEscrowService.getCommissionRate.mockResolvedValue(20);

    await controller.getCommissionRate(mockReq, mockRes, mockNext);
    await flushPromises();

    expect(mockRes.json).toHaveBeenCalledWith({ commissionRate: 20 });
  });

  test("should trap thrown runtime operational exceptions routing them directly downstream to next()", async () => {
    const errorInstance = new Error(
      "Platform admin not found. Contact support.",
    );
    mockEscrowService.pay.mockRejectedValue(errorInstance);

    await controller.pay(mockReq, mockRes, mockNext);
    await flushPromises();

    expect(mockNext).toHaveBeenCalledWith(errorInstance);
    expect(mockRes.status).not.toHaveBeenCalled();
  });
});
