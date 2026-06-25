/**
 * @fileoverview AdminUser Repository Corporate Unit Tests
 * @description Assures precise verification of selection masks, chained operations,
 * and database execution updates with zero network access.
 */

const createAdminUserRepository = require("../../../repositories/adminUser.repository");

describe("AdminUser Repository", () => {
  let mockAdminModel;
  let adminUserRepository;

  const mockAdminRecord = {
    _id: "admin789",
    name: "System Admin",
    email: "admin@leapmentor.com",
    commissionRate: 20,
    walletBalance: 500,
  };

  // Fluent chain simulation factory mapping targeted method responses
  const makeChain = (resolvedValue = null) => ({
    select: jest.fn().mockReturnThis(),
    session: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(resolvedValue),
    then: jest.fn(function (callback) {
      return Promise.resolve(callback(resolvedValue));
    }),
  });

  beforeEach(() => {
    mockAdminModel = {
      findOne: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      findByIdAndUpdate: jest.fn(),
    };
    adminUserRepository = createAdminUserRepository(mockAdminModel);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── findAdminByEmail ────────────────────────────────────────────────────
  describe("findAdminByEmail", () => {
    test("should fetch admin and append hidden password selection fields", async () => {
      const chain = makeChain(mockAdminRecord);
      mockAdminModel.findOne.mockReturnValue(chain);

      const result = await adminUserRepository.findAdminByEmail(
        "admin@leapmentor.com",
      );

      expect(mockAdminModel.findOne).toHaveBeenCalledWith({
        email: "admin@leapmentor.com",
      });
      expect(chain.select).toHaveBeenCalledWith("+password");
      expect(result).toEqual(mockAdminRecord);
    });
  });

  // ── findAdminByEmailLean ────────────────────────────────────────────────
  describe("findAdminByEmailLean", () => {
    test("should fetch admin natively without unchained select overrides", async () => {
      mockAdminModel.findOne.mockResolvedValue(mockAdminRecord);

      const result = await adminUserRepository.findAdminByEmailLean(
        "admin@leapmentor.com",
      );

      expect(mockAdminModel.findOne).toHaveBeenCalledWith({
        email: "admin@leapmentor.com",
      });
      expect(result).toEqual(mockAdminRecord);
    });

    test("should return null if lookup email does not exist", async () => {
      mockAdminModel.findOne.mockResolvedValue(null);
      const result =
        await adminUserRepository.findAdminByEmailLean("missing@test.com");
      expect(result).toBeNull();
    });
  });

  // ── saveAdmin ───────────────────────────────────────────────────────────
  describe("saveAdmin", () => {
    test("should trigger native internal document persistence routines", async () => {
      const mockDoc = { save: jest.fn().mockResolvedValue(mockAdminRecord) };
      const result = await adminUserRepository.saveAdmin(mockDoc);

      expect(mockDoc.save).toHaveBeenCalled();
      expect(result).toEqual(mockAdminRecord);
    });
  });

  // ── findAdminByIdLean ───────────────────────────────────────────────────
  describe("findAdminByIdLean", () => {
    test("should query optimized read-only properties returning plain layouts", async () => {
      const chain = makeChain({ commissionRate: 20 });
      mockAdminModel.findById.mockReturnValue(chain);

      const result = await adminUserRepository.findAdminByIdLean("admin789");

      expect(mockAdminModel.findById).toHaveBeenCalledWith("admin789");
      expect(chain.select).toHaveBeenCalledWith("commissionRate");
      expect(chain.lean).toHaveBeenCalled();
      expect(result).toEqual({ commissionRate: 20 });
    });
  });

  // ── createAdmin ─────────────────────────────────────────────────────────
  describe("createAdmin", () => {
    test("should persist new security records immediately", async () => {
      mockAdminModel.create.mockResolvedValue(mockAdminRecord);
      const result = await adminUserRepository.createAdmin({ name: "Admin" });

      expect(mockAdminModel.create).toHaveBeenCalledWith({ name: "Admin" });
      expect(result).toEqual(mockAdminRecord);
    });

    test("should bubble schema constraint errors cleanly if creation throws", async () => {
      mockAdminModel.create.mockRejectedValue(new Error("Duplicate Key Email"));
      await expect(adminUserRepository.createAdmin({})).rejects.toThrow(
        "Duplicate Key Email",
      );
    });
  });

  // ── updateAdminById ─────────────────────────────────────────────────────
  describe("updateAdminById", () => {
    test("should execute modifier pipelines with strict runtime validators active", async () => {
      mockAdminModel.findByIdAndUpdate.mockResolvedValue(mockAdminRecord);
      const updatePayload = { name: "Updated Name" };

      const result = await adminUserRepository.updateAdminById(
        "admin789",
        updatePayload,
      );

      expect(mockAdminModel.findByIdAndUpdate).toHaveBeenCalledWith(
        "admin789",
        updatePayload,
        { new: true, runValidators: true },
      );
      expect(result).toEqual(mockAdminRecord);
    });
  });

  // ── findActiveAdmin ─────────────────────────────────────────────────────
  describe("findActiveAdmin", () => {
    test("should retrieve active state settings utilizing isolated transaction frames", async () => {
      const chain = makeChain(mockAdminRecord);
      mockAdminModel.findOne.mockReturnValue(chain);

      const result = await adminUserRepository.findActiveAdmin("tx_session_id");

      expect(mockAdminModel.findOne).toHaveBeenCalledWith({ isActive: true });
      expect(chain.select).toHaveBeenCalledWith("commissionRate walletBalance");
      expect(chain.session).toHaveBeenCalledWith("tx_session_id");
      expect(result).toEqual(mockAdminRecord);
    });
  });

  // ── incrementWalletBalance ──────────────────────────────────────────────
  describe("incrementWalletBalance", () => {
    test("should pass atomic $inc operator values down safely", async () => {
      mockAdminModel.findByIdAndUpdate.mockResolvedValue(mockAdminRecord);

      const result = await adminUserRepository.incrementWalletBalance(
        "admin789",
        150,
      );

      expect(mockAdminModel.findByIdAndUpdate).toHaveBeenCalledWith(
        "admin789",
        { $inc: { walletBalance: 150 } },
        { new: true },
      );
      expect(result).toEqual(mockAdminRecord);
    });
  });

  // ── findActiveAdminLean ─────────────────────────────────────────────────
  describe("findActiveAdminLean", () => {
    test("should resolve plain structural objects for performance mapping queries", async () => {
      const chain = makeChain({ commissionRate: 20 });
      mockAdminModel.findOne.mockReturnValue(chain);

      const result = await adminUserRepository.findActiveAdminLean();

      expect(mockAdminModel.findOne).toHaveBeenCalledWith({ isActive: true });
      expect(chain.select).toHaveBeenCalledWith("commissionRate");
      expect(chain.lean).toHaveBeenCalled();
      expect(result).toEqual({ commissionRate: 20 });
    });
  });
});
