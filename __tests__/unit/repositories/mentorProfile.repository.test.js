/**
 * @fileoverview MentorProfile Repository Corporate Unit Tests
 * @description Assures precise verification of aggregation structures, selection projections,
 * multi-stage subdocument populations, and query builder variations with zero network dependencies.
 */

const createMentorProfileRepository = require("../../../repositories/mentorProfile.repository");

describe("MentorProfile Repository", () => {
  let mockMentorProfileModel;
  let mentorProfileRepository;

  const mockProfileRecord = {
    _id: "mentor001",
    user: "user777",
    currentRole: "Principal Architect",
    company: "Leapmentor Core",
    industry: "Technology",
    skills: ["System Design", "Node.js"],
    avgRating: 4.9,
    totalSessions: 120,
    isProfileComplete: true,
    isProfilePublished: true,
  };

  const mockRecordsArray = [mockProfileRecord];

  // Safe Factory: Decorates a genuine Promise instance to completely avoid "manual then" linter errors
  const makeChain = (resolvedValue = null) => {
    const promise = Promise.resolve(resolvedValue);

    // Attach Mongoose chain builders directly to the native Promise, returning itself for fluid chaining
    promise.select = jest.fn().mockReturnValue(promise);
    promise.populate = jest.fn().mockReturnValue(promise);
    promise.sort = jest.fn().mockReturnValue(promise);
    promise.limit = jest.fn().mockReturnValue(promise);
    promise.skip = jest.fn().mockReturnValue(promise);
    promise.lean = jest
      .fn()
      .mockImplementation(() => Promise.resolve(resolvedValue));

    return promise;
  };

  beforeEach(() => {
    mockMentorProfileModel = {
      aggregate: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      findOneAndDelete: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      findOneAndUpdate: jest.fn(),
      countDocuments: jest.fn(),
    };
    mentorProfileRepository = createMentorProfileRepository(
      mockMentorProfileModel,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── AGGREGATIONS & QUANTIFIED COUNTERS ──────────────────────────────────
  describe("Aggregations & Quantified Counters", () => {
    test("getMentorIndustryStats should fire an isolated aggregation matching strict threshold limits", async () => {
      mockMentorProfileModel.aggregate.mockResolvedValue([
        { _id: "Tech", count: 5 },
      ]);

      const result = await mentorProfileRepository.getMentorIndustryStats();

      expect(mockMentorProfileModel.aggregate).toHaveBeenCalledWith([
        { $match: { industry: { $exists: true, $ne: null, $ne: "" } } },
        { $group: { _id: "$industry", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 12 },
      ]);
      expect(result).toEqual([{ _id: "Tech", count: 5 }]);
    });

    test("aggregateMentorProfiles should forward variable runtime pipelines transparently", async () => {
      const customPipeline = [{ $match: { avgRating: { $gte: 4.5 } } }];
      mockMentorProfileModel.aggregate.mockResolvedValue(mockRecordsArray);

      const result =
        await mentorProfileRepository.aggregateMentorProfiles(customPipeline);

      expect(mockMentorProfileModel.aggregate).toHaveBeenCalledWith(
        customPipeline,
      );
      expect(result).toEqual(mockRecordsArray);
    });

    test("countMentorProfiles should translate query constraints into numeric metrics", async () => {
      mockMentorProfileModel.countDocuments.mockResolvedValue(42);
      const criteria = { isProfilePublished: true };

      const count = await mentorProfileRepository.countMentorProfiles(criteria);

      expect(mockMentorProfileModel.countDocuments).toHaveBeenCalledWith(
        criteria,
      );
      expect(count).toBe(42);
    });
  });

  // ── USER RELATIONSHIP LOOKUPS & SELECTIONS ──────────────────────────────
  describe("User Relationship Lookups & Selections", () => {
    test("findMentorProfilesByUserIds should query target arrays with restricted flag selection fields", async () => {
      const mockChain = makeChain(mockRecordsArray);
      mockMentorProfileModel.find.mockReturnValue(mockChain);
      const userIds = ["user777"];

      const result =
        await mentorProfileRepository.findMentorProfilesByUserIds(userIds);

      expect(mockMentorProfileModel.find).toHaveBeenCalledWith({
        user: { $in: userIds },
      });
      expect(mockChain.select).toHaveBeenCalledWith(
        "user isProfileComplete isProfilePublished",
      );
      expect(mockChain.lean).toHaveBeenCalled();
      expect(result).toEqual(mockRecordsArray);
    });

    test("findMentorProfileByUserId should map search profiles using clean lean evaluation", async () => {
      const mockChain = makeChain(mockProfileRecord);
      mockMentorProfileModel.findOne.mockReturnValue(mockChain);

      const result =
        await mentorProfileRepository.findMentorProfileByUserId("user777");

      expect(mockMentorProfileModel.findOne).toHaveBeenCalledWith({
        user: "user777",
      });
      expect(mockChain.lean).toHaveBeenCalled();
      expect(result).toEqual(mockProfileRecord);
    });

    test("findMentorProfile should return basic bio fields matching target layout constraints", async () => {
      const mockChain = makeChain(mockProfileRecord);
      mockMentorProfileModel.findOne.mockReturnValue(mockChain);

      const result = await mentorProfileRepository.findMentorProfile("user777");

      expect(mockChain.select).toHaveBeenCalledWith(
        "currentRole company profilePicture skills hourlyRate avgRating bio",
      );
      expect(result).toEqual(mockProfileRecord);
    });

    test("findMentorProfileFull should request comprehensive functional details fields", async () => {
      const mockChain = makeChain(mockProfileRecord);
      mockMentorProfileModel.findOne.mockReturnValue(mockChain);

      const result =
        await mentorProfileRepository.findMentorProfileFull("user777");

      expect(mockChain.select).toHaveBeenCalledWith(
        "currentRole company industry bio hourlyRate avgRating yearsOfExperience profilePicture skills",
      );
      expect(result).toEqual(mockProfileRecord);
    });

    test("findMentorRating should isolate specific score evaluation dimensions", async () => {
      const mockChain = makeChain({ avgRating: 4.9, totalSessions: 120 });
      mockMentorProfileModel.findOne.mockReturnValue(mockChain);

      const result = await mentorProfileRepository.findMentorRating("user777");

      expect(mockChain.select).toHaveBeenCalledWith("avgRating totalSessions");
      expect(result).toEqual({ avgRating: 4.9, totalSessions: 120 });
    });
  });

  // ── POPULATION & EXTENSIVE COMPLEX CHAINS ───────────────────────────────
  describe("Population & Extensive Complex Chains", () => {
    test("findAllMentorProfiles should coordinate generic finding rules alongside full metadata parameters", async () => {
      const mockChain = makeChain(mockRecordsArray);
      mockMentorProfileModel.find.mockReturnValue(mockChain);

      const result = await mentorProfileRepository.findAllMentorProfiles();

      expect(mockMentorProfileModel.find).toHaveBeenCalledWith({});
      expect(mockChain.populate).toHaveBeenCalledWith(
        "user",
        "name email createdAt",
      );
      expect(mockChain.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(mockChain.lean).toHaveBeenCalled();
      expect(result).toEqual(mockRecordsArray);
    });

    test("findMentorProfileById should chain population models onto direct item fetching lookups", async () => {
      const mockChain = makeChain(mockProfileRecord);
      mockMentorProfileModel.findById.mockReturnValue(mockChain);

      const result =
        await mentorProfileRepository.findMentorProfileById("mentor001");

      expect(mockMentorProfileModel.findById).toHaveBeenCalledWith("mentor001");
      expect(mockChain.populate).toHaveBeenCalledWith(
        "user",
        "name email createdAt",
      );
      expect(mockChain.lean).toHaveBeenCalled();
      expect(result).toEqual(mockProfileRecord);
    });

    test("findMentorProfileByIdWithUser should preserve active query contexts without lean conversions", async () => {
      const mockChain = makeChain(mockProfileRecord);
      mockMentorProfileModel.findById.mockReturnValue(mockChain);

      const result =
        await mentorProfileRepository.findMentorProfileByIdWithUser(
          "mentor001",
        );

      expect(mockMentorProfileModel.findById).toHaveBeenCalledWith("mentor001");
      expect(mockChain.populate).toHaveBeenCalledWith("user", "name email");
      expect(mockChain.lean).not.toHaveBeenCalled();
      expect(result).toEqual(mockProfileRecord);
    });

    test("findMentorProfileByUserIdWithUser should target profiles returning mutable metadata lookups", async () => {
      const mockChain = makeChain(mockProfileRecord);
      mockMentorProfileModel.findOne.mockReturnValue(mockChain);

      await mentorProfileRepository.findMentorProfileByUserIdWithUser(
        "user777",
      );

      expect(mockMentorProfileModel.findOne).toHaveBeenCalledWith({
        user: "user777",
      });
      expect(mockChain.populate).toHaveBeenCalledWith(
        "user",
        "name email isEmailVerified",
      );
    });

    test("findPublishedByUserId should restrict queries to exposed public elements only", async () => {
      const mockChain = makeChain(mockProfileRecord);
      mockMentorProfileModel.findOne.mockReturnValue(mockChain);

      await mentorProfileRepository.findPublishedByUserId("user777");

      expect(mockMentorProfileModel.findOne).toHaveBeenCalledWith({
        user: "user777",
        isProfilePublished: true,
      });
      expect(mockChain.populate).toHaveBeenCalledWith("user", "name email");
    });

    test("findSimilarPublishedMentors should analyze overlapping capability arrays", async () => {
      const mockChain = makeChain(mockRecordsArray);
      mockMentorProfileModel.find.mockReturnValue(mockChain);

      const result = await mentorProfileRepository.findSimilarPublishedMentors(
        "user777",
        ["System Design"],
        3,
      );

      expect(mockMentorProfileModel.find).toHaveBeenCalledWith({
        user: { $ne: "user777" },
        isProfilePublished: true,
        isProfileComplete: true,
        skills: { $in: ["System Design"] },
      });
      expect(mockChain.limit).toHaveBeenCalledWith(3);
      expect(result).toEqual(mockRecordsArray);
    });

    test("findMentorsWithUserPopulation should execute the full pagination and positioning matrix", async () => {
      const mockChain = makeChain(mockRecordsArray);
      mockMentorProfileModel.find.mockReturnValue(mockChain);
      const filter = { industry: "Tech" };
      const sort = { avgRating: -1 };

      const result =
        await mentorProfileRepository.findMentorsWithUserPopulation(
          filter,
          sort,
          20,
          10,
        );

      expect(mockMentorProfileModel.find).toHaveBeenCalledWith(filter);
      expect(mockChain.sort).toHaveBeenCalledWith(sort);
      expect(mockChain.skip).toHaveBeenCalledWith(20);
      expect(mockChain.limit).toHaveBeenCalledWith(10);
      expect(mockChain.lean).toHaveBeenCalled();
      expect(result).toEqual(mockRecordsArray);
    });
  });

  // ── WRITES, MUTATIONS & LIFECYCLE MANAGEMENT ───────────────────────────
  describe("Writes, Mutations & Lifecycle Management", () => {
    test("deleteMentorProfileByUserId should drop targeting metrics tracking keys immediately", async () => {
      mockMentorProfileModel.findOneAndDelete.mockResolvedValue(
        mockProfileRecord,
      );

      const result =
        await mentorProfileRepository.deleteMentorProfileByUserId("user777");

      expect(mockMentorProfileModel.findOneAndDelete).toHaveBeenCalledWith({
        user: "user777",
      });
      expect(result).toEqual(mockProfileRecord);
    });

    test("create should wrap standard instance generation payload mapping routines", async () => {
      mockMentorProfileModel.create.mockResolvedValue(mockProfileRecord);
      const initialFields = { user: "user777", industry: "Tech" };

      const result = await mentorProfileRepository.create(initialFields);

      expect(mockMentorProfileModel.create).toHaveBeenCalledWith(initialFields);
      expect(result).toEqual(mockProfileRecord);
    });

    test("findOneAndUpdateByUserId should validate alterations against operational properties", async () => {
      mockMentorProfileModel.findOneAndUpdate.mockResolvedValue(
        mockProfileRecord,
      );
      const updateData = { company: "Leapmentor Core Inc" };

      const result = await mentorProfileRepository.findOneAndUpdateByUserId(
        "user777",
        updateData,
      );

      expect(mockMentorProfileModel.findOneAndUpdate).toHaveBeenCalledWith(
        { user: "user777" },
        { $set: updateData },
        { new: true, runValidators: true },
      );
      expect(result).toEqual(mockProfileRecord);
    });

    test("saveMentorProfile should execute inner entity database updates directly", async () => {
      const fakeTrackedInstance = {
        ...mockProfileRecord,
        save: jest.fn().mockResolvedValue(mockProfileRecord),
      };

      const result =
        await mentorProfileRepository.saveMentorProfile(fakeTrackedInstance);

      expect(fakeTrackedInstance.save).toHaveBeenCalled();
      expect(result).toEqual(mockProfileRecord);
    });

    test("updateAvgRating should run atomic replacements modifying performance scores exclusively", async () => {
      mockMentorProfileModel.findOneAndUpdate.mockResolvedValue(
        mockProfileRecord,
      );

      const result = await mentorProfileRepository.updateAvgRating(
        "user777",
        4.95,
      );

      expect(mockMentorProfileModel.findOneAndUpdate).toHaveBeenCalledWith(
        { user: "user777" },
        { $set: { avgRating: 4.95 } },
        { new: true },
      );
      expect(result).toEqual(mockProfileRecord);
    });
  });
});
