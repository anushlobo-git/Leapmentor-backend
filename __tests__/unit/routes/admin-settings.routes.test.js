/**
 * @fileoverview Admin Settings Routes Configuration Mappings Tests
 */

const createAdminSettingsRoutes = require("../../../routes/admin-settings.routes");
const {
  addAdminBodyValidation,
} = require("../../../validations/admin-settings.validation");

const mockRouter = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  use: jest.fn(),
};
jest.mock("express", () => ({ Router: () => mockRouter }));

describe("Admin Settings Router Architecture", () => {
  test("should map endpoints and validation schemas predictably onto the Express pipeline", () => {
    const mockCtrl = {
      getOverview: jest.fn(),
      addAdmin: jest.fn(),
      changePassword: jest.fn(),
      getCommission: jest.fn(),
      updateCommission: jest.fn(),
    };
    const mockAuth = jest.fn();

    createAdminSettingsRoutes(mockCtrl, mockAuth);
    expect(mockRouter.use).toHaveBeenCalledWith(mockAuth);
    expect(mockRouter.post).toHaveBeenCalledWith(
      "/add-admin",
      addAdminBodyValidation,
      mockCtrl.addAdmin,
    );
  });
});
