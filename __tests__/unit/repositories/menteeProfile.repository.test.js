/**
 * @fileoverview Mentee Profile Repository Corporate Unit Tests
 * @description Assures precise verification of lookup criteria, lean query builders,
 * multi-stage subdocument populations, and mutation wrappers using isolated driver mocks.
 */

const createMenteeProfileRepository = require("../../../repositories/menteeProfile.repository");

describe("MenteeProfile Repository", () => {
  let mockMenteeProfileModel;
  let menteeProfileRepository;

  const mockProfileRecord = {
    _id: "profile001",
    user: "user123",
    currentRole: "Software Engineer Intern",
    company: "Leapmentor",
    skills: ["JavaScript", "Node.js"],
    isProfileComplete: true,
    isProfilePublished: true,
  };

  const mockRecordsArray = [mockProfileRecord];

  // Safe Factory: Decorates a real Promise instance to completely avoid "manual then" linter errors
  const makeChain = (resolvedValue = null) => {
    const promise = Promise.resolve(resolvedValue);

    // Attach Mongoose chain builders directly to the native Promise, returning itself for fluid chaining
    promise.select = jest.fn().mockReturnValue(promise);
    promise.populate = jest.fn().mockReturnValue(promise);
    promise.lean = jest
      .fn()
      .mockImplementation(() => Promise.resolve(resolvedValue));

    return promise;
  };

  beforeEach(() => {
    mockMenteeProfileModel = {
      find: jest.fn(),
      findOne: jest.fn(),
      findOneAndDelete: jest.fn(),
      create: jest.fn(),
      findOneAndUpdate: jest.fn(),
    };
    menteeProfileRepository = createMenteeProfileRepository(
      mockMenteeProfileModel,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── COLLECTION QUERIES WITH FILTERS ─────────────────────────────────────
  describe("Collection Queries With Filters", () => {
    test("findMenteeProfilesByUserIds should execute find tracking precise selection projections", async () => {
      const mockChain = makeChain(mockRecordsArray);
      mockMenteeProfileModel.find.mockReturnValue(mockChain);
      const userIds = ["user123", "user456"];

      const result =
        await menteeProfileRepository.findMenteeProfilesByUserIds(userIds);

      expect(mockMenteeProfileModel.find).toHaveBeenCalledWith({
        user: { $in: userIds },
      });
      expect(mockChain.select).toHaveBeenCalledWith(
        "user isProfileComplete isProfilePublished",
      );
      expect(mockChain.lean).toHaveBeenCalled();
      expect(result).toEqual(mockRecordsArray);
    });

    test("findMenteeProfilesByUserIdsFull should include extensive profile details in the selection fields", async () => {
      const mockChain = makeChain(mockRecordsArray);
      mockMenteeProfileModel.find.mockReturnValue(mockChain);
      const userIds = ["user123"];

      const result =
        await menteeProfileRepository.findMenteeProfilesByUserIdsFull(userIds);

      expect(mockMenteeProfileModel.find).toHaveBeenCalledWith({
        user: { $in: userIds },
      });
      expect(mockChain.select).toHaveBeenCalledWith(
        "user currentRole company profilePicture skills bio interestedFields isProfileComplete isProfilePublished",
      );
      expect(mockChain.lean).toHaveBeenCalled();
      expect(result).toEqual(mockRecordsArray);
    });
  });

  // ── SINGULAR LOOKUPS & POPULATIONS ──────────────────────────────────────
  describe("Singular Lookups & Populations", () => {
    test("findMenteeProfileByUserId should locate a profile map using plain lean optimization", async () => {
      const mockChain = makeChain(mockProfileRecord);
      mockMenteeProfileModel.findOne.mockReturnValue(mockChain);

      const result =
        await menteeProfileRepository.findMenteeProfileByUserId("user123");

      expect(mockMenteeProfileModel.findOne).toHaveBeenCalledWith({
        user: "user123",
      });
      expect(mockChain.lean).toHaveBeenCalled();
      expect(result).toEqual(mockProfileRecord);
    });

    test("findMenteeProfile should request a curated subset of biographical projection keys", async () => {
      const mockChain = makeChain(mockProfileRecord);
      mockMenteeProfileModel.findOne.mockReturnValue(mockChain);

      const result = await menteeProfileRepository.findMenteeProfile("user123");

      expect(mockMenteeProfileModel.findOne).toHaveBeenCalledWith({
        user: "user123",
      });
      expect(mockChain.select).toHaveBeenCalledWith(
        "currentRole company profilePicture skills bio interestedFields",
      );
      expect(mockChain.lean).toHaveBeenCalled();
      expect(result).toEqual(mockProfileRecord);
    });

    test("findByUserId should return the raw unchained document query match", async () => {
      mockMenteeProfileModel.findOne.mockResolvedValue(mockProfileRecord);

      const result = await menteeProfileRepository.findByUserId("user123");

      expect(mockMenteeProfileModel.findOne).toHaveBeenCalledWith({
        user: "user123",
      });
      expect(result).toEqual(mockProfileRecord);
    });

    test("findByUserIdWithAccountInfo should extend queries to pull parent identity credentials", async () => {
      const mockChain = makeChain(mockProfileRecord);
      mockMenteeProfileModel.findOne.mockReturnValue(mockChain);

      const result =
        await menteeProfileRepository.findByUserIdWithAccountInfo("user123");

      expect(mockMenteeProfileModel.findOne).toHaveBeenCalledWith({
        user: "user123",
      });
      expect(mockChain.populate).toHaveBeenCalledWith(
        "user",
        "name email isEmailVerified",
      );
      expect(result).toEqual(mockProfileRecord);
    });

    test("findPublishedByUserId should enforce publication criteria restrictions during account lookups", async () => {
      const mockChain = makeChain(mockProfileRecord);
      mockMenteeProfileModel.findOne.mockReturnValue(mockChain);

      const result =
        await menteeProfileRepository.findPublishedByUserId("user123");

      expect(mockMenteeProfileModel.findOne).toHaveBeenCalledWith({
        user: "user123",
        isProfilePublished: true,
      });
      expect(mockChain.populate).toHaveBeenCalledWith("user", "name email");
      expect(result).toEqual(mockProfileRecord);
    });
  });

  // ── DATA MUTATIONS & WRITE ACTIONS ──────────────────────────────────────
  describe("Data Mutations & Write Actions", () => {
    test("deleteMenteeProfileByUserId should immediately deploy native removal criteria hooks", async () => {
      mockMenteeProfileModel.findOneAndDelete.mockResolvedValue(
        mockProfileRecord,
      );

      const result =
        await menteeProfileRepository.deleteMenteeProfileByUserId("user123");

      expect(mockMenteeProfileModel.findOneAndDelete).toHaveBeenCalledWith({
        user: "user123",
      });
      expect(result).toEqual(mockProfileRecord);
    });

    test("create should persist structural data schemas directly down to the persistence tier", async () => {
      mockMenteeProfileModel.create.mockResolvedValue(mockProfileRecord);
      const incomingPayload = { user: "user123", skills: ["JavaScript"] };

      const result = await menteeProfileRepository.create(incomingPayload);

      expect(mockMenteeProfileModel.create).toHaveBeenCalledWith(
        incomingPayload,
      );
      expect(result).toEqual(mockProfileRecord);
    });

    test("findOneAndUpdateByUserId should execute modifications alongside strict validation controls", async () => {
      mockMenteeProfileModel.findOneAndUpdate.mockResolvedValue(
        mockProfileRecord,
      );
      const updateData = { company: "Leapmentor Inc" };

      const result = await menteeProfileRepository.findOneAndUpdateByUserId(
        "user123",
        updateData,
      );

      expect(mockMenteeProfileModel.findOneAndUpdate).toHaveBeenCalledWith(
        { user: "user123" },
        { $set: updateData },
        { new: true, runValidators: true },
      );
      expect(result).toEqual(mockProfileRecord);
    });
  });
});
