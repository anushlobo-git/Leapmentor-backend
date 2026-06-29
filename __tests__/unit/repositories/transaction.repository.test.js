/**
 * @fileoverview Transaction Repository Corporate Unit Tests
 * @description Assures precise verification of aggregate counters, paginated ledger entries,
 * subdocument expansions, and transactional batch write methods with zero network dependencies.
 */

const createTransactionRepository = require("../../../repositories/transaction.repository");

describe("Transaction Repository", () => {
  let mockTransactionModel;
  let transactionRepository;
  let mockSession;

  const mockTransactionRecord = {
    _id: "tx123",
    user: "user555",
    wallet: "wallet999",
    amount: 1500,
    type: "escrow_lock",
    status: "completed",
    createdAt: new Date("2026-06-29T11:15:00.000Z"),
  };

  const mockRecordsArray = [mockTransactionRecord];

  // Safe Factory: Decorates a genuine Promise instance to completely avoid "manual then" linter errors
  const makeChain = (resolvedValue = null) => {
    const promise = Promise.resolve(resolvedValue);

    // Attach Mongoose chain builders directly to the native Promise, returning itself for fluid chaining
    promise.populate = jest.fn().mockReturnValue(promise);
    promise.sort = jest.fn().mockReturnValue(promise);
    promise.skip = jest.fn().mockReturnValue(promise);
    promise.limit = jest.fn().mockReturnValue(promise);
    promise.lean = jest
      .fn()
      .mockImplementation(() => Promise.resolve(resolvedValue));

    return promise;
  };

  beforeEach(() => {
    mockTransactionModel = {
      countDocuments: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
    };
    mockSession = { id: "tx_session_999" };
    transactionRepository = createTransactionRepository(mockTransactionModel);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── countTransactions ───────────────────────────────────────────────────
  describe("countTransactions", () => {
    test("should fire countDocuments matching target evaluation criteria parameters cleanly", async () => {
      mockTransactionModel.countDocuments.mockResolvedValue(120);
      const filterCriteria = { type: "payout", status: "completed" };

      const count =
        await transactionRepository.countTransactions(filterCriteria);

      expect(mockTransactionModel.countDocuments).toHaveBeenCalledWith(
        filterCriteria,
      );
      expect(count).toBe(120);
    });
  });

  // ── findTransactions ────────────────────────────────────────────────────
  describe("findTransactions", () => {
    test("should execute a full paginated matrix pipeline with proper user population metrics", async () => {
      const mockChain = makeChain(mockRecordsArray);
      mockTransactionModel.find.mockReturnValue(mockChain);
      const filter = { user: "user555" };

      const result = await transactionRepository.findTransactions(filter, {
        skip: 40,
        limit: 20,
      });

      expect(mockTransactionModel.find).toHaveBeenCalledWith(filter);
      expect(mockChain.populate).toHaveBeenCalledWith("user", "name email");
      expect(mockChain.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(mockChain.skip).toHaveBeenCalledWith(40);
      expect(mockChain.limit).toHaveBeenCalledWith(20);
      expect(mockChain.lean).toHaveBeenCalled();
      expect(result).toEqual(mockRecordsArray);
    });
  });

  // ── createTransaction ───────────────────────────────────────────────────
  describe("createTransaction", () => {
    test("should instantly instantiate and write a single ledger record payload down to the database", async () => {
      mockTransactionModel.create.mockResolvedValue(mockTransactionRecord);
      const singlePayload = {
        user: "user555",
        amount: 1500,
        type: "escrow_lock",
      };

      const result =
        await transactionRepository.createTransaction(singlePayload);

      expect(mockTransactionModel.create).toHaveBeenCalledWith(singlePayload);
      expect(result).toEqual(mockTransactionRecord);
    });
  });

  // ── createMany ──────────────────────────────────────────────────────────
  describe("createMany", () => {
    test("should batch execute list writes while passing dynamic isolated transaction frame sessions downstream", async () => {
      mockTransactionModel.create.mockResolvedValue(mockRecordsArray);
      const batchPayload = [
        { user: "user555", amount: 1500, type: "escrow_lock" },
      ];

      const result = await transactionRepository.createMany(
        batchPayload,
        mockSession,
      );

      expect(mockTransactionModel.create).toHaveBeenCalledWith(batchPayload, {
        session: mockSession,
      });
      expect(result).toEqual(mockRecordsArray);
    });
  });
});
