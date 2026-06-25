/**
 * @fileoverview Transaction Repository Corporate Unit Tests
 * @description Assures precise verification of counting metrics, ledger sorting chains,
 * and multi-document transaction batch operations with zero network access.
 */

const createTransactionRepository = require("../../../repositories/transaction.repository");

describe("Transaction Repository", () => {
  let mockModel;
  let repository;

  const mockTransactionRecord = {
    _id: "tx999",
    user: "user123",
    type: "escrow_hold",
    amount: 500,
    balanceAfter: 1500,
    description: "Hold for session booking.",
  };

  // Reusable query chain builder supporting fluent parameters and promise completions
  const makeChain = (resolvedValue = null) => ({
    populate: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(resolvedValue),
    then: jest.fn(function (callback) {
      return Promise.resolve(callback(resolvedValue));
    }),
  });

  beforeEach(() => {
    mockModel = {
      countDocuments: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
    };
    repository = createTransactionRepository(mockModel);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── countTransactions ───────────────────────────────────────────────────
  describe("countTransactions", () => {
    test("should pass matching filter payloads straight into count mechanics", async () => {
      mockModel.countDocuments.mockResolvedValue(128);
      const result = await repository.countTransactions({ type: "credit" });

      expect(mockModel.countDocuments).toHaveBeenCalledWith({ type: "credit" });
      expect(result).toBe(128);
    });
  });

  // ── findTransactions ────────────────────────────────────────────────────
  describe("findTransactions", () => {
    test("should execute a paginated find sequence using comprehensive pipeline sorting rules", async () => {
      const chain = makeChain([mockTransactionRecord]);
      mockModel.find.mockReturnValue(chain);

      const result = await repository.findTransactions(
        { user: "user123" },
        { skip: 20, limit: 10 },
      );

      expect(mockModel.find).toHaveBeenCalledWith({ user: "user123" });
      expect(chain.populate).toHaveBeenCalledWith("user", "name email");
      expect(chain.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(chain.skip).toHaveBeenCalledWith(20);
      expect(chain.limit).toHaveBeenCalledWith(10);
      expect(chain.lean).toHaveBeenCalled();
      expect(result).toEqual([mockTransactionRecord]);
    });
  });

  // ── createTransaction ───────────────────────────────────────────────────
  describe("createTransaction", () => {
    test("should instantiate an individual audit trail row natively", async () => {
      mockModel.create.mockResolvedValue(mockTransactionRecord);
      const payload = { user: "user123", amount: 500 };

      const result = await repository.createTransaction(payload);

      expect(mockModel.create).toHaveBeenCalledWith(payload);
      expect(result).toEqual(mockTransactionRecord);
    });
  });

  // ── createMany ──────────────────────────────────────────────────────────
  describe("createMany", () => {
    test("should execute bulk insertions wrapping the execution inside session blocks safely", async () => {
      const mockBatchList = [
        mockTransactionRecord,
        { ...mockTransactionRecord, _id: "tx1000" },
      ];
      mockModel.create.mockResolvedValue(mockBatchList);

      const transactionsData = [
        { user: "user123", amount: 500 },
        { user: "user123", amount: 500 },
      ];

      const result = await repository.createMany(
        transactionsData,
        "active_tx_session_token",
      );

      expect(mockModel.create).toHaveBeenCalledWith(transactionsData, {
        session: "active_tx_session_token",
      });
      expect(result).toEqual(mockBatchList);
    });

    test("should bubble schema layout execution rejections up when operations fail", async () => {
      mockModel.create.mockRejectedValue(
        new Error("Mongoose Enum Validation Failure"),
      );

      await expect(repository.createMany([], null)).rejects.toThrow(
        "Mongoose Enum Validation Failure",
      );
    });
  });
});
