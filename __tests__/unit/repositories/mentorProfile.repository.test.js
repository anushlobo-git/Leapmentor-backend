/**
 * @fileoverview MentorProfile Repository Corporate Unit Tests
 * @description Verifies pipeline sorting boundaries, deep population,
 * and array filter parameters with zero network dependency.
 */

const createMentorProfileRepository = require("../../../repositories/mentorProfile.repository");

describe("MentorProfile Repository", () => {
  let mockModel;
  let repository;

  const mockProfile = {
    _id: "profile111",
    user: "user555",
    currentRole: "Staff Engineer",
    industry: "Fintech",
    skills: ["Node.js", "MongoDB"],
    isProfileComplete: true,
    isProfilePublished: true,
  };

  // Fluent chain simulation factory mapping targeted method signatures
  // ── Query chain factory for methods utilizing chaining ──────────────────
  const makeChain = (resolvedValue = null) => ({
    populate: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(resolvedValue),
    // Native thenable handler to unpack un-leaned query operations
    then: jest.fn(function (callback) {
      return Promise.resolve(callback(resolvedValue));
    }),
  });

  beforeEach(() => {
    mockModel = {
      aggregate: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      findOneAndDelete: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      findOneAndUpdate: jest.fn(),
      countDocuments: jest.fn(),
    };
    repository = createMentorProfileRepository(mockModel);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── getMentorIndustryStats ──────────────────────────────────────────────
  describe("getMentorIndustryStats", () => {
    test("should execute aggregated volume count matching non-empty sectors", async () => {
      const mockStats = [{ _id: "Fintech", count: 5 }];
      mockModel.aggregate.mockResolvedValue(mockStats);

      const result = await repository.getMentorIndustryStats();

      expect(mockModel.aggregate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            $match: { industry: { $exists: true, $ne: null, $ne: "" } },
          }),
        ]),
      );
      expect(result).toEqual(mockStats);
    });
  });

  // ── findMentorProfilesByUserIds ─────────────────────────────────────────
  describe("findMentorProfilesByUserIds", () => {
    test("should fetch selective projection keys matching user element arrays", async () => {
      const chain = makeChain([mockProfile]);
      mockModel.find.mockReturnValue(chain);

      const result = await repository.findMentorProfilesByUserIds(["user555"]);

      expect(mockModel.find).toHaveBeenCalledWith({
        user: { $in: ["user555"] },
      });
      expect(chain.select).toHaveBeenCalledWith(
        "user isProfileComplete isProfilePublished",
      );
      expect(chain.lean).toHaveBeenCalled();
      expect(result).toEqual([mockProfile]);
    });
  });

  // ── findMentorProfileByUserId ───────────────────────────────────────────
  describe("findMentorProfileByUserId", () => {
    test("should execute single matching plain snapshot lookups", async () => {
      const chain = makeChain(mockProfile);
      mockModel.findOne.mockReturnValue(chain);

      const result = await repository.findMentorProfileByUserId("user555");

      expect(mockModel.findOne).toHaveBeenCalledWith({ user: "user555" });
      expect(result).toEqual(mockProfile);
    });

    test("should return null cleanly if target identifier has no profile document", async () => {
      const chain = makeChain(null);
      mockModel.findOne.mockReturnValue(chain);

      const result = await repository.findMentorProfileByUserId("nonexistent");
      expect(result).toBeNull();
    });
  });

  // ── deleteMentorProfileByUserId ─────────────────────────────────────────
  describe("deleteMentorProfileByUserId", () => {
    test("should invoke findOneAndDelete execution routines instantly", async () => {
      mockModel.findOneAndDelete.mockResolvedValue(mockProfile);

      const result = await repository.deleteMentorProfileByUserId("user555");

      expect(mockModel.findOneAndDelete).toHaveBeenCalledWith({
        user: "user555",
      });
      expect(result).toEqual(mockProfile);
    });
  });

  // ── findAllMentorProfiles ───────────────────────────────────────────────
  describe("findAllMentorProfiles", () => {
    test("should construct deep hydrations and uniform sort configurations", async () => {
      const chain = makeChain([mockProfile]);
      mockModel.find.mockReturnValue(chain);

      const result = await repository.findAllMentorProfiles();

      expect(mockModel.find).toHaveBeenCalledWith({});
      expect(chain.populate).toHaveBeenCalledWith(
        "user",
        "name email createdAt",
      );
      expect(chain.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(result).toEqual([mockProfile]);
    });
  });

  // ── findPublishedByUserId ───────────────────────────────────────────────
  describe("findPublishedByUserId", () => {
    test("should query items constrained by publication state masks", async () => {
      const chain = makeChain(mockProfile);
      mockModel.findOne.mockReturnValue(chain);

      const result = await repository.findPublishedByUserId("user555");

      expect(mockModel.findOne).toHaveBeenCalledWith({
        user: "user555",
        isProfilePublished: true,
      });
      expect(chain.populate).toHaveBeenCalledWith("user", "name email");
      expect(result).toEqual(mockProfile);
    });
  });

  // ── create ──────────────────────────────────────────────────────────────
  describe("create", () => {
    test("should instantiate document models directly", async () => {
      mockModel.create.mockResolvedValue(mockProfile);
      const result = await repository.create({ user: "user555" });
      expect(mockModel.create).toHaveBeenCalledWith({ user: "user555" });
      expect(result).toEqual(mockProfile);
    });

    test("should bubble exceptions upward on verification crashes", async () => {
      mockModel.create.mockRejectedValue(new Error("Validation Failure"));
      await expect(repository.create({})).rejects.toThrow("Validation Failure");
    });
  });

  // ── findOneAndUpdateByUserId ────────────────────────────────────────────
  describe("findOneAndUpdateByUserId", () => {
    test("should enforce validator updates against targeted entries", async () => {
      mockModel.findOneAndUpdate.mockResolvedValue(mockProfile);
      const data = { currentRole: "Architect" };

      const result = await repository.findOneAndUpdateByUserId("user555", data);

      expect(mockModel.findOneAndUpdate).toHaveBeenCalledWith(
        { user: "user555" },
        { $set: data },
        { new: true, runValidators: true },
      );
      expect(result).toEqual(mockProfile);
    });
  });

  // ── saveMentorProfile ───────────────────────────────────────────────────
  describe("saveMentorProfile", () => {
    test("should call internal save operations directly on document contexts", async () => {
      const mockDoc = { save: jest.fn().mockResolvedValue(mockProfile) };
      const result = await repository.saveMentorProfile(mockDoc);
      expect(mockDoc.save).toHaveBeenCalled();
      expect(result).toEqual(mockProfile);
    });
  });

  // ── findSimilarPublishedMentors ─────────────────────────────────────────
  describe("findSimilarPublishedMentors", () => {
    test("should filter exclusions and matches across cross-cutting skills arrays", async () => {
      const chain = makeChain([mockProfile]);
      mockModel.find.mockReturnValue(chain);

      const result = await repository.findSimilarPublishedMentors(
        "userX",
        ["Node.js"],
        3,
      );

      expect(mockModel.find).toHaveBeenCalledWith({
        user: { $ne: "userX" },
        isProfilePublished: true,
        isProfileComplete: true,
        skills: { $in: ["Node.js"] },
      });
      expect(chain.limit).toHaveBeenCalledWith(3);
      expect(result).toEqual([mockProfile]);
    });
  });

  // ── findMentorsWithUserPopulation ───────────────────────────────────────
  describe("findMentorsWithUserPopulation", () => {
    test("should compile complex sort, skip, and limit chains cleanly", async () => {
      const chain = makeChain([mockProfile]);
      mockModel.find.mockReturnValue(chain);

      const result = await repository.findMentorsWithUserPopulation(
        { industry: "Fintech" },
        { avgRating: -1 },
        10,
        5,
      );

      expect(mockModel.find).toHaveBeenCalledWith({ industry: "Fintech" });
      expect(chain.sort).toHaveBeenCalledWith({ avgRating: -1 });
      expect(chain.skip).toHaveBeenCalledWith(10);
      expect(chain.limit).toHaveBeenCalledWith(5);
      expect(result).toEqual([mockProfile]);
    });
  });
});
