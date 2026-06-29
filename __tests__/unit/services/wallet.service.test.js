/**
 * @fileoverview Wallet Management Service Unit Tests
 * @description Secures role-based ledger adjustments, welcome bonus logic loops,
 * duplicate asset routing blocks, and DTO conversion transforms with 100% coverage.
 */

const createWalletService = require("../../../services/wallet.service"); // FIXED: Corrected relative path to source services folder
const { toWalletDTO } = require("../../../mappers/wallet.mapper"); // FIXED: Corrected relative path to source mappers folder

// Mock the Wallet DTO mapper cleanly
jest.mock("../../../mappers/wallet.mapper", () => ({
  toWalletDTO: jest.fn((wallet) => ({ DTO: true, ...wallet })),
}));

describe("WalletService Unit Tests", () => {
  let mockWalletRepo;
  let mockTransactionRepo;
  let mockLogger;
  let service;

  beforeEach(() => {
    // ── MOCK SYSTEM REPOSITORIES
    mockWalletRepo = {
      findWalletByUserAndRole: jest.fn(),
      createWallet: jest.fn(),
    };

    mockTransactionRepo = {
      createTransaction: jest.fn(),
    };

    // ── MOCK SYSTEM LOGGERS
    mockLogger = {
      info: jest.fn(),
    };

    // Inject dependencies encapsulated inside a single configuration parameters object
    service = createWalletService({
      walletRepository: mockWalletRepo,
      transactionRepository: mockTransactionRepo,
      logger: mockLogger,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── createWalletForRole ─────────────────────────────────────────────────
  describe("createWalletForRole", () => {
    test("should return null immediately if a duplicate wallet role mapping already exists", async () => {
      mockWalletRepo.findWalletByUserAndRole.mockResolvedValue({
        _id: "wallet_exists_99",
      });

      const result = await service.createWalletForRole("user_123", "mentee");

      expect(mockWalletRepo.findWalletByUserAndRole).toHaveBeenCalledWith(
        "user_123",
        "mentee",
      );
      expect(mockWalletRepo.createWallet).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    test("should provision a mentee wallet with a welcome credit balance and file a ledger entry", async () => {
      mockWalletRepo.findWalletByUserAndRole.mockResolvedValue(null);
      const mockWalletInstance = {
        user: "user_123",
        role: "mentee",
        balance: 500,
        escrow: 0,
      };
      mockWalletRepo.createWallet.mockResolvedValue(mockWalletInstance);

      const result = await service.createWalletForRole("user_123", "mentee");

      expect(mockWalletRepo.createWallet).toHaveBeenCalledWith({
        user: "user_123",
        role: "mentee",
        balance: 500,
        escrow: 0,
      });
      expect(mockTransactionRepo.createTransaction).toHaveBeenCalledWith({
        user: "user_123",
        type: "credit",
        amount: 500,
        description: "Welcome bonus — 500 points to get started",
        balanceAfter: 500,
      });
      expect(mockLogger.info).toHaveBeenCalledWith("Wallet created", {
        userId: "user_123",
        role: "mentee",
        startingBalance: 500,
      });
      expect(toWalletDTO).toHaveBeenCalledWith(mockWalletInstance);
      expect(result).toEqual({ DTO: true, ...mockWalletInstance });
    });

    test("should provision a non-mentee wallet with zero starting balance and skip ledger creation", async () => {
      mockWalletRepo.findWalletByUserAndRole.mockResolvedValue(null);
      const mockWalletInstance = {
        user: "user_456",
        role: "mentor",
        balance: 0,
        escrow: 0,
      };
      mockWalletRepo.createWallet.mockResolvedValue(mockWalletInstance);

      const result = await service.createWalletForRole("user_456", "mentor");

      expect(mockWalletRepo.createWallet).toHaveBeenCalledWith({
        user: "user_456",
        role: "mentor",
        balance: 0,
        escrow: 0,
      });
      expect(mockTransactionRepo.createTransaction).not.toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith("Wallet created", {
        userId: "user_456",
        role: "mentor",
        startingBalance: 0,
      });
      expect(toWalletDTO).toHaveBeenCalledWith(mockWalletInstance);
      expect(result).toEqual({ DTO: true, ...mockWalletInstance });
    });
  });

  // ── createWalletsForRoles ───────────────────────────────────────────────
  describe("createWalletsForRoles", () => {
    test("should iteratively loop through an array of roles invoking provision operations sequentially", async () => {
      mockWalletRepo.findWalletByUserAndRole.mockResolvedValue(null);
      mockWalletRepo.createWallet.mockResolvedValue({});

      await service.createWalletsForRoles("user_789", ["mentor", "mentee"]);

      expect(mockWalletRepo.findWalletByUserAndRole).toHaveBeenCalledTimes(2);
      expect(mockWalletRepo.findWalletByUserAndRole).toHaveBeenNthCalledWith(
        1,
        "user_789",
        "mentor",
      );
      expect(mockWalletRepo.findWalletByUserAndRole).toHaveBeenNthCalledWith(
        2,
        "user_789",
        "mentee",
      );
      expect(mockWalletRepo.createWallet).toHaveBeenCalledTimes(2);
    });

    test("should skip execution blocks cleanly if the provided roles array payload is empty", async () => {
      await service.createWalletsForRoles("user_789", []);

      expect(mockWalletRepo.findWalletByUserAndRole).not.toHaveBeenCalled();
      expect(mockWalletRepo.createWallet).not.toHaveBeenCalled();
    });
  });
});
