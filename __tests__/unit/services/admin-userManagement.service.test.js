/**
 * @fileoverview Admin User Management Service Corporate Unit Tests
 * @description Validates transactional data cascades, list filters, cross-repository
 * relational aggregates, and boundary error codes with zero real database access.
 */

const createAdminUserManagementService = require("../../../services/admin-users.service");
const AppError = require("../../../utils/AppError");

// Stub layout mappers to eliminate secondary integration complexity
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

  const mockUserRecord = {
    _id: "user123",
    name: "Bob Martin",
    roles: ["mentor"],
  };

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

    userManagementService = createAdminUserManagementService(
      mockUserRepository,
      mockMentorProfileRepository,
      mockMenteeProfileRepository,
      mockConnectRequestRepository,
    );
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
    });

    test("should append regex rules for non-empty search criteria inputs", async () => {
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
  });

  // ── getUserDetailService ────────────────────────────────────────────────
  describe("getUserDetailService", () => {
    test("should compile mentor detail structures if the target role matches", async () => {
      mockUserRepository.findUserById.mockResolvedValue(mockUserRecord);
      mockMentorProfileRepository.findMentorProfileByUserId.mockResolvedValue({
        user: "user123",
      });
      mockConnectRequestRepository.countCompletedSessionsByUser.mockResolvedValue(
        15,
      );

      const result =
        await userManagementService.getUserDetailService("user123");

      expect(mockUserRepository.findUserById).toHaveBeenCalledWith("user123");
      expect(
        mockMentorProfileRepository.findMentorProfileByUserId,
      ).toHaveBeenCalledWith("user123");
      expect(result).toEqual({
        user: {
          userDTO: true,
          _id: "user123",
          name: "Bob Martin",
          roles: ["mentor"],
        },
        profile: { mentorDTO: true, user: "user123" },
        sessionCount: 15,
      });
    });

    test("should throw a 404 AppError if the individual record is absent", async () => {
      mockUserRepository.findUserById.mockResolvedValue(null);

      await expect(
        userManagementService.getUserDetailService("missing"),
      ).rejects.toThrow(AppError);
    });
  });

  // ── deleteUserService ───────────────────────────────────────────────────
  describe("deleteUserService", () => {
    test("should execute a sweeping transactional data cascade across all matching domain vectors", async () => {
      mockUserRepository.findUserByIdRaw.mockResolvedValue({
        name: "Bob",
        email: "bob@test.com",
      });

      const result = await userManagementService.deleteUserService("user123");

      expect(mockUserRepository.findUserByIdRaw).toHaveBeenCalledWith(
        "user123",
      );
      expect(mockUserRepository.deleteUserById).toHaveBeenCalledWith("user123");
      expect(
        mockMentorProfileRepository.deleteMentorProfileByUserId,
      ).toHaveBeenCalledWith("user123");
      expect(
        mockMenteeProfileRepository.deleteMenteeProfileByUserId,
      ).toHaveBeenCalledWith("user123");
      expect(
        mockConnectRequestRepository.deleteManyByUser,
      ).toHaveBeenCalledWith("user123");
      expect(result).toEqual({ name: "Bob", email: "bob@test.com" });
    });

    test("should stop cascading operations and throw a 404 error if user search fails", async () => {
      mockUserRepository.findUserByIdRaw.mockResolvedValue(null);

      await expect(
        userManagementService.deleteUserService("absent"),
      ).rejects.toThrow(AppError);
      expect(mockUserRepository.deleteUserById).not.toHaveBeenCalled();
    });
  });

  // ── blockUserService & unblockUserService ───────────────────────────────
  describe("blockUserService and unblockUserService status utilities", () => {
    test("blockUserService should return the target descriptor upon modifications", async () => {
      mockUserRepository.blockUser.mockResolvedValue({ name: "Blocked User" });
      const result = await userManagementService.blockUserService("u1");
      expect(result).toEqual({ name: "Blocked User" });
    });

    test("unblockUserService should bubble up exceptions if target identifier is missing", async () => {
      mockUserRepository.unblockUser.mockResolvedValue(null);
      await expect(
        userManagementService.unblockUserService("missing"),
      ).rejects.toThrow(AppError);
    });
  });
});
