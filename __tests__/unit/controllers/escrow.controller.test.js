/**
 * @fileoverview Escrow Domain Controller Unit Tests
 * @description Verifies token commitments, customized additional slot payments,
 * asset release hooks, error propagation, and response serialization.
 */

// CRITICAL FIX: Mock catchAsync to return the promise chain so tests can reliably await its completion.
jest.mock("../../../utils/catchAsync", () => {
  return (fn) => (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);
});

const createEscrowController = require("../../../controllers/escrow.controller");

describe("EscrowController", () => {
  let mockEscrowService;
  let controller;
  let req;
  let res;
  let next;

  const mockTransactionResult = {
    transactionId: "tx_esc_123",
    currentHold: 500,
  };
  const mockStatusResult = {
    requestId: "req_xyz789",
    state: "held",
    balance: 60,
  };
  const mockWalletResult = { balance: 1500, escrowBalance: 300 };

  beforeEach(() => {
    // ── MOCK DEPENDENCIES
    mockEscrowService = {
      pay: jest.fn(),
      payAdditional: jest.fn(),
      release: jest.fn(),
      refund: jest.fn(),
      getStatus: jest.fn(),
      getMyWallet: jest.fn(),
      getCommissionRate: jest.fn(),
    };

    controller = createEscrowController({
      escrowService: mockEscrowService,
    });

    // ── EXPRESS HTTP MOCKS
    req = {
      user: { _id: "user_mentee_888" },
      body: {},
      params: {},
      query: {},
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    next = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── pay ─────────────────────────────────────────────────────────────────
  describe("pay", () => {
    test("should return 200 and commit token balances into hold logs on success", async () => {
      req.user._id = "mentee_variant_111";
      req.body = {
        connectRequestId: "req_001",
        sessionRate: 50,
        sessionCount: 4,
      };
      mockEscrowService.pay.mockResolvedValue(mockTransactionResult);

      await controller.pay(req, res, next);

      expect(mockEscrowService.pay).toHaveBeenCalledWith({
        connectRequestId: "req_001",
        sessionRate: 50,
        sessionCount: 4,
        menteeId: "mentee_variant_111",
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: "Payment successful. Tokens locked in escrow.",
        transactionId: "tx_esc_123",
        currentHold: 500,
      });
      expect(next).not.toHaveBeenCalled();
    });

    test("should call next(err) and withhold status updates when service throws", async () => {
      const error = new Error("Insufficient wallet asset balance tokens");
      mockEscrowService.pay.mockRejectedValue(error);

      await controller.pay(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  // ── payAdditional ───────────────────────────────────────────────────────
  describe("payAdditional", () => {
    test("should return 200 and flatten customized sub-slot transaction parameters on success", async () => {
      req.user._id = "mentee_variant_222";
      req.body = {
        connectRequestId: "req_002",
        sessionRate: 60,
        slotId: "slot_999",
      };
      mockEscrowService.payAdditional.mockResolvedValue(mockTransactionResult);

      await controller.payAdditional(req, res, next);

      expect(mockEscrowService.payAdditional).toHaveBeenCalledWith({
        connectRequestId: "req_002",
        sessionRate: 60,
        slotId: "slot_999",
        menteeId: "mentee_variant_222",
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message:
          "Additional session payment successful. Tokens locked in escrow.",
        transactionId: "tx_esc_123",
        currentHold: 500,
      });
      expect(next).not.toHaveBeenCalled();
    });

    test("should call next(err) and withhold status updates when service throws", async () => {
      const error = new Error("Slot lock state lookup validation failure");
      mockEscrowService.payAdditional.mockRejectedValue(error);

      await controller.payAdditional(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  // ── release ─────────────────────────────────────────────────────────────
  describe("release", () => {
    test("should return 200 and shift tokens down onto clear mentor balances on success", async () => {
      req.user._id = "mentee_variant_333";
      req.params.requestId = "req_release_456";
      mockEscrowService.release.mockResolvedValue({ releasedAmount: 200 });

      await controller.release(req, res, next);

      expect(mockEscrowService.release).toHaveBeenCalledWith({
        requestId: "req_release_456",
        menteeId: "mentee_variant_333",
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: "Session marked complete. Tokens released to mentor.",
        releasedAmount: 200,
      });
      expect(next).not.toHaveBeenCalled();
    });

    test("should call next(err) and withhold status updates when service throws", async () => {
      req.params.requestId = "req_fail";
      const error = new Error("Escrow milestone release permissions denied");
      mockEscrowService.release.mockRejectedValue(error);

      await controller.release(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  // ── refund ──────────────────────────────────────────────────────────────
  describe("refund", () => {
    test("should return 200 and revert whole connection balance mappings on success", async () => {
      req.user._id = "user_participant_444";
      req.params.requestId = "req_refund_789";
      mockEscrowService.refund.mockResolvedValue({ refundedAmount: 300 });

      await controller.refund(req, res, next);

      expect(mockEscrowService.refund).toHaveBeenCalledWith({
        requestId: "req_refund_789",
        userId: "user_participant_444",
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: "Escrow refunded successfully. Tokens returned to mentee.",
        refundedAmount: 300,
      });
      expect(next).not.toHaveBeenCalled();
    });

    test("should call next(err) and withhold status updates when service throws", async () => {
      req.params.requestId = "req_fail";
      const error = new Error(
        "Cannot process a refund for a non-disputed active escrow",
      );
      mockEscrowService.refund.mockRejectedValue(error);

      await controller.refund(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  // ── getStatus ───────────────────────────────────────────────────────────
  describe("getStatus", () => {
    test("should return 200 and output un-nested structural metrics directly on success", async () => {
      req.user._id = "user_participant_555";
      req.params.requestId = "req_status_abc";
      mockEscrowService.getStatus.mockResolvedValue(mockStatusResult);

      await controller.getStatus(req, res, next);

      expect(mockEscrowService.getStatus).toHaveBeenCalledWith({
        requestId: "req_status_abc",
        userId: "user_participant_555",
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockStatusResult);
      expect(next).not.toHaveBeenCalled();
    });

    test("should call next(err) and withhold status updates when service throws", async () => {
      req.params.requestId = "req_missing";
      const error = new Error("Target connection index entry missing");
      mockEscrowService.getStatus.mockRejectedValue(error);

      await controller.getStatus(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  // ── getMyWallet ─────────────────────────────────────────────────────────
  describe("getMyWallet", () => {
    test("should return 200 and output specific performance data metrics maps on success", async () => {
      req.user._id = "user_wallet_999";
      mockEscrowService.getMyWallet.mockResolvedValue(mockWalletResult);

      await controller.getMyWallet(req, res, next);

      expect(mockEscrowService.getMyWallet).toHaveBeenCalledWith(
        "user_wallet_999",
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockWalletResult);
      expect(next).not.toHaveBeenCalled();
    });

    test("should call next(err) and withhold status updates when service throws", async () => {
      const error = new Error("Financial ledger service offline sync error");
      mockEscrowService.getMyWallet.mockRejectedValue(error);

      await controller.getMyWallet(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  // ── getCommissionRate ───────────────────────────────────────────────────
  describe("getCommissionRate", () => {
    test("should return 200 and wrap operational commission fee rate values precisely on success", async () => {
      mockEscrowService.getCommissionRate.mockResolvedValue(18);

      await controller.getCommissionRate(req, res, next);

      expect(mockEscrowService.getCommissionRate).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ commissionRate: 18 });
      expect(next).not.toHaveBeenCalled();
    });

    test("should call next(err) and withhold status updates when service throws", async () => {
      const error = new Error("Global settings schema metadata corruption");
      mockEscrowService.getCommissionRate.mockRejectedValue(error);

      await controller.getCommissionRate(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
    });
  });
});
