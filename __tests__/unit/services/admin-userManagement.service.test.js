/**
 * @fileoverview Admin User Management Service Unit Tests
 * @description Validates transactional data cascades, list filters, cross-repository
 * relational aggregates, and boundary error codes with zero real database access.
 */

const createAdminUserManagementService = require("../../../services/admin-users.service");
const AppError = require("../../../utils/AppError");

// Mappers are imported directly inside the service, so jest.mock works here
jest.mock("../../../mappers/user.mapper", () => ({
  toUserDTO: jest.fn((u) => ({
    userDTO: true,
    _id: u._id,
    name: u.name,
    roles: u.roles,
  })),
}));
jest.mock("../../../mappers/mentorProfile.mapper", () => ({
  toMentorProfileDTO: jest.fn((p) => ({ mentorDTO: true, user: p.user })),
}));
jest.mock("../../../mappers/menteeProfile.mapper", () => ({
  toMenteeProfileDTO: jest.fn((p) => ({ menteeDTO: true, user: p.user })),
}));

describe("AdminUserManagement Service", () => {
  let mockUserRepository;
  let mockMentorProfileRepository;
  let mockMenteeProfileRepository;
  let mockConnectRequestRepository;
  let userManagementService;

  const mockMentorUser = { _id: "u1", name: "Bob Martin", roles: ["mentor"] };
  const mockMenteeUser = { _id: "u2", name: "Alice Smith", roles: ["mentee"] };

  beforeEach(() => {
    mockUserRepository = {
      countUsersWithFilter: jest.fn(),
      findUsers: jest.fn(),
      findUserById: jest.fn(),
      findUserByIdRaw: jest.fn(),
      deleteUserById: jest.fn(),
      blockUser: jest.fn(),
      unblockUser: jest.fn(),
    };
    mockMentorProfileRepository = {
      findMentorProfilesByUserIds: jest.fn(),
      findMentorProfileByUserId: jest.fn(),
      deleteMentorProfileByUserId: jest.fn(),
    };
    mockMenteeProfileRepository = {
      findMenteeProfilesByUserIds: jest.fn(),
      findMenteeProfileByUserId: jest.fn(),
      deleteMenteeProfileByUserId: jest.fn(),
    };
    mockConnectRequestRepository = {
      countCompletedSessionsByUser: jest.fn(),
      deleteManyByUser: jest.fn(),
    };

    // ✅ Correct instantiation — matches the destructured signature
    userManagementService = createAdminUserManagementService({
      userRepository: mockUserRepository,
      mentorProfileRepository: mockMentorProfileRepository,
      menteeProfileRepository: mockMenteeProfileRepository,
      connectRequestRepository: mockConnectRequestRepository,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── getUsersService ─────────────────────────────────────────────────────
  describe("getUsersService", () => {
    test("should retrieve users, construct lookups, and merge relational profiles seamlessly", async () => {
      const mockUsers = [
        { _id: "u1", name: "Mentor User", roles: ["mentor"] },
        { _id: "u2", name: "Mentee User", roles: ["mentee"] },
      ];
      mockUserRepository.countUsersWithFilter.mockResolvedValue(2);
      mockUserRepository.findUsers.mockResolvedValue(mockUsers);
      mockMentorProfileRepository.findMentorProfilesByUserIds.mockResolvedValue(
        [{ user: "u1" }],
      );
      mockMenteeProfileRepository.findMenteeProfilesByUserIds.mockResolvedValue(
        [{ user: "u2" }],
      );

      const result = await userManagementService.getUsersService({
        page: 1,
        limit: 10,
      });

      expect(mockUserRepository.countUsersWithFilter).toHaveBeenCalledWith({
        isDeleted: { $ne: true },
      });
      expect(mockUserRepository.findUsers).toHaveBeenCalledWith(
        { isDeleted: { $ne: true } },
        { skip: 0, limit: 10 },
      );
      expect(result.users).toEqual([
        {
          userDTO: true,
          _id: "u1",
          name: "Mentor User",
          roles: ["mentor"],
          profile: { mentorDTO: true, user: "u1" },
        },
        {
          userDTO: true,
          _id: "u2",
          name: "Mentee User",
          roles: ["mentee"],
          profile: { menteeDTO: true, user: "u2" },
        },
      ]);
      expect(result.pagination).toEqual({
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });

    test("should set isDeleted: true when deleted param is 'true'", async () => {
      // Branch: deleted === "true" ? true : { $ne: true }
      mockUserRepository.countUsersWithFilter.mockResolvedValue(0);
      mockUserRepository.findUsers.mockResolvedValue([]);
      mockMentorProfileRepository.findMentorProfilesByUserIds.mockResolvedValue(
        [],
      );
      mockMenteeProfileRepository.findMenteeProfilesByUserIds.mockResolvedValue(
        [],
      );

      await userManagementService.getUsersService({ deleted: "true" });

      expect(mockUserRepository.countUsersWithFilter).toHaveBeenCalledWith(
        expect.objectContaining({ isDeleted: true }),
      );
    });

    test("should apply role filter when a valid role is provided", async () => {
      // Branch: if (role && ["mentor", "mentee"].includes(role))
      mockUserRepository.countUsersWithFilter.mockResolvedValue(0);
      mockUserRepository.findUsers.mockResolvedValue([]);
      mockMentorProfileRepository.findMentorProfilesByUserIds.mockResolvedValue(
        [],
      );
      mockMenteeProfileRepository.findMenteeProfilesByUserIds.mockResolvedValue(
        [],
      );

      await userManagementService.getUsersService({ role: "mentor" });

      expect(mockUserRepository.countUsersWithFilter).toHaveBeenCalledWith(
        expect.objectContaining({ roles: "mentor" }),
      );
    });

    test("should not apply role filter when an invalid role is provided", async () => {
      // Branch: role provided but not in ["mentor", "mentee"]
      mockUserRepository.countUsersWithFilter.mockResolvedValue(0);
      mockUserRepository.findUsers.mockResolvedValue([]);
      mockMentorProfileRepository.findMentorProfilesByUserIds.mockResolvedValue(
        [],
      );
      mockMenteeProfileRepository.findMenteeProfilesByUserIds.mockResolvedValue(
        [],
      );

      await userManagementService.getUsersService({ role: "admin" });

      const calledFilter =
        mockUserRepository.countUsersWithFilter.mock.calls[0][0];
      expect(calledFilter.roles).toBeUndefined();
    });

    test("should append regex rules for non-empty search criteria inputs", async () => {
      // Branch: if (search?.trim())
      mockUserRepository.countUsersWithFilter.mockResolvedValue(0);
      mockUserRepository.findUsers.mockResolvedValue([]);
      mockMentorProfileRepository.findMentorProfilesByUserIds.mockResolvedValue(
        [],
      );
      mockMenteeProfileRepository.findMenteeProfilesByUserIds.mockResolvedValue(
        [],
      );

      await userManagementService.getUsersService({ search: " Martin " });

      expect(mockUserRepository.countUsersWithFilter).toHaveBeenCalledWith(
        expect.objectContaining({
          $or: [{ name: /Martin/i }, { email: /Martin/i }],
        }),
      );
    });

    test("should skip search filter when search is blank", async () => {
      mockUserRepository.countUsersWithFilter.mockResolvedValue(0);
      mockUserRepository.findUsers.mockResolvedValue([]);
      mockMentorProfileRepository.findMentorProfilesByUserIds.mockResolvedValue(
        [],
      );
      mockMenteeProfileRepository.findMenteeProfilesByUserIds.mockResolvedValue(
        [],
      );

      await userManagementService.getUsersService({ search: "   " });

      const calledFilter =
        mockUserRepository.countUsersWithFilter.mock.calls[0][0];
      expect(calledFilter.$or).toBeUndefined();
    });

    test("should set profile to null when user has no matching mentor or mentee profile", async () => {
      // Branch: mentorMap[id] || menteeMap[id] || null
      const mockUsers = [{ _id: "u3", name: "No Profile User", roles: [] }];
      mockUserRepository.countUsersWithFilter.mockResolvedValue(1);
      mockUserRepository.findUsers.mockResolvedValue(mockUsers);
      mockMentorProfileRepository.findMentorProfilesByUserIds.mockResolvedValue(
        [],
      );
      mockMenteeProfileRepository.findMenteeProfilesByUserIds.mockResolvedValue(
        [],
      );

      const result = await userManagementService.getUsersService({});

      expect(result.users[0].profile).toBeNull();
    });
  });

  // ── getUserDetailService ────────────────────────────────────────────────
  describe("getUserDetailService", () => {
    test("should compile mentor detail structures if the target role matches", async () => {
      mockUserRepository.findUserById.mockResolvedValue(mockMentorUser);
      mockMentorProfileRepository.findMentorProfileByUserId.mockResolvedValue({
        user: "u1",
      });
      mockConnectRequestRepository.countCompletedSessionsByUser.mockResolvedValue(
        15,
      );

      const result = await userManagementService.getUserDetailService("u1");

      expect(
        mockMentorProfileRepository.findMentorProfileByUserId,
      ).toHaveBeenCalledWith("u1");
      expect(
        mockMenteeProfileRepository.findMenteeProfileByUserId,
      ).not.toHaveBeenCalled();
      expect(result).toEqual({
        user: {
          userDTO: true,
          _id: "u1",
          name: "Bob Martin",
          roles: ["mentor"],
        },
        profile: { mentorDTO: true, user: "u1" },
        sessionCount: 15,
      });
    });

    test("should compile mentee detail structures if the target role is mentee", async () => {
      // Branch: isMentor === false → use menteeProfileRepository
      mockUserRepository.findUserById.mockResolvedValue(mockMenteeUser);
      mockMenteeProfileRepository.findMenteeProfileByUserId.mockResolvedValue({
        user: "u2",
      });
      mockConnectRequestRepository.countCompletedSessionsByUser.mockResolvedValue(
        3,
      );

      const result = await userManagementService.getUserDetailService("u2");

      expect(
        mockMenteeProfileRepository.findMenteeProfileByUserId,
      ).toHaveBeenCalledWith("u2");
      expect(
        mockMentorProfileRepository.findMentorProfileByUserId,
      ).not.toHaveBeenCalled();
      expect(result.profile).toEqual({ menteeDTO: true, user: "u2" });
    });

    test("should throw a 404 AppError if the individual record is absent", async () => {
      mockUserRepository.findUserById.mockResolvedValue(null);

      await expect(
        userManagementService.getUserDetailService("missing"),
      ).rejects.toMatchObject({ statusCode: 404, message: "User not found." });
    });
  });

  // ── deleteUserService ───────────────────────────────────────────────────
  describe("deleteUserService", () => {
    test("should execute a sweeping transactional data cascade across all matching domain vectors", async () => {
      mockUserRepository.findUserByIdRaw.mockResolvedValue({
        name: "Bob",
        email: "bob@test.com",
      });

      const result = await userManagementService.deleteUserService("u1");

      expect(mockUserRepository.deleteUserById).toHaveBeenCalledWith("u1");
      expect(
        mockMentorProfileRepository.deleteMentorProfileByUserId,
      ).toHaveBeenCalledWith("u1");
      expect(
        mockMenteeProfileRepository.deleteMenteeProfileByUserId,
      ).toHaveBeenCalledWith("u1");
      expect(
        mockConnectRequestRepository.deleteManyByUser,
      ).toHaveBeenCalledWith("u1");
      expect(result).toEqual({ name: "Bob", email: "bob@test.com" });
    });

    test("should stop cascading operations and throw a 404 error if user is not found", async () => {
      mockUserRepository.findUserByIdRaw.mockResolvedValue(null);

      await expect(
        userManagementService.deleteUserService("absent"),
      ).rejects.toMatchObject({ statusCode: 404, message: "User not found." });
      expect(mockUserRepository.deleteUserById).not.toHaveBeenCalled();
    });
  });

  // ── blockUserService ────────────────────────────────────────────────────
  describe("blockUserService", () => {
    test("should return user name upon successful block", async () => {
      mockUserRepository.blockUser.mockResolvedValue({ name: "Blocked User" });

      const result = await userManagementService.blockUserService("u1");

      expect(result).toEqual({ name: "Blocked User" });
    });

    test("should throw 404 if blockUser returns null", async () => {
      // Branch: if (!user) throw AppError
      mockUserRepository.blockUser.mockResolvedValue(null);

      await expect(
        userManagementService.blockUserService("missing"),
      ).rejects.toMatchObject({ statusCode: 404, message: "User not found." });
    });
  });

  // ── unblockUserService ──────────────────────────────────────────────────
  describe("unblockUserService", () => {
    test("should return user name upon successful unblock", async () => {
      mockUserRepository.unblockUser.mockResolvedValue({
        name: "Unblocked User",
      });

      const result = await userManagementService.unblockUserService("u1");

      expect(result).toEqual({ name: "Unblocked User" });
    });

    test("should throw 404 if unblockUser returns null", async () => {
      // Branch: if (!user) throw AppError
      mockUserRepository.unblockUser.mockResolvedValue(null);

      await expect(
        userManagementService.unblockUserService("missing"),
      ).rejects.toMatchObject({ statusCode: 404, message: "User not found." });
    });
  });
});
