/**
 * @fileoverview MenteeProfile Repository Corporate Unit Tests
 * @description Verifies mapping selections, population filters,
 * and update execution trees with zero real database connectivity.
 */

const createMenteeProfileRepository = require("../../../repositories/menteeProfile.repository");

describe("MenteeProfile Repository", () => {
  let mockModel;
  let repository;

  const mockProfile = {
    _id: "menteeProfile999",
    user: "user777",
    currentRole: "Data Analyst",
    company: "Leap Corporation",
    skills: ["Python", "SQL"],
    isProfileComplete: true,
    isProfilePublished: true,
  };

  // Reusable query chain factory mapping fluent criteria queries
  const makeChain = (resolvedValue = null) => ({
    select: jest.fn().mockReturnThis(),
    populate: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(resolvedValue),
    then: jest.fn(function (callback) {
      return Promise.resolve(callback(resolvedValue));
    }),
  });

  beforeEach(() => {
    mockModel = {
      find: jest.fn(),
      findOne: jest.fn(),
      findOneAndDelete: jest.fn(),
      create: jest.fn(),
      findOneAndUpdate: jest.fn(),
    };
    repository = createMenteeProfileRepository(mockModel);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── findMenteeProfilesByUserIds ─────────────────────────────────────────
  describe("findMenteeProfilesByUserIds", () => {
    test("should fetch core completion flags matching incoming user constraints", async () => {
      const chain = makeChain([mockProfile]);
      mockModel.find.mockReturnValue(chain);

      const result = await repository.findMenteeProfilesByUserIds(["user777"]);

      expect(mockModel.find).toHaveBeenCalledWith({
        user: { $in: ["user777"] },
      });
      expect(chain.select).toHaveBeenCalledWith(
        "user isProfileComplete isProfilePublished",
      );
      expect(result).toEqual([mockProfile]);
    });
  });

  // ── findMenteeProfilesByUserIdsFull ─────────────────────────────────────
  describe("findMenteeProfilesByUserIdsFull", () => {
    test("should fetch complete comprehensive profiles for target user lists", async () => {
      const chain = makeChain([mockProfile]);
      mockModel.find.mockReturnValue(chain);

      const result = await repository.findMenteeProfilesByUserIdsFull([
        "user777",
      ]);

      expect(mockModel.find).toHaveBeenCalledWith({
        user: { $in: ["user777"] },
      });
      expect(chain.select).toHaveBeenCalledWith(
        "user currentRole company profilePicture skills bio interestedFields isProfileComplete isProfilePublished",
      );
      expect(result).toEqual([mockProfile]);
    });
  });

  // ── findMenteeProfileByUserId ───────────────────────────────────────────
  describe("findMenteeProfileByUserId", () => {
    test("should return individual profiling data mapped dynamically", async () => {
      const chain = makeChain(mockProfile);
      mockModel.findOne.mockReturnValue(chain);

      const result = await repository.findMenteeProfileByUserId("user777");

      expect(mockModel.findOne).toHaveBeenCalledWith({ user: "user777" });
      expect(result).toEqual(mockProfile);
    });

    test("should resolve null if user identifier has no tracking document profile", async () => {
      const chain = makeChain(null);
      mockModel.findOne.mockReturnValue(chain);

      const result = await repository.findMenteeProfileByUserId("absentUser");
      expect(result).toBeNull();
    });
  });

  // ── deleteMenteeProfileByUserId ─────────────────────────────────────────
  describe("deleteMentorProfileByUserId", () => {
    test("should invoke fineOneAndDelete execution layers natively", async () => {
      mockModel.findOneAndDelete.mockResolvedValue(mockProfile);

      const result = await repository.deleteMenteeProfileByUserId("user777");

      expect(mockModel.findOneAndDelete).toHaveBeenCalledWith({
        user: "user777",
      });
      expect(result).toEqual(mockProfile);
    });
  });

  // ── findMenteeProfile ───────────────────────────────────────────────────
  describe("findMenteeProfile", () => {
    test("should filter biographical projection blocks cleanly", async () => {
      const chain = makeChain(mockProfile);
      mockModel.findOne.mockReturnValue(chain);

      const result = await repository.findMenteeProfile("user777");

      expect(mockModel.findOne).toHaveBeenCalledWith({ user: "user777" });
      expect(chain.select).toHaveBeenCalledWith(
        "currentRole company profilePicture skills bio interestedFields",
      );
      expect(result).toEqual(mockProfile);
    });
  });

  // ── findByUserId ────────────────────────────────────────────────────────
  describe("findByUserId", () => {
    test("should execute standard lookup queries matching user references", async () => {
      const chain = makeChain(mockProfile);
      mockModel.findOne.mockReturnValue(chain);

      const result = await repository.findByUserId("user777");

      expect(mockModel.findOne).toHaveBeenCalledWith({ user: "user777" });
      expect(result).toEqual(mockProfile);
    });
  });

  // ── findByUserIdWithAccountInfo ─────────────────────────────────────────
  describe("findByUserIdWithAccountInfo", () => {
    test("should compile query paths with parent user collections populated", async () => {
      const chain = makeChain(mockProfile);
      mockModel.findOne.mockReturnValue(chain);

      const result = await repository.findByUserIdWithAccountInfo("user777");

      expect(mockModel.findOne).toHaveBeenCalledWith({ user: "user777" });
      expect(chain.populate).toHaveBeenCalledWith(
        "user",
        "name email isEmailVerified",
      );
      expect(result).toEqual(mockProfile);
    });
  });

  // ── findPublishedByUserId ───────────────────────────────────────────────
  describe("findPublishedByUserId", () => {
    test("should evaluate constraints ensuring profile visibility validation", async () => {
      const chain = makeChain(mockProfile);
      mockModel.findOne.mockReturnValue(chain);

      const result = await repository.findPublishedByUserId("user777");

      expect(mockModel.findOne).toHaveBeenCalledWith({
        user: "user777",
        isProfilePublished: true,
      });
      expect(chain.populate).toHaveBeenCalledWith("user", "name email");
      expect(result).toEqual(mockProfile);
    });
  });

  // ── create ──────────────────────────────────────────────────────────────
  describe("create", () => {
    test("should write profile properties down immediately inside the database", async () => {
      mockModel.create.mockResolvedValue(mockProfile);
      const result = await repository.create({ user: "user777" });
      expect(mockModel.create).toHaveBeenCalledWith({ user: "user777" });
      expect(result).toEqual(mockProfile);
    });

    test("should propagate internal schema exceptions outward cleanly", async () => {
      mockModel.create.mockRejectedValue(new Error("Database Write Rejection"));
      await expect(repository.create({})).rejects.toThrow(
        "Database Write Rejection",
      );
    });
  });

  // ── findOneAndUpdateByUserId ────────────────────────────────────────────
  describe("findOneAndUpdateByUserId", () => {
    test("should issue atomic changes while keeping core schema validation gates active", async () => {
      mockModel.findOneAndUpdate.mockResolvedValue(mockProfile);
      const data = { currentRole: "Senior Analyst" };

      const result = await repository.findOneAndUpdateByUserId("user777", data);

      expect(mockModel.findOneAndUpdate).toHaveBeenCalledWith(
        { user: "user777" },
        { $set: data },
        { new: true, runValidators: true },
      );
      expect(result).toEqual(mockProfile);
    });
  });
});
