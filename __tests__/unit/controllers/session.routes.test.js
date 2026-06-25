/**
 * @fileoverview Session Router Unit Tests
 * @description Confirms application paths mapping structures, validation filters configuration strings,
 * and sequence orchestration barriers completely in memory.
 */

const createSessionRoutes = require("../../../routes/session.routes");

// Intercept global express methods to track internal routing registry sequences
const mockRouter = {
  use: jest.fn(),
  get: jest.fn(),
  post: jest.fn(),
  patch: jest.fn(),
};
jest.mock("express", () => ({
  Router: () => mockRouter,
}));

describe("Session Router Engine Unit Tests", () => {
  let mockController, mockAuthenticate, mockValidations;

  beforeEach(() => {
    mockController = {
      getSlots: "c_get_slots",
      getMentorAvailability: "c_get_avail",
      setMeetingLink: "c_set_link",
      markSlotComplete: "c_mark_comp",
      addSlot: "c_add_slot",
      cancelSlot: "c_cancel",
      rescheduleSlot: "c_reschedule",
    };

    mockAuthenticate = "middleware_passport_jwt_shield";

    mockValidations = {
      getSlotsValidation: "v_slots",
      getMentorAvailabilityValidation: "v_avail",
      setMeetingLinkValidation: "v_link",
      slotIndexParamValidation: "v_index",
      addSlotValidation: "v_add",
      cancelSlotValidation: "v_cancel",
      rescheduleSlotValidation: "v_reschedule",
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("should assert global session authorization barriers are mounted immediately at the head of the thread", () => {
    createSessionRoutes(mockController, mockAuthenticate, mockValidations);

    expect(mockRouter.use).toHaveBeenCalledWith(
      "middleware_passport_jwt_shield",
    );
  });

  test("should mount structural query paths mapping correct data shielding configurations", () => {
    createSessionRoutes(mockController, mockAuthenticate, mockValidations);

    expect(mockRouter.get).toHaveBeenCalledWith(
      "/:connectRequestId/slots",
      "v_slots",
      "c_get_slots",
    );
    expect(mockRouter.get).toHaveBeenCalledWith(
      "/:connectRequestId/mentor-availability",
      "v_avail",
      "c_get_avail",
    );
  });

  test("should bind patch and post mutation modifiers to appropriate validation layers", () => {
    createSessionRoutes(mockController, mockAuthenticate, mockValidations);

    expect(mockRouter.patch).toHaveBeenCalledWith(
      "/:connectRequestId/slots/:slotIndex/meeting-link",
      "v_link",
      "c_set_link",
    );
    expect(mockRouter.patch).toHaveBeenCalledWith(
      "/:connectRequestId/slots/:slotIndex/mark-complete",
      "v_index",
      "c_mark_comp",
    );
    expect(mockRouter.post).toHaveBeenCalledWith(
      "/:connectRequestId/add-slot",
      "v_add",
      "c_add_slot",
    );
    expect(mockRouter.patch).toHaveBeenCalledWith(
      "/:connectRequestId/slots/:slotIndex/cancel",
      "v_cancel",
      "c_cancel",
    );
    expect(mockRouter.patch).toHaveBeenCalledWith(
      "/:connectRequestId/slots/:slotIndex/reschedule",
      "v_reschedule",
      "c_reschedule",
    );
  });
});
