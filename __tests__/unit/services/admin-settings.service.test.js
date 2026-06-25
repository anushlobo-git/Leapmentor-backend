/**
 * @fileoverview Admin Settings Service Logic Unit Tests
 */

const createAdminSettingsService = require("../../../services/admin-settings.service");
const AppError = require("../../../utils/AppError");

describe("Admin Settings Service Framework", () => {
  let mockAdminUserRepo, mockUserRepo, mockConnectRequestRepo, service;

  beforeEach(() => {
    mockAdminUserRepo = {
      findAdminByIdLean: jest.fn(),
      findAdminByEmail: jest.fn(),
      createAdmin: jest.fn(),
      updateAdminById: jest.fn(),
    };
    mockUserRepo = { countAllUsers: jest.fn() };
    mockConnectRequestRepo = { countByStatus: jest.fn() };

    service = createAdminSettingsService(
      mockAdminUserRepo,
      mockUserRepo,
      mockConnectRequestRepo,
    );
  });

  test("getOverviewService should merge database lookups into a unified metrics summary", async () => {
    mockUserRepo.countAllUsers.mockResolvedValue(500);
    mockConnectRequestRepo.countByStatus.mockResolvedValue(24);

    const result = await service.getOverviewService();
    expect(result).toEqual({ totalUsers: 500, activeSessions: 24 });
  });

  test("updateCommissionService should reject and throw an error if the rate falls outside valid boundaries", async () => {
    await expect(
      service.updateCommissionService("adm123", 150),
    ).rejects.toThrow(
      new AppError(
        "Commission rate must be a valid percentage metrics number between 0 and 100.",
        400,
      ),
    );
  });
});
