/**
 * @fileoverview User Repository Corporate Unit Tests
 * @description Validates all data layer behaviors, error catch boundaries,
 * and fallback states with zero network activity.
 */

const createUserRepository = require("../../../repositories/user.repository");

describe("User Repository", () => {
  let mockUserModel;
  let userRepository;

  const mockUser = { _id: "user123", name: "Alice", email: "alice@test.com" };

  // ── Query chain factory for methods utilizing chaining ──────────────────
  const makeChain = (resolvedValue = null) => ({
    select: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(resolvedValue),
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    setOptions: jest.fn().mockReturnThis(),
  });

  beforeEach(() => {
    mockUserModel = {
      find: jest.fn(),
      findOne: jest.fn(),
      findById: jest.fn(),
      countDocuments: jest.fn(),
      findByIdAndDelete: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      findOneAndUpdate: jest.fn(),
      create: jest.fn(),
      aggregate: jest.fn(),
    };
    userRepository = createUserRepository(mockUserModel);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── findUsersBySearchTerm ───────────────────────────────────────────────
  describe("findUsersBySearchTerm", () => {
    test("should search by name and email with case-insensitive regex", async () => {
      const chain = makeChain([mockUser]);
      mockUserModel.find.mockReturnValue(chain);

      const result =
        await userRepository.findUsersBySearchTerm(" alice@test.com ");

      // ✅ Aligned regex literals to match native dynamic compilation string outputs
      expect(mockUserModel.find).toHaveBeenCalledWith({
        $or: [{ name: /alice@test.com/i }, { email: /alice@test.com/i }],
      });
      expect(chain.select).toHaveBeenCalledWith("_id");
      expect(result).toEqual([mockUser]);
    });

    test("should return empty array when no matches found", async () => {
      mockUserModel.find.mockReturnValue(makeChain([]));
      const result = await userRepository.findUsersBySearchTerm("nomatch");
      expect(result).toEqual([]);
    });
  });

  // ── findUserById ────────────────────────────────────────────────────────
  describe("findUserById", () => {
    test("should return user without password", async () => {
      const chain = makeChain(mockUser);
      mockUserModel.findById.mockReturnValue(chain);

      const result = await userRepository.findUserById("user123");

      expect(mockUserModel.findById).toHaveBeenCalledWith("user123");
      expect(chain.select).toHaveBeenCalledWith("-password");
      expect(chain.setOptions).toHaveBeenCalledWith({ ignoreIsDeleted: true });
      expect(result).toEqual(mockUser);
    });

    test("should return null when user does not exist", async () => {
      mockUserModel.findById.mockReturnValue(makeChain(null));
      const result = await userRepository.findUserById("nonexistent");
      expect(result).toBeNull();
    });
  });

  // ── createUser ──────────────────────────────────────────────────────────
  describe("createUser", () => {
    test("should create and return new user", async () => {
      mockUserModel.create.mockResolvedValue(mockUser);
      const result = await userRepository.createUser(mockUser);
      expect(mockUserModel.create).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual(mockUser);
    });

    test("should propagate error when creation fails", async () => {
      mockUserModel.create.mockRejectedValue(new Error("Validation failed"));
      await expect(userRepository.createUser({})).rejects.toThrow(
        "Validation failed",
      );
    });
  });

  // ── blockUser ───────────────────────────────────────────────────────────
  describe("blockUser", () => {
    test("should set isDeleted true with timestamp", async () => {
      mockUserModel.findByIdAndUpdate.mockResolvedValue({ isDeleted: true });
      const result = await userRepository.blockUser("userId");

      expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith(
        "userId",
        expect.objectContaining({
          isDeleted: true,
          deletedAt: expect.any(Date),
        }),
        { new: true },
      );
      expect(result).toEqual({ isDeleted: true });
    });

    test("should return null when user ID does not exist", async () => {
      mockUserModel.findByIdAndUpdate.mockResolvedValue(null);
      const result = await userRepository.blockUser("nonexistent");
      expect(result).toBeNull();
    });
  });

  // ── findUserByEmail ─────────────────────────────────────────────────────
  describe("findUserByEmail", () => {
    test("should find user by email", async () => {
      // ✅ Corrected: Directly return a resolved promise since production code doesn't chain methods here
      mockUserModel.findOne.mockResolvedValue(mockUser);

      const result = await userRepository.findUserByEmail("alice@test.com");

      expect(mockUserModel.findOne).toHaveBeenCalledWith({
        email: "alice@test.com",
      });
      expect(result).toEqual(mockUser);
    });

    test("should return null when email not found", async () => {
      // ✅ Corrected: Return a resolved null value directly for unchained execution trees
      mockUserModel.findOne.mockResolvedValue(null);

      const result = await userRepository.findUserByEmail("missing@test.com");

      expect(result).toBeNull();
    });
  });

  // ── findUsersByRoleAndNameRegex ─────────────────────────────────────────
  describe("findUsersByRoleAndNameRegex", () => {
    test("should use Atlas Search pipeline when available", async () => {
      const atlasResult = [{ _id: "search1", name: "Alice" }];
      mockUserModel.aggregate.mockResolvedValue(atlasResult);

      const result = await userRepository.findUsersByRoleAndNameRegex("Alice", [
        "mentor",
      ]);

      expect(mockUserModel.aggregate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ $search: expect.any(Object) }),
        ]),
      );
      expect(result).toEqual(atlasResult);
    });

    test("should fall back to regex when Atlas Search fails", async () => {
      const regexResult = [{ _id: "regex1", name: "Alice" }];
      mockUserModel.aggregate.mockRejectedValue(
        new Error("Atlas index unavailable"),
      );
      const chain = makeChain(regexResult);
      mockUserModel.find.mockReturnValue(chain);

      const result = await userRepository.findUsersByRoleAndNameRegex("Alice", [
        "mentor",
      ]);

      expect(mockUserModel.find).toHaveBeenCalledWith({
        name: { $regex: "Alice", $options: "i" },
        roles: { $in: ["mentor"] },
      });
      expect(result).toEqual(regexResult);
    });

    test("should return empty array when no name matches found", async () => {
      mockUserModel.aggregate.mockResolvedValue([]);
      const result = await userRepository.findUsersByRoleAndNameRegex(
        "zzznomatch",
        ["mentor"],
      );
      expect(result).toEqual([]);
    });
  });

  // ── saveUser ────────────────────────────────────────────────────────────
  describe("saveUser", () => {
    test("should call save on the document instance", async () => {
      const mockDoc = { save: jest.fn().mockResolvedValue(mockUser) };
      const result = await userRepository.saveUser(mockDoc);
      expect(mockDoc.save).toHaveBeenCalled();
      expect(result).toEqual(mockUser);
    });
  });

  // ── getUserGrowth ───────────────────────────────────────────────────────
  describe("getUserGrowth", () => {
    test("should run aggregation pipeline with correct date filter", async () => {
      const since = new Date("2026-01-01");
      const mockOutput = [{ _id: "2026-06-23", count: 12 }];
      mockUserModel.aggregate.mockResolvedValue(mockOutput);

      const result = await userRepository.getUserGrowth(since);

      expect(mockUserModel.aggregate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ $match: { createdAt: { $gte: since } } }),
        ]),
      );
      expect(result).toEqual(mockOutput);
    });
  });
});
