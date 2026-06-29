/**
 * @fileoverview User Repository Corporate Unit Tests
 * @description Assures precise verification of soft-delete options, pagination matrices,
 * dynamic timeline growth aggregations, and Atlas search fallback pipelines with zero network access.
 */

const createUserRepository = require("../../../repositories/user.repository");

describe("User Repository", () => {
  let mockUserModel;
  let userRepository;

  const mockUserRecord = {
    _id: "user123",
    name: "Alex Mentor",
    email: "alex@leapmentor.com",
    roles: ["mentor"],
    isDeleted: false,
    createdAt: new Date("2026-06-01T10:00:00.000Z"),
  };

  const mockRecordsArray = [mockUserRecord];

  // Safe Factory: Decorates a genuine Promise instance to completely avoid "manual then" linter errors
  const makeChain = (resolvedValue = null) => {
    const promise = Promise.resolve(resolvedValue);

    // Attach Mongoose chain builders directly to the native Promise, returning itself for fluid chaining
    promise.select = jest.fn().mockReturnValue(promise);
    promise.sort = jest.fn().mockReturnValue(promise);
    promise.skip = jest.fn().mockReturnValue(promise);
    promise.limit = jest.fn().mockReturnValue(promise);
    promise.setOptions = jest.fn().mockReturnValue(promise);
    promise.lean = jest
      .fn()
      .mockImplementation(() => Promise.resolve(resolvedValue));

    return promise;
  };

  beforeEach(() => {
    mockUserModel = {
      find: jest.fn(),
      countDocuments: jest.fn(),
      aggregate: jest.fn(),
      findById: jest.fn(),
      findByIdAndDelete: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      findOneAndUpdate: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
    };
    userRepository = createUserRepository(mockUserModel);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── BASIC LOOKUPS & WRITE OPERATIONS ────────────────────────────────────
  describe("Basic Lookups & Write Operations", () => {
    test("findUserByEmail should locate account matching targeted parameters", async () => {
      mockUserModel.findOne.mockResolvedValue(mockUserRecord);

      const result = await userRepository.findUserByEmail(
        "alex@leapmentor.com",
      );

      expect(mockUserModel.findOne).toHaveBeenCalledWith({
        email: "alex@leapmentor.com",
      });
      expect(result).toEqual(mockUserRecord);
    });

    test("findUserByEmailWithPassword should bypass normal exclusion masks to append hidden secrets", async () => {
      const mockChain = makeChain(mockUserRecord);
      mockUserModel.findOne.mockReturnValue(mockChain);

      const result = await userRepository.findUserByEmailWithPassword(
        "alex@leapmentor.com",
      );

      expect(mockUserModel.findOne).toHaveBeenCalledWith({
        email: "alex@leapmentor.com",
      });
      expect(mockChain.select).toHaveBeenCalledWith("+password");
      expect(result).toEqual(mockUserRecord);
    });

    test("createUser should instantly persist structural registration fields payload", async () => {
      mockUserModel.create.mockResolvedValue(mockUserRecord);
      const initialFields = { name: "Alex", email: "alex@leapmentor.com" };

      const result = await userRepository.createUser(initialFields);

      expect(mockUserModel.create).toHaveBeenCalledWith(initialFields);
      expect(result).toEqual(mockUserRecord);
    });

    test("saveUser should execute native internal instance updates directly", async () => {
      const fakeInstance = {
        ...mockUserRecord,
        save: jest.fn().mockResolvedValue(mockUserRecord),
      };

      const result = await userRepository.saveUser(fakeInstance);

      expect(fakeInstance.save).toHaveBeenCalled();
      expect(result).toEqual(mockUserRecord);
    });
  });

  // ── IDENTITY LOOKUPS & PAGINATION ───────────────────────────────────────
  describe("Identity Lookups & Pagination", () => {
    test("findUserById should fetch a restricted projection masking passwords and ignoring deletions", async () => {
      const mockChain = makeChain(mockUserRecord);
      mockUserModel.findById.mockReturnValue(mockChain);

      const result = await userRepository.findUserById("user123");

      expect(mockUserModel.findById).toHaveBeenCalledWith("user123");
      expect(mockChain.select).toHaveBeenCalledWith("-password");
      expect(mockChain.setOptions).toHaveBeenCalledWith({
        ignoreIsDeleted: true,
      });
      expect(mockChain.lean).toHaveBeenCalled();
      expect(result).toEqual(mockUserRecord);
    });

    test("findUserByIdRaw should return mutable documents tracking raw identifier keys", async () => {
      const mockChain = makeChain(mockUserRecord);
      mockUserModel.findById.mockReturnValue(mockChain);

      const result = await userRepository.findUserByIdRaw("user123");

      expect(mockUserModel.findById).toHaveBeenCalledWith("user123");
      expect(mockChain.setOptions).toHaveBeenCalledWith({
        ignoreIsDeleted: true,
      });
      expect(result).toEqual(mockUserRecord);
    });

    test("findUsers should apply complete pagination boundaries alongside deletion bypass rules", async () => {
      const mockChain = makeChain(mockRecordsArray);
      mockUserModel.find.mockReturnValue(mockChain);
      const criteria = { roles: "mentor" };

      const result = await userRepository.findUsers(criteria, {
        skip: 30,
        limit: 15,
      });

      expect(mockUserModel.find).toHaveBeenCalledWith(criteria, null, {
        ignoreIsDeleted: true,
      });
      expect(mockChain.select).toHaveBeenCalledWith("-password");
      expect(mockChain.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(mockChain.skip).toHaveBeenCalledWith(30);
      expect(mockChain.limit).toHaveBeenCalledWith(15);
      expect(mockChain.lean).toHaveBeenCalled();
      expect(result).toEqual(mockRecordsArray);
    });
  });

  // ── COUNTER METRICS & GROWTH AGGREGATIONS ───────────────────────────────
  describe("Counter Metrics & Growth Aggregations", () => {
    test("countAllUsers should isolate active states explicitly matching positive flag constraints", async () => {
      mockUserModel.countDocuments.mockResolvedValue(250);

      const result = await userRepository.countAllUsers();

      expect(mockUserModel.countDocuments).toHaveBeenCalledWith({
        isDeleted: { $ne: true },
      });
      expect(result).toBe(250);
    });

    test("countUsersWithOptions should append explicit fluent runtime option overrides", async () => {
      const mockChain = makeChain(45);
      mockUserModel.countDocuments.mockReturnValue(mockChain);
      const customFilter = { status: "active" };

      const result = await userRepository.countUsersWithOptions(customFilter);

      expect(mockUserModel.countDocuments).toHaveBeenCalledWith(customFilter);
      expect(mockChain.setOptions).toHaveBeenCalledWith({
        ignoreIsDeleted: true,
      });
      expect(result).toBe(45);
    });

    test("countUsersWithFilter should evaluate general counting arrays with configurations directly in arguments", async () => {
      mockUserModel.countDocuments.mockResolvedValue(88);
      const targetFilter = { email: /@gmail\.com$/ };

      const result = await userRepository.countUsersWithFilter(targetFilter);

      expect(mockUserModel.countDocuments).toHaveBeenCalledWith(targetFilter, {
        ignoreIsDeleted: true,
      });
      expect(result).toBe(88);
    });

    test("getUserGrowth should trigger time tracking formatting aggregation frameworks", async () => {
      const historyThreshold = new Date("2026-01-01");
      const aggregateMockResult = [{ _id: "2026-06-01", count: 12 }];
      mockUserModel.aggregate.mockResolvedValue(aggregateMockResult);

      const result = await userRepository.getUserGrowth(historyThreshold);

      expect(mockUserModel.aggregate).toHaveBeenCalledWith([
        { $match: { createdAt: { $gte: historyThreshold } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]);
      expect(result).toEqual(aggregateMockResult);
    });
  });

  // ── MUTATIONS, BLOCKS & ACCOUNT REMOVALS ────────────────────────────────
  describe("Mutations, Blocks & Account Removals", () => {
    test("deleteUserById should enforce hard-purges across target accounts bypassing soft deletion configurations", async () => {
      mockUserModel.findByIdAndDelete.mockResolvedValue(mockUserRecord);

      const result = await userRepository.deleteUserById("user123");

      expect(mockUserModel.findByIdAndDelete).toHaveBeenCalledWith("user123", {
        ignoreIsDeleted: true,
      });
      expect(result).toEqual(mockUserRecord);
    });

    test("blockUser should update soft deletion parameters tracking flexible timestamps safely", async () => {
      mockUserModel.findByIdAndUpdate.mockResolvedValue(mockUserRecord);

      await userRepository.blockUser("user123");

      expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith(
        "user123",
        { isDeleted: true, deletedAt: expect.any(Date) },
        { new: true },
      );
    });

    test("unblockUser should clear deletion timestamps completely using unique record matches", async () => {
      mockUserModel.findOneAndUpdate.mockResolvedValue(mockUserRecord);

      const result = await userRepository.unblockUser("user123");

      expect(mockUserModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: "user123" },
        { isDeleted: false, deletedAt: null },
        { new: true, ignoreIsDeleted: true },
      );
      expect(result).toEqual(mockUserRecord);
    });
  });

  // ── SEARCH MECHANISMS & COMPLEX FALLBACKS ───────────────────────────────
  describe("Search Mechanisms & Complex Fallbacks", () => {
    test("findUsersBySearchTerm should compile case-insensitive RegExp mappings across name or email", async () => {
      const mockChain = makeChain(mockRecordsArray);
      mockUserModel.find.mockReturnValue(mockChain);

      const result = await userRepository.findUsersBySearchTerm(" alex ");

      expect(mockUserModel.find).toHaveBeenCalledWith({
        $or: [{ name: /alex/i }, { email: /alex/i }],
      });
      expect(mockChain.select).toHaveBeenCalledWith("_id");
      expect(mockChain.lean).toHaveBeenCalled();
      expect(result).toEqual(mockRecordsArray);
    });

    test("findUsersByName should resolve unique identifiers matching localized parameters text pattern layouts", async () => {
      const mockChain = makeChain(mockRecordsArray);
      mockUserModel.find.mockReturnValue(mockChain);

      await userRepository.findUsersByName("Alex");

      expect(mockUserModel.find).toHaveBeenCalledWith({
        name: { $regex: "Alex", $options: "i" },
      });
    });

    test("findUsersByNameSearch should map direct case-insensitive string regex patterns cleanly", async () => {
      const mockChain = makeChain(mockRecordsArray);
      mockUserModel.find.mockReturnValue(mockChain);

      await userRepository.findUsersByNameSearch("Alex");

      expect(mockUserModel.find).toHaveBeenCalledWith({
        name: { $regex: "Alex", $options: "i" },
      });
    });

    test("findUsersByRoleAndNameRegex should leverage high-performance Atlas Search pipelines when index succeeds", async () => {
      const aggregateMockResult = [{ _id: "user123", name: "Alex Mentor" }];
      mockUserModel.aggregate.mockResolvedValue(aggregateMockResult);

      const result = await userRepository.findUsersByRoleAndNameRegex("Alex", [
        "mentor",
      ]);

      expect(mockUserModel.aggregate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ $search: expect.any(Object) }),
          expect.objectContaining({ $match: { roles: { $in: ["mentor"] } } }),
        ]),
      );
      expect(result).toEqual(aggregateMockResult);
    });

    test("findUsersByRoleAndNameRegex should fall back cleanly onto standard RegExp queries if Atlas index breaks", async () => {
      mockUserModel.aggregate.mockRejectedValue(
        new Error("Atlas Index Not Ready"),
      );

      const mockChain = makeChain([{ _id: "user123", name: "Alex Mentor" }]);
      mockUserModel.find.mockReturnValue(mockChain);

      const result = await userRepository.findUsersByRoleAndNameRegex("Alex", [
        "mentor",
      ]);

      expect(mockUserModel.aggregate).toHaveBeenCalled();
      expect(mockUserModel.find).toHaveBeenCalledWith({
        name: { $regex: "Alex", $options: "i" },
        roles: { $in: ["mentor"] },
      });
      expect(mockChain.select).toHaveBeenCalledWith("_id name");
      expect(mockChain.lean).toHaveBeenCalled();
      expect(result).toEqual([{ _id: "user123", name: "Alex Mentor" }]);
    });
  });
});
