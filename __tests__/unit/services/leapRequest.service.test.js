/**
 * @fileoverview Leap Request Service Unit Tests
 */

const createLeapRequestService = require("../../../services/leapRequest.service");

jest.mock("../../../mappers/leapRequest.mapper", () => ({
  toLeapRequestDTO: jest.fn((req) =>
    req ? { DTO: true, _id: req._id, status: req.status } : null,
  ),
}));

describe("LeapRequest Service", () => {
  let mockLeapRequestRepository;
  let mockWalletRepository;
  let service;

  const mockRecord = {
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

    service = createLeapRequestService({
      leapRequestRepository: mockLeapRequestRepository,
      walletRepository: mockWalletRepository,
    });
  });

  afterEach(() => jest.clearAllMocks());

  // ── getMyPendingRequest ─────────────────────────────────────────────────
  describe("getMyPendingRequest", () => {
    test("returns mapped DTO for found request", async () => {
      mockLeapRequestRepository.findLatestByMenteeAndStatus.mockResolvedValue(
        mockRecord,
      );

      const result = await service.getMyPendingRequest("menteeXYZ");

      expect(
        mockLeapRequestRepository.findLatestByMenteeAndStatus,
      ).toHaveBeenCalledWith("menteeXYZ", "pending");
      expect(result).toEqual({ DTO: true, _id: "req999", status: "pending" });
    });

    test("returns null when no pending request exists", async () => {
      mockLeapRequestRepository.findLatestByMenteeAndStatus.mockResolvedValue(
        null,
      );

      const result = await service.getMyPendingRequest("menteeXYZ");

      expect(result).toBeNull();
    });
  });

  // ── createLeapRequest ───────────────────────────────────────────────────
  describe("createLeapRequest", () => {
    test("creates request when no pending exists and balance is below threshold", async () => {
      mockLeapRequestRepository.findLatestByMenteeAndStatus.mockResolvedValue(
        null,
      );
      mockWalletRepository.findWalletByUser.mockResolvedValue({ balance: 150 });
      mockLeapRequestRepository.create.mockResolvedValue(mockRecord);

      const result = await service.createLeapRequest("menteeXYZ");

      expect(mockLeapRequestRepository.create).toHaveBeenCalledWith({
        mentee: "menteeXYZ",
        currentBalance: 150,
      });
      expect(result).toEqual({ DTO: true, _id: "req999", status: "pending" });
    });

    test("throws 409 if pending request already exists", async () => {
      mockLeapRequestRepository.findLatestByMenteeAndStatus.mockResolvedValue(
        mockRecord,
      );

      await expect(
        service.createLeapRequest("menteeXYZ"),
      ).rejects.toMatchObject({
        statusCode: 409,
        message:
          "A pending points allocation request already exists for this user profile.",
      });
    });

    test("throws 400 if balance is at or above threshold (500)", async () => {
      mockLeapRequestRepository.findLatestByMenteeAndStatus.mockResolvedValue(
        null,
      );
      mockWalletRepository.findWalletByUser.mockResolvedValue({ balance: 500 });

      await expect(
        service.createLeapRequest("menteeXYZ"),
      ).rejects.toMatchObject({
        statusCode: 400,
      });
    });

    test("uses 0 as currentBalance when wallet is null (nullish coalescing)", async () => {
      mockLeapRequestRepository.findLatestByMenteeAndStatus.mockResolvedValue(
        null,
      );
      mockWalletRepository.findWalletByUser.mockResolvedValue(null);
      mockLeapRequestRepository.create.mockResolvedValue({
        ...mockRecord,
        currentBalance: 0,
      });

      await service.createLeapRequest("menteeXYZ");

      expect(mockLeapRequestRepository.create).toHaveBeenCalledWith({
        mentee: "menteeXYZ",
        currentBalance: 0,
      });
    });
  });

  // ── getAllLeapRequests ───────────────────────────────────────────────────
  describe("getAllLeapRequests", () => {
    test("fetches all requests without status filter", async () => {
      mockLeapRequestRepository.findAllWithMentee.mockResolvedValue([
        mockRecord,
      ]);

      const result = await service.getAllLeapRequests();

      expect(mockLeapRequestRepository.findAllWithMentee).toHaveBeenCalledWith(
        {},
      );
      expect(result).toEqual([{ DTO: true, _id: "req999", status: "pending" }]);
    });

    test("applies status filter when provided", async () => {
      mockLeapRequestRepository.findAllWithMentee.mockResolvedValue([
        mockRecord,
      ]);

      await service.getAllLeapRequests("approved");

      expect(mockLeapRequestRepository.findAllWithMentee).toHaveBeenCalledWith({
        status: "approved",
      });
    });
  });

  // ── getPendingCount ─────────────────────────────────────────────────────
  describe("getPendingCount", () => {
    test("returns count from repository", async () => {
      mockLeapRequestRepository.countByStatus.mockResolvedValue(7);

      const result = await service.getPendingCount();

      expect(mockLeapRequestRepository.countByStatus).toHaveBeenCalledWith(
        "pending",
      );
      expect(result).toBe(7);
    });
  });

  // ── approveLeapRequest ──────────────────────────────────────────────────
  describe("approveLeapRequest", () => {
    test("approves request, credits wallet, and updates state flags", async () => {
      const instance = { ...mockRecord };
      mockLeapRequestRepository.findById.mockResolvedValue(instance);
      mockWalletRepository.incrementBalance.mockResolvedValue({ balance: 600 });
      mockLeapRequestRepository.save.mockResolvedValue(instance);

      const result = await service.approveLeapRequest("req999", "adminA");

      expect(mockWalletRepository.incrementBalance).toHaveBeenCalledWith(
        "menteeXYZ",
        500,
      );
      expect(instance.status).toBe("approved");
      expect(instance.reviewedBy).toBe("adminA");
      expect(instance.reviewedAt).toBeInstanceOf(Date);
      expect(result.newBalance).toBe(600);
    });

    test("resolves menteeId from mentee._id when mentee is a populated object", async () => {
      const instance = { ...mockRecord, mentee: { _id: "menteeXYZ" } };
      mockLeapRequestRepository.findById.mockResolvedValue(instance);
      mockWalletRepository.incrementBalance.mockResolvedValue({ balance: 600 });
      mockLeapRequestRepository.save.mockResolvedValue(instance);

      await service.approveLeapRequest("req999", "adminA");

      expect(mockWalletRepository.incrementBalance).toHaveBeenCalledWith(
        "menteeXYZ",
        500,
      );
    });

    test("throws 404 if request not found", async () => {
      mockLeapRequestRepository.findById.mockResolvedValue(null);

      await expect(
        service.approveLeapRequest("bad", "admin"),
      ).rejects.toMatchObject({
        statusCode: 404,
        message: "Points processing target context request not found.",
      });
    });

    test("throws 400 if request is already closed", async () => {
      mockLeapRequestRepository.findById.mockResolvedValue({
        ...mockRecord,
        status: "approved",
      });

      await expect(
        service.approveLeapRequest("req999", "admin"),
      ).rejects.toMatchObject({
        statusCode: 400,
        message: "This request workflow has already been closed and processed.",
      });
    });
  });

  // ── rejectLeapRequest ───────────────────────────────────────────────────
  describe("rejectLeapRequest", () => {
    test("rejects request and updates state without touching wallet", async () => {
      const instance = { ...mockRecord };
      mockLeapRequestRepository.findById.mockResolvedValue(instance);
      mockLeapRequestRepository.save.mockResolvedValue(instance);

      const result = await service.rejectLeapRequest("req999", "adminA");

      expect(instance.status).toBe("rejected");
      expect(instance.reviewedBy).toBe("adminA");
      expect(instance.reviewedAt).toBeInstanceOf(Date);
      expect(mockWalletRepository.incrementBalance).not.toHaveBeenCalled();
      expect(result.status).toBe("rejected");
    });

    test("throws 404 if request not found", async () => {
      mockLeapRequestRepository.findById.mockResolvedValue(null);

      await expect(
        service.rejectLeapRequest("bad", "admin"),
      ).rejects.toMatchObject({
        statusCode: 404,
        message: "Points processing target context request not found.",
      });
    });

    test("throws 400 if request is already closed", async () => {
      mockLeapRequestRepository.findById.mockResolvedValue({
        ...mockRecord,
        status: "rejected",
      });

      await expect(
        service.rejectLeapRequest("req999", "admin"),
      ).rejects.toMatchObject({
        statusCode: 400,
        message: "This request workflow has already been closed and processed.",
      });
    });
  });
});
