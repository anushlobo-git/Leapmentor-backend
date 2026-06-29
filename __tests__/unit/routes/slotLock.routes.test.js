/**
 * @fileoverview Concurrent Session Slot Locking System Router Unit Tests
 * @description Assures explicit alignment of HTTP methods, global authentication fences,
 * celebrate parameter constraints layers, and sequence cascades completely in memory.
 */

const createSlotLockRoutes = require("../../../routes/slotLock.routes");

// Isolate the global express router layer to monitor endpoint registration hooks
const mockRouter = {
  use: jest.fn(),
  post: jest.fn(),
  get: jest.fn(),
};

jest.mock("express", () => ({
  Router: () => mockRouter,
}));

describe("Concurrent Slot Locking Router Configuration Matrix", () => {
  let mockSlotLockController;
  let mockAuthenticate;
  let mockValidations;

  beforeEach(() => {
    mockSlotLockController = {
      lockSlot: jest.fn(),
      unlockSlot: jest.fn(),
      unlockAllByMentee: jest.fn(),
      getActiveLocks: jest.fn(),
    };

    mockAuthenticate = jest.fn();

    mockValidations = {
      lockSlotValidation: "celebrate_lock_slot_shield",
      unlockSlotValidation: "celebrate_unlock_slot_shield",
      unlockAllValidation: "celebrate_unlock_all_slots_shield",
      mentorIdParamValidation: "celebrate_mentor_id_param_shield",
    };

    // Instantiate using the destructured Named Parameter configuration object
    createSlotLockRoutes({
      slotLockController: mockSlotLockController,
      authenticate: mockAuthenticate,
      validations: mockValidations,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Security Firewall Verification", () => {
    test("should mount mandatory passport identity validation checks immediately across all downstreams", () => {
      expect(mockRouter.use).toHaveBeenCalledWith(mockAuthenticate);
    });
  });

  describe("Scheduling Guardrails Operational Endpoint Mappings", () => {
    test("should bind session time segment retention rules to payload shields using POST", () => {
      expect(mockRouter.post).toHaveBeenCalledWith(
        "/lock",
        "celebrate_lock_slot_shield",
        mockSlotLockController.lockSlot,
      );
    });

    test("should bind explicit allocation release triggers to payload shields using POST", () => {
      expect(mockRouter.post).toHaveBeenCalledWith(
        "/unlock",
        "celebrate_unlock_slot_shield",
        mockSlotLockController.unlockSlot,
      );
    });

    test("should bind bulk transactional timeout clearing blocks to payload shields using POST", () => {
      expect(mockRouter.post).toHaveBeenCalledWith(
        "/unlock-all",
        "celebrate_unlock_all_slots_shield",
        mockSlotLockController.unlockAllByMentee,
      );
    });

    test("should bind live availability lock inventory lookups to mentor parameter shields using GET", () => {
      expect(mockRouter.get).toHaveBeenCalledWith(
        "/:mentorId",
        "celebrate_mentor_id_param_shield",
        mockSlotLockController.getActiveLocks,
      );
    });
  });
});
