/**
 * @fileoverview Wallet Repository Corporate Unit Tests
 * @description Assures precise verification of selection criteria, atomic update operators,
 * and isolated transaction sessions with zero network dependency.
 */

const createWalletRepository = require("../../../repositories/wallet.repository");

describe("Wallet Repository", () => {
  let mockModel;
  let repository;

  const mockWalletRecord = {
    _id: "wallet001",
    user: "user888",
    role: "mentor",
    balance: 1200,
    escrow: 300,
  };

  // Reusable query chain builder supporting selective filters, sessions, and promise completions
  const makeChain = (resolvedValue = null) => ({
    select: jest.fn().mockReturnThis(),
    session: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(resolvedValue),
    then: jest.fn(function (callback) {
      return Promise.resolve(callback(resolvedValue));
    }),
  });

  beforeEach(() => {
    mockModel = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      findOneAndUpdate: jest.fn(),
    };
    repository = createWalletRepository(mockModel);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── findAllWallets ──────────────────────────────────────────────────────
  describe("findAllWallets", () => {
    test("should fetch selective read-only snapshot arrays containing escrow values", async () => {
      const chain = makeChain([{ escrow: 300 }]);
      mockModel.find.mockReturnValue(chain);

      const result = await repository.findAllWallets();

      expect(mockModel.find).toHaveBeenCalled();
      expect(chain.select).toHaveBeenCalledWith("escrow");
      expect(chain.lean).toHaveBeenCalled();
      expect(result).toEqual([{ escrow: 300 }]);
    });
  });

  // ── findWalletByUserId ──────────────────────────────────────────────────
  describe("findWalletByUserId", () => {
    test("should fetch a single mutable document matching target constraints", async () => {
      const chain = makeChain(mockWalletRecord);
      mockModel.findOne.mockReturnValue(chain);

      const result = await repository.findWalletByUserId("user888");

      expect(mockModel.findOne).toHaveBeenCalledWith({ user: "user888" });
      expect(result).toEqual(mockWalletRecord);
    });

    test("should return null if lookup identifier matches no document row", async () => {
      const chain = makeChain(null);
      mockModel.findOne.mockReturnValue(chain);

      const result = await repository.findWalletByUserId("unknownUser");
      expect(result).toBeNull();
    });
  });

  // ── findWalletByUserAndRole ─────────────────────────────────────────────
  describe("findWalletByUserAndRole", () => {
    test("should parse multiple lookup keys and enforce plain layouts using lean", async () => {
      const chain = makeChain(mockWalletRecord);
      mockModel.findOne.mockReturnValue(chain);

      const result = await repository.findWalletByUserAndRole(
        "user888",
        "mentor",
      );

      expect(mockModel.findOne).toHaveBeenCalledWith({
        user: "user888",
        role: "mentor",
      });
      expect(chain.lean).toHaveBeenCalled();
      expect(result).toEqual(mockWalletRecord);
    });
  });

  // ── findByUserId & findByUserIdAndRole (Sessions) ───────────────────────
  describe("Session-Bound Account Discovery Methods", () => {
    test("findByUserId should forward processing parameters along with isolation frames", async () => {
      const chain = makeChain(mockWalletRecord);
      mockModel.findOne.mockReturnValue(chain);

      const result = await repository.findByUserId(
        "user888",
        "active_session_id",
      );

      expect(mockModel.findOne).toHaveBeenCalledWith({ user: "user888" });
      expect(chain.session).toHaveBeenCalledWith("active_session_id");
      expect(result).toEqual(mockWalletRecord);
    });

    test("findByUserIdAndRole should couple criteria parameters safely inside transaction blocks", async () => {
      const chain = makeChain(mockWalletRecord);
      mockModel.findOne.mockReturnValue(chain);

      const result = await repository.findByUserIdAndRole(
        "user888",
        "mentee",
        "active_session_id",
      );

      expect(mockModel.findOne).toHaveBeenCalledWith({
        user: "user888",
        role: "mentee",
      });
      expect(chain.session).toHaveBeenCalledWith("active_session_id");
      expect(result).toEqual(mockWalletRecord);
    });
  });

  // ── createWallet ────────────────────────────────────────────────────────
  describe("createWallet", () => {
    test("should initialize financial matrices smoothly", async () => {
      mockModel.create.mockResolvedValue(mockWalletRecord);
      const payload = { user: "user888", balance: 0 };

      const result = await repository.createWallet(payload);

      expect(mockModel.create).toHaveBeenCalledWith(payload);
      expect(result).toEqual(mockWalletRecord);
    });

    test("should pass structural persistence exceptions upward cleanly", async () => {
      mockModel.create.mockRejectedValue(
        new Error("Unique Multi-Key Constraint Violated"),
      );
      await expect(repository.createWallet({})).rejects.toThrow(
        "Unique Multi-Key Constraint Violated",
      );
    });
  });

  // ── incrementBalance ────────────────────────────────────────────────────
  describe("incrementBalance", () => {
    test("should execute atomic balance corrections passing strict upsert instructions down", async () => {
      mockModel.findOneAndUpdate.mockResolvedValue(mockWalletRecord);

      const result = await repository.incrementBalance("user888", 250);

      expect(mockModel.findOneAndUpdate).toHaveBeenCalledWith(
        { user: "user888" },
        { $inc: { balance: 250 } },
        { new: true, upsert: true },
      );
      expect(result).toEqual(mockWalletRecord);
    });
  });

  // ── saveWallet & save ───────────────────────────────────────────────────
  describe("Document Direct Save Pipelines", () => {
    test("saveWallet should persist internal entity state adjustments directly", async () => {
      const mockDoc = { save: jest.fn().mockResolvedValue(mockWalletRecord) };
      const result = await repository.saveWallet(mockDoc);
      expect(mockDoc.save).toHaveBeenCalled();
      expect(result).toEqual(mockWalletRecord);
    });

    test("save should forward explicit context configurations during atomic save actions", async () => {
      const mockDoc = { save: jest.fn().mockResolvedValue(mockWalletRecord) };
      await repository.save(mockDoc, "session_token_id");
      expect(mockDoc.save).toHaveBeenCalledWith({
        session: "session_token_id",
      });
    });
  });
});
