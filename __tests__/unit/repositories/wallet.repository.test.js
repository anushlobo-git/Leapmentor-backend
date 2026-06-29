/**
 * @fileoverview Wallet Repository Corporate Unit Tests
 * @description Assures precise verification of asset balances, role scopes, conditional
 * transaction sessions, and atomic balance alterations with zero network access.
 */

const createWalletRepository = require("../../../repositories/wallet.repository");

describe("Wallet Repository", () => {
  let mockWalletModel;
  let walletRepository;
  let mockSession;

  const mockWalletRecord = {
    _id: "wallet123",
    user: "user456",
    role: "mentor",
    balance: 1250,
    escrow: 500,
  };

  const mockRecordsArray = [mockWalletRecord];

  // Safe Factory: Decorates a genuine Promise instance to completely avoid "manual then" linter errors
  const makeChain = (resolvedValue = null) => {
    const promise = Promise.resolve(resolvedValue);

    // Attach Mongoose chain builders directly to the native Promise, returning itself for fluid chaining
    promise.select = jest.fn().mockReturnValue(promise);
    promise.session = jest.fn().mockReturnValue(promise);
    promise.lean = jest
      .fn()
      .mockImplementation(() => Promise.resolve(resolvedValue));

    return promise;
  };

  beforeEach(() => {
    mockWalletModel = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      findOneAndUpdate: jest.fn(),
    };
    mockSession = { id: "tx_session_888" };
    walletRepository = createWalletRepository(mockWalletModel);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── STANDARD READ QUERIES & CHAINS ──────────────────────────────────────
  describe("Standard Read Queries & Chains", () => {
    test("findAllWallets should collect a read-only list with narrow escrow selection fields", async () => {
      const mockChain = makeChain(mockRecordsArray);
      mockWalletModel.find.mockReturnValue(mockChain);

      const result = await walletRepository.findAllWallets();

      expect(mockWalletModel.find).toHaveBeenCalledWith();
      expect(mockChain.select).toHaveBeenCalledWith("escrow");
      expect(mockChain.lean).toHaveBeenCalled();
      expect(result).toEqual(mockRecordsArray);
    });

    test("findWalletByUserId should track raw unchained lookup documents directly matching owner IDs", async () => {
      mockWalletModel.findOne.mockResolvedValue(mockWalletRecord);

      const result = await walletRepository.findWalletByUserId("user456");

      expect(mockWalletModel.findOne).toHaveBeenCalledWith({ user: "user456" });
      expect(result).toEqual(mockWalletRecord);
    });

    test("findWalletByUser should use lean parsing layout parameters for high-performance extraction", async () => {
      const mockChain = makeChain(mockWalletRecord);
      mockWalletModel.findOne.mockReturnValue(mockChain);

      const result = await walletRepository.findWalletByUser("user456");

      expect(mockWalletModel.findOne).toHaveBeenCalledWith({ user: "user456" });
      expect(mockChain.lean).toHaveBeenCalled();
      expect(result).toEqual(mockWalletRecord);
    });

    test("findWalletByUserMutable should target user IDs without invoking lean conversions", async () => {
      mockWalletModel.findOne.mockResolvedValue(mockWalletRecord);

      const result = await walletRepository.findWalletByUserMutable("user456");

      expect(mockWalletModel.findOne).toHaveBeenCalledWith({ user: "user456" });
      expect(result).toEqual(mockWalletRecord);
    });

    test("findWalletByUserAndRole should constrain matching lookups to both explicit owners and profile roles", async () => {
      const mockChain = makeChain(mockWalletRecord);
      mockWalletModel.findOne.mockReturnValue(mockChain);

      const result = await walletRepository.findWalletByUserAndRole(
        "user456",
        "mentor",
      );

      expect(mockWalletModel.findOne).toHaveBeenCalledWith({
        user: "user456",
        role: "mentor",
      });
      expect(mockChain.lean).toHaveBeenCalled();
      expect(result).toEqual(mockWalletRecord);
    });
  });

  // ── TRANSACTIONAL & ROLE-SCOPED PIPELINES ───────────────────────────────
  describe("Transactional & Role-Scoped Pipelines", () => {
    test("findByUserId should forward active transaction constraints along the query chain", async () => {
      const mockChain = makeChain(mockWalletRecord);
      mockWalletModel.findOne.mockReturnValue(mockChain);

      const result = await walletRepository.findByUserId(
        "user456",
        mockSession,
      );

      expect(mockWalletModel.findOne).toHaveBeenCalledWith({ user: "user456" });
      expect(mockChain.session).toHaveBeenCalledWith(mockSession);
      expect(result).toEqual(mockWalletRecord);
    });

    test("findByUserIdAndRole should evaluate multi-field keys alongside runtime sessions", async () => {
      const mockChain = makeChain(mockWalletRecord);
      mockWalletModel.findOne.mockReturnValue(mockChain);

      const result = await walletRepository.findByUserIdAndRole(
        "user456",
        "mentor",
        mockSession,
      );

      expect(mockWalletModel.findOne).toHaveBeenCalledWith({
        user: "user456",
        role: "mentor",
      });
      expect(mockChain.session).toHaveBeenCalledWith(mockSession);
      expect(result).toEqual(mockWalletRecord);
    });
  });

  // ── WRITE OPERATIONS & BALANCES MUTATIONS ───────────────────────────────
  describe("Write Operations & Balances Mutations", () => {
    test("createWallet should instantly generate a new active asset tracking layer row", async () => {
      mockWalletModel.create.mockResolvedValue(mockWalletRecord);
      const seedFields = { user: "user456", role: "mentor", balance: 0 };

      const result = await walletRepository.createWallet(seedFields);

      expect(mockWalletModel.create).toHaveBeenCalledWith(seedFields);
      expect(result).toEqual(mockWalletRecord);
    });

    test("incrementBalance should deploy atomic updates carrying strict upsert rules", async () => {
      mockWalletModel.findOneAndUpdate.mockResolvedValue(mockWalletRecord);

      const result = await walletRepository.incrementBalance("user456", 250);

      expect(mockWalletModel.findOneAndUpdate).toHaveBeenCalledWith(
        { user: "user456" },
        { $inc: { balance: 250 } },
        { new: true, upsert: true },
      );
      expect(result).toEqual(mockWalletRecord);
    });

    test("saveWallet should execute database persistence directly on structural targets", async () => {
      const fakeDoc = {
        ...mockWalletRecord,
        save: jest.fn().mockResolvedValue(mockWalletRecord),
      };

      const result = await walletRepository.saveWallet(fakeDoc);

      expect(fakeDoc.save).toHaveBeenCalled();
      expect(result).toEqual(mockWalletRecord);
    });

    test("save should append session parameter frames to instance mutations smoothly", async () => {
      const fakeDoc = {
        ...mockWalletRecord,
        save: jest.fn().mockResolvedValue(mockWalletRecord),
      };

      const result = await walletRepository.save(fakeDoc, mockSession);

      expect(fakeDoc.save).toHaveBeenCalledWith({ session: mockSession });
      expect(result).toEqual(mockWalletRecord);
    });
  });
});
