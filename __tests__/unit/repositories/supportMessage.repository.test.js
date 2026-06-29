/**
 * @fileoverview Support Message Repository Corporate Unit Tests
 * @description Assures precise verification of ticket creation operations, sorting criteria,
 * atomic status modifiers, and layout optimizations with zero network dependencies.
 */

const createSupportMessageRepository = require("../../../repositories/supportMessage.repository");

describe("SupportMessage Repository", () => {
  let mockSupportMessageModel;
  let supportMessageRepository;

  const mockTicketRecord = {
    _id: "ticket123",
    user: "user555",
    subject: "Payment Failure",
    message: "My payment went through but connection request is still pending.",
    status: "pending",
    createdAt: new Date("2026-06-29T10:00:00.000Z"),
  };

  const mockRecordsArray = [mockTicketRecord];

  // Safe Factory: Decorates a genuine Promise instance to completely avoid "manual then" linter errors
  const makeChain = (resolvedValue = null) => {
    const promise = Promise.resolve(resolvedValue);

    // Attach Mongoose chain builders directly to the native Promise, returning itself for fluid chaining
    promise.sort = jest.fn().mockReturnValue(promise);
    promise.lean = jest
      .fn()
      .mockImplementation(() => Promise.resolve(resolvedValue));

    return promise;
  };

  beforeEach(() => {
    mockSupportMessageModel = {
      create: jest.fn(),
      find: jest.fn(),
      findByIdAndUpdate: jest.fn(),
    };
    supportMessageRepository = createSupportMessageRepository(
      mockSupportMessageModel,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── create ──────────────────────────────────────────────────────────────
  describe("create", () => {
    test("should instantly instantiate and persist a brand-new support ticket payload", async () => {
      mockSupportMessageModel.create.mockResolvedValue(mockTicketRecord);
      const ticketData = {
        user: "user555",
        subject: "Payment Failure",
        message: "My payment went through...",
      };

      const result = await supportMessageRepository.create(ticketData);

      expect(mockSupportMessageModel.create).toHaveBeenCalledWith(ticketData);
      expect(result).toEqual(mockTicketRecord);
    });
  });

  // ── findAllSortedByNewest ───────────────────────────────────────────────
  describe("findAllSortedByNewest", () => {
    test("should retrieve all tickets carrying reverse chronological sorting and lean configurations", async () => {
      const mockChain = makeChain(mockRecordsArray);
      mockSupportMessageModel.find.mockReturnValue(mockChain);

      const result = await supportMessageRepository.findAllSortedByNewest();

      expect(mockSupportMessageModel.find).toHaveBeenCalledWith();
      expect(mockChain.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(mockChain.lean).toHaveBeenCalled();
      expect(result).toEqual(mockRecordsArray);
    });
  });

  // ── updateStatusById ────────────────────────────────────────────────────
  describe("updateStatusById", () => {
    test("should atomically modify a ticket status using set parameters and return a clean lean format", async () => {
      const updatedRecord = { ...mockTicketRecord, status: "resolved" };
      const mockChain = makeChain(updatedRecord);
      mockSupportMessageModel.findByIdAndUpdate.mockReturnValue(mockChain);

      const result = await supportMessageRepository.updateStatusById(
        "ticket123",
        "resolved",
      );

      expect(mockSupportMessageModel.findByIdAndUpdate).toHaveBeenCalledWith(
        "ticket123",
        { $set: { status: "resolved" } },
        { new: true },
      );
      expect(mockChain.lean).toHaveBeenCalled();
      expect(result).toEqual(updatedRecord);
    });
  });
});
