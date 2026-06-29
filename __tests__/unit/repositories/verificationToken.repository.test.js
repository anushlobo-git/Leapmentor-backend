/**
 * @fileoverview Verification Token Repository Corporate Unit Tests
 * @description Assures precise verification of lookup criteria, mutation parameters transformation,
 * batch cleanup actions, and instance serialization rules with zero network connectivity.
 */

const createVerificationTokenRepository = require("../../../repositories/verificationToken.repository");

describe("VerificationToken Repository", () => {
  let mockTokenModel;
  let verificationTokenRepository;

  const mockTokenRecord = {
    _id: "token123",
    user: "user555",
    otp: "$2a$10$R9hK..mockedhash..",
    expiresAt: new Date("2026-06-29T15:00:00.000Z"),
  };


  beforeEach(() => {
    mockTokenModel = {
      deleteMany: jest.fn(),
      create: jest.fn(),
      findOne: jest.fn(),
      findByIdAndUpdate: jest.fn(),
    };
    verificationTokenRepository =
      createVerificationTokenRepository(mockTokenModel);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── RECOVERY & CREATION OPERATIONS ──────────────────────────────────────
  describe("Recovery & Creation Operations", () => {
    test("create should translate property payloads mapping otpHash keys to otp database fields", async () => {
      mockTokenModel.create.mockResolvedValue(mockTokenRecord);
      const inputPayload = {
        userId: "user555",
        otpHash: "$2a$10$R9hK..mockedhash..",
        expiresAt: mockTokenRecord.expiresAt,
      };

      const result = await verificationTokenRepository.create(inputPayload);

      expect(mockTokenModel.create).toHaveBeenCalledWith({
        user: "user555",
        otp: "$2a$10$R9hK..mockedhash..",
        expiresAt: mockTokenRecord.expiresAt,
      });
      expect(result).toEqual(mockTokenRecord);
    });

    test("createToken should accept raw object configurations natively without restructuring fields", async () => {
      mockTokenModel.create.mockResolvedValue(mockTokenRecord);
      const flatPayload = {
        user: "user555",
        otp: "123456",
        expiresAt: mockTokenRecord.expiresAt,
      };

      const result = await verificationTokenRepository.createToken(flatPayload);

      expect(mockTokenModel.create).toHaveBeenCalledWith(flatPayload);
      expect(result).toEqual(mockTokenRecord);
    });
  });

  // ── SEARCH & RETRIEVAL PIPELINES ────────────────────────────────────────
  describe("Search & Retrieval Pipelines", () => {
    test("findByUser should lookup documents using the parent identifier key mapping", async () => {
      mockTokenModel.findOne.mockResolvedValue(mockTokenRecord);

      const result = await verificationTokenRepository.findByUser("user555");

      expect(mockTokenModel.findOne).toHaveBeenCalledWith({ user: "user555" });
      expect(result).toEqual(mockTokenRecord);
    });

    test("findTokenByUserId should mirror active lookup strategies returning target file instances", async () => {
      mockTokenModel.findOne.mockResolvedValue(mockTokenRecord);

      const result =
        await verificationTokenRepository.findTokenByUserId("user555");

      expect(mockTokenModel.findOne).toHaveBeenCalledWith({ user: "user555" });
      expect(result).toEqual(mockTokenRecord);
    });
  });

  // ── LIFECYCLE MUTATIONS & UPDATES ───────────────────────────────────────
  describe("Lifecycle Mutations & Updates", () => {
    test("extendExpiry should invoke modifications applying set parameter limits", async () => {
      const extendedRecord = {
        ...mockTokenRecord,
        expiresAt: new Date("2026-06-29T16:00:00.000Z"),
      };
      mockTokenModel.findByIdAndUpdate.mockResolvedValue(extendedRecord);

      const result = await verificationTokenRepository.extendExpiry(
        "token123",
        extendedRecord.expiresAt,
      );

      expect(mockTokenModel.findByIdAndUpdate).toHaveBeenCalledWith(
        "token123",
        {
          expiresAt: extendedRecord.expiresAt,
        },
      );
      expect(result).toEqual(extendedRecord);
    });

    test("saveToken should invoke native internal instance persistence updates directly", async () => {
      const fakeInstance = {
        ...mockTokenRecord,
        save: jest.fn().mockResolvedValue(mockTokenRecord),
      };

      const result = await verificationTokenRepository.saveToken(fakeInstance);

      expect(fakeInstance.save).toHaveBeenCalled();
      expect(result).toEqual(mockTokenRecord);
    });
  });

  // ── SCRUBBING & CLEANUP PIPELINES ───────────────────────────────────────
  describe("Scrubbing & Cleanup Pipelines", () => {
    test("deleteAllForUser should batch execute direct drops matching parent identity codes", async () => {
      mockTokenModel.deleteMany.mockResolvedValue({ deletedCount: 2 });

      const result =
        await verificationTokenRepository.deleteAllForUser("user555");

      expect(mockTokenModel.deleteMany).toHaveBeenCalledWith({
        user: "user555",
      });
      expect(result).toEqual({ deletedCount: 2 });
    });

    test("deleteTokensByUserId should clear historical records tracking identical matching arguments", async () => {
      mockTokenModel.deleteMany.mockResolvedValue({ deletedCount: 1 });

      const result =
        await verificationTokenRepository.deleteTokensByUserId("user555");

      expect(mockTokenModel.deleteMany).toHaveBeenCalledWith({
        user: "user555",
      });
      expect(result).toEqual({ deletedCount: 1 });
    });
  });
});
