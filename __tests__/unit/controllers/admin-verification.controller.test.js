/**
 * @fileoverview Admin Mentor Verification Controller Unit Tests
 * @description Verifies validation parsing constraints, Cache-Aside telemetry tracking,
 * error propagation, automatic cache invalidations, and payload edge cases.
 */

// CRITICAL FIX: Mock catchAsync to return the promise chain so tests can reliably await its completion.
jest.mock("../../../utils/catchAsync", () => {
  return (fn) => (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);
});

const createAdminVerificationController = require("../../../controllers/admin-verification.controller");

describe("AdminVerificationController", () => {
  let mockAdminVerificationService;
  let mockCacheUtility;
  let controller;
  let req;
  let res;
  let next;

  const mockMentorsList = [
    { _id: "prof_1", mentorName: "Jane Doe", verificationStatus: "pending" },
    { _id: "prof_2", mentorName: "John Smith", verificationStatus: "pending" },
  ];
  const mockDetailData = {
    _id: "prof_123",
    bio: "Expert Architect",
    skills: ["Node.js"],
  };

  beforeEach(() => {
    // ── MOCK DEPENDENCIES
    mockAdminVerificationService = {
      getAllMentorVerificationsService: jest.fn(),
      getMentorVerificationByIdService: jest.fn(),
      verifyMentorService: jest.fn(),
      revokeMentorVerificationService: jest.fn(),
    };

    // Emulate Cache-Aside logic: execute the underlying service callback directly
    mockCacheUtility = {
      getOrSetCache: jest.fn().mockImplementation(async (key, ttl, cb) => {
        return await cb();
      }),
      evictCache: jest.fn().mockResolvedValue(true),
    };

    controller = createAdminVerificationController({
      adminVerificationService: mockAdminVerificationService,
      cacheUtility: mockCacheUtility,
    });

    // ── EXPRESS HTTP MOCKS
    req = {
      admin: { _id: "admin_master_999" },
      params: {},
      body: {},
      query: {},
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    next = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── getAllMentorVerifications ───────────────────────────────────────────
  describe("getAllMentorVerifications", () => {
    test("should return 200 and master list with accurate total count on success", async () => {
      mockAdminVerificationService.getAllMentorVerificationsService.mockResolvedValue(
        mockMentorsList,
      );

      await controller.getAllMentorVerifications(req, res, next);

      expect(mockCacheUtility.getOrSetCache).toHaveBeenCalledWith(
        "admin:verifications:master-list",
        300,
        expect.any(Function),
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        mentors: mockMentorsList,
        total: 2,
      });
      expect(next).not.toHaveBeenCalled();
    });

    test("should handle empty list arrays gracefully and calculate zero thresholds precisely", async () => {
      mockAdminVerificationService.getAllMentorVerificationsService.mockResolvedValue(
        [],
      );

      await controller.getAllMentorVerifications(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        mentors: [],
        total: 0,
      });
      expect(next).not.toHaveBeenCalled();
    });

    test("should call next(err) and withhold HTTP status updates when service throws", async () => {
      const error = new Error("Database collection lookup failed");
      mockAdminVerificationService.getAllMentorVerificationsService.mockRejectedValue(
        error,
      );

      await controller.getAllMentorVerifications(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  // ── getMentorVerificationById ───────────────────────────────────────────
  describe("getMentorVerificationById", () => {
    test("should return 200 and spread profile details using localized router keys", async () => {
      req.params.mentorProfileId = "prof_abc123";
      mockAdminVerificationService.getMentorVerificationByIdService.mockResolvedValue(
        mockDetailData,
      );

      await controller.getMentorVerificationById(req, res, next);

      expect(mockCacheUtility.getOrSetCache).toHaveBeenCalledWith(
        "admin:verifications:profile-detail:prof_abc123",
        300,
        expect.any(Function),
      );
      expect(
        mockAdminVerificationService.getMentorVerificationByIdService,
      ).toHaveBeenCalledWith("prof_abc123");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        _id: "prof_123",
        bio: "Expert Architect",
        skills: ["Node.js"],
      });
      expect(next).not.toHaveBeenCalled();
    });

    test("should call next(err) and withhold HTTP status updates when service throws", async () => {
      req.params.mentorProfileId = "prof_error";
      const error = new Error("Profile document not found");
      mockAdminVerificationService.getMentorVerificationByIdService.mockRejectedValue(
        error,
      );

      await controller.getMentorVerificationById(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  // ── verifyMentor ────────────────────────────────────────────────────────
  describe("verifyMentor", () => {
    test("should return 200, clear cache tracks, and output specific mentor name logs on success", async () => {
      req.admin._id = "admin_variant_111";
      req.params.mentorProfileId = "prof_target777";
      mockAdminVerificationService.verifyMentorService.mockResolvedValue({
        mentorName: "Alice Dev",
        mentorProfileId: "prof_target777",
        verificationStatus: "verified",
      });

      await controller.verifyMentor(req, res, next);

      expect(
        mockAdminVerificationService.verifyMentorService,
      ).toHaveBeenCalledWith("prof_target777");
      expect(mockCacheUtility.evictCache).toHaveBeenCalledWith(
        "admin:verifications:master-list",
      );
      expect(mockCacheUtility.evictCache).toHaveBeenCalledWith(
        "admin:verifications:profile-detail:prof_target777",
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Alice Dev has been verified successfully",
        mentorProfileId: "prof_target777",
        verificationStatus: "verified",
      });
      expect(next).not.toHaveBeenCalled();
    });

    test("should fall back onto default text wrappers if name fields are missing from service parameters", async () => {
      req.params.mentorProfileId = "prof_nameless";
      mockAdminVerificationService.verifyMentorService.mockResolvedValue({
        mentorName: undefined,
        mentorProfileId: "prof_nameless",
        verificationStatus: "verified",
      });

      await controller.verifyMentor(req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Mentor has been verified successfully",
        }),
      );
      expect(next).not.toHaveBeenCalled();
    });

    test("should execute successfully even if cache eviction features are omitted or unavailable", async () => {
      mockCacheUtility.evictCache = undefined;
      req.params.mentorProfileId = "prof_999";
      mockAdminVerificationService.verifyMentorService.mockResolvedValue({
        mentorProfileId: "prof_999",
        verificationStatus: "verified",
      });

      await controller.verifyMentor(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(next).not.toHaveBeenCalled();
    });

    test("should call next(err) and withhold HTTP status updates when service throws", async () => {
      req.params.mentorProfileId = "prof_failed_write";
      const error = new Error("Mongoose transaction lock abort");
      mockAdminVerificationService.verifyMentorService.mockRejectedValue(error);

      await controller.verifyMentor(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  // ── revokeMentorVerification ────────────────────────────────────────────
  describe("revokeMentorVerification", () => {
    test("should return 200, purge cache entries, and output custom confirmation statements on success", async () => {
      req.admin._id = "admin_variant_222";
      req.params.mentorProfileId = "prof_revoke555";
      mockAdminVerificationService.revokeMentorVerificationService.mockResolvedValue(
        {
          mentorName: "Bob Code",
          mentorProfileId: "prof_revoke555",
          verificationStatus: "revoked",
        },
      );

      await controller.revokeMentorVerification(req, res, next);

      expect(
        mockAdminVerificationService.revokeMentorVerificationService,
      ).toHaveBeenCalledWith("prof_revoke555");
      expect(mockCacheUtility.evictCache).toHaveBeenCalledWith(
        "admin:verifications:master-list",
      );
      expect(mockCacheUtility.evictCache).toHaveBeenCalledWith(
        "admin:verifications:profile-detail:prof_revoke555",
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Verification revoked for Bob Code",
        mentorProfileId: "prof_revoke555",
        verificationStatus: "revoked",
      });
      expect(next).not.toHaveBeenCalled();
    });

    test("should fall back onto default text strings if name metrics are absent inside service states", async () => {
      req.params.mentorProfileId = "prof_falsy";
      mockAdminVerificationService.revokeMentorVerificationService.mockResolvedValue(
        {
          mentorName: "",
          mentorProfileId: "prof_falsy",
          verificationStatus: "revoked",
        },
      );

      await controller.revokeMentorVerification(req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Verification revoked for mentor",
        }),
      );
      expect(next).not.toHaveBeenCalled();
    });

    test("should call next(err) and withhold HTTP status updates when service throws", async () => {
      req.params.mentorProfileId = "prof_fail";
      const error = new Error("Write permission denied");
      mockAdminVerificationService.revokeMentorVerificationService.mockRejectedValue(
        error,
      );

      await controller.revokeMentorVerification(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
    });
  });
});
