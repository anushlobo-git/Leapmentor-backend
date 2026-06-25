/**
 * @fileoverview Leap Request Service Corporate Unit Tests
 * @description Validates state machine boundaries, wallet deposit interactions,
 * and operational threshold rejections with zero real database connectivity.
 */

const createLeapRequestService = require("../../../services/leapRequest.service");
const AppError = require("../../../utils/AppError");

// Stub layout mappers to eliminate secondary mapping dependencies
jest.mock("../../../mappers/leapRequest.mapper", () => ({
  toLeapRequestDTO: jest.fn((req) =>
    req ? { DTO: true, _id: req._id, status: req.status } : null,
  ),
}));

describe("LeapRequest Service", () => {
  let mockLeapRequestRepository;
  let mockWalletRepository;
  let leapRequestService;

  const mockRequestRecord = {
    _id: "req999",
    mentee: "menteeXYZ",
    status: "pending",
    currentBalance: 100,
    reviewedAt: null,
    reviewedBy: null,
  };

  beforeEach(() => {
    mockLeapRequestRepository = {
      findLatestByMenteeAndStatus: jest.fn(),
      create: jest.fn(),
      findAllWithMentee: jest.fn(),
      countByStatus: jest.fn(),
      findById: jest.fn(),
      save: jest.fn(),
    };

    mockWalletRepository = {
      findWalletByUser: jest.fn(),
      incrementBalance: jest.fn(),
    };

    leapRequestService = createLeapRequestService(
      mockLeapRequestRepository,
      mockWalletRepository,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── getMyPendingRequest ─────────────────────────────────────────────────
  describe("getMyPendingRequest", () => {
    test("should fetch request and parse through the DTO contract framework", async () => {
      mockLeapRequestRepository.findLatestByMenteeAndStatus.mockResolvedValue(
        mockRequestRecord,
      );

      const result = await leapRequestService.getMyPendingRequest("menteeXYZ");

      expect(
        mockLeapRequestRepository.findLatestByMenteeAndStatus,
      ).toHaveBeenCalledWith("menteeXYZ", "pending");
      expect(result).toEqual({ DTO: true, _id: "req999", status: "pending" });
    });
  });

  // ── createLeapRequest ───────────────────────────────────────────────────
  describe("createLeapRequest", () => {
    test("should create allocation requests if user passes point validation gates", async () => {
      mockLeapRequestRepository.findLatestByMenteeAndStatus.mockResolvedValue(
        null,
      );
      mockWalletRepository.findWalletByUser.mockResolvedValue({ balance: 150 });
      mockLeapRequestRepository.create.mockResolvedValue(mockRequestRecord);

      const result = await leapRequestService.createLeapRequest("menteeXYZ");

      expect(mockLeapRequestRepository.create).toHaveBeenCalledWith({
        mentee: "menteeXYZ",
        currentBalance: 150,
      });
      expect(result).toEqual({ DTO: true, _id: "req999", status: "pending" });
    });

    test("should throw a 409 conflict error if another pending ticket is open", async () => {
      mockLeapRequestRepository.findLatestByMenteeAndStatus.mockResolvedValue(
        mockRequestRecord,
      );

      await expect(
        leapRequestService.createLeapRequest("menteeXYZ"),
      ).rejects.toThrow(
        new AppError(
          "A pending points allocation request already exists for this user profile.",
          409,
        ),
      );
    });

    test("should throw a 400 bad request error if current user balance sits at or above limits", async () => {
      mockLeapRequestRepository.findLatestByMenteeAndStatus.mockResolvedValue(
        null,
      );
      mockWalletRepository.findWalletByUser.mockResolvedValue({ balance: 500 }); // Threshold limit

      await expect(
        leapRequestService.createLeapRequest("menteeXYZ"),
      ).rejects.toThrow(AppError);
    });
  });

  // ── approveLeapRequest ──────────────────────────────────────────────────
  describe("approveLeapRequest", () => {
    test("should credit user wallets and update state flags to approved", async () => {
      // Create a deep copy clone of the record to safely assert property assignments
      const internalInstance = { ...mockRequestRecord };
      mockLeapRequestRepository.findById.mockResolvedValue(internalInstance);
      mockWalletRepository.incrementBalance.mockResolvedValue({ balance: 600 });
      mockLeapRequestRepository.save.mockResolvedValue(internalInstance);

      const result = await leapRequestService.approveLeapRequest(
        "req999",
        "adminAdmin",
      );

      expect(mockLeapRequestRepository.findById).toHaveBeenCalledWith("req999");
      expect(mockWalletRepository.incrementBalance).toHaveBeenCalledWith(
        "menteeXYZ",
        500,
      );
      expect(internalInstance.status).toBe("approved");
      expect(internalInstance.reviewedBy).toBe("adminAdmin");
      expect(internalInstance.reviewedAt).toBeInstanceOf(Date);
      expect(mockLeapRequestRepository.save).toHaveBeenCalledWith(
        internalInstance,
      );
      expect(result.newBalance).toBe(600);
    });

    test("should throw a 404 error if target request identifier cannot be located", async () => {
      mockLeapRequestRepository.findById.mockResolvedValue(null);

      await expect(
        leapRequestService.approveLeapRequest("invalid", "admin"),
      ).rejects.toThrow(
        new AppError(
          "Points processing target context request not found.",
          404,
        ),
      );
    });

    test("should throw a 400 error if request status is already closed", async () => {
      const closedInstance = { ...mockRequestRecord, status: "approved" };
      mockLeapRequestRepository.findById.mockResolvedValue(closedInstance);

      await expect(
        leapRequestService.approveLeapRequest("req999", "admin"),
      ).rejects.toThrow(
        new AppError(
          "This request workflow has already been closed and processed.",
          400,
        ),
      );
    });
  });

  // ── rejectLeapRequest ───────────────────────────────────────────────────
  describe("rejectLeapRequest", () => {
    test("should flag transaction status fields as rejected safely without altering balances", async () => {
      const internalInstance = { ...mockRequestRecord };
      mockLeapRequestRepository.findById.mockResolvedValue(internalInstance);
      mockLeapRequestRepository.save.mockResolvedValue(internalInstance);

      const result = await leapRequestService.rejectLeapRequest(
        "req999",
        "adminAdmin",
      );

      expect(internalInstance.status).toBe("rejected");
      expect(mockWalletRepository.incrementBalance).not.toHaveBeenCalled();
      expect(result.status).toBe("rejected");
    });
  });
});
