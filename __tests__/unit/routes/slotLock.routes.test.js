/**
 * @fileoverview Slot Lock Router Registration Unit Tests
 * @description Verifies method assignments, path constraints strings, and sequential middleware cascades in memory.
 */

const createSlotLockRoutes = require("../../../routes/slotLock.routes");

const mockRouter = {
  use: jest.fn(),
  get: jest.fn(),
  post: jest.fn(),
};
jest.mock("express", () => ({ Router: () => mockRouter }));

describe("Slot Lock Router Unit Tests", () => {
  test("should assert endpoint layouts mount appropriate celebrate constraints layers", () => {
    const mockController = { lockSlot: "c_lock", getActiveLocks: "c_get" };
    const mockValidations = {
      lockSlotValidation: "v_lock",
      unlockSlotValidation: "v_unlock",
      unlockAllValidation: "v_all",
      mentorIdParamValidation: "v_param",
    };

    createSlotLockRoutes(
      mockController,
      "auth_passport_guard",
      mockValidations,
    );

    expect(mockRouter.use).toHaveBeenCalledWith("auth_passport_guard");
    expect(mockRouter.post).toHaveBeenCalledWith("/lock", "v_lock", "c_lock");
    expect(mockRouter.get).toHaveBeenCalledWith(
      "/:mentorId",
      "v_param",
      "c_get",
    );
  });
});
