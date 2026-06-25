/**
 * @fileoverview Wallet Management Service Unit Tests
 * @description Validates role-based ledger adjustments and initialization chains in memory.
 */

const createWalletService = require("../../../services/wallet.service");

jest.mock("../../../mappers/wallet.mapper", () => ({
  toWalletDTO: jest.fn((wallet) => ({ DTO: true, ...wallet })),
}));

describe("Wallet Management Service Unit Tests", () => {
  let mockWalletRepo;
  let mockTransactionRepo;
  let mockLogger;
  let service;

  beforeEach(() => {
    mockWalletRepo = {
      findWalletByUserAndRole: jest.fn(),
      createWallet: jest.fn(),
    };

    mockTransactionRepo = {
      createTransaction: jest.fn(),
    };

    mockLogger = {
      info: jest.fn(),
    };

    service = createWalletService(
      mockWalletRepo,
      mockTransactionRepo,
      mockLogger,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

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
      expect(mockLogger.info).toHaveBeenCalled();
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
      expect(result).toEqual({ DTO: true, ...mockWalletInstance });
    });
  });

  describe("createWalletsForRoles", () => {
    test("should iteratively loop through an array of roles invoking provision operations", async () => {
      mockWalletRepo.findWalletByUserAndRole.mockResolvedValue(null);
      mockWalletRepo.createWallet.mockResolvedValue({});

      await service.createWalletsForRoles("user_789", ["mentor", "mentee"]);

      expect(mockWalletRepo.findWalletByUserAndRole).toHaveBeenCalledTimes(2);
      expect(mockWalletRepo.createWallet).toHaveBeenCalledTimes(2);
    });
  });
});
