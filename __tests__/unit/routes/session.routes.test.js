/**
 * @fileoverview Session Workflow Router Unit Tests
 * @description Assures valid alignment of HTTP methods, global passport identity walls,
 * celebrate parameter/body validation checks, and route matching sequences in memory.
 */

const createSessionRoutes = require("../../../routes/session.routes");

// Isolate the global express router layer to monitor endpoint registration hooks
const mockRouter = {
  use: jest.fn(),
  get: jest.fn(),
  post: jest.fn(),
  patch: jest.fn(),
};

jest.mock("express", () => ({
  Router: () => mockRouter,
}));

describe("Session Workflow Router Configuration Matrix", () => {
  let mockSessionController;
  let mockAuthenticate;
  let mockValidations;

  beforeEach(() => {
    mockSessionController = {
      getSlots: jest.fn(),
      getMentorAvailability: jest.fn(),
      setMeetingLink: jest.fn(),
      markSlotComplete: jest.fn(),
      addSlot: jest.fn(),
      cancelSlot: jest.fn(),
      rescheduleSlot: jest.fn(),
    };

    mockAuthenticate = jest.fn();

    mockValidations = {
      getSlotsValidation: "celebrate_get_slots_shield",
      setMeetingLinkValidation: "celebrate_set_meeting_link_shield",
      slotIndexParamValidation: "celebrate_slot_index_param_shield",
      addSlotValidation: "celebrate_add_slot_shield",
      cancelSlotValidation: "celebrate_cancel_slot_shield",
      rescheduleSlotValidation: "celebrate_reschedule_slot_shield",
      getMentorAvailabilityValidation: "celebrate_mentor_availability_shield",
    };

    // Instantiate using destructured configuration arguments
    createSessionRoutes({
      sessionController: mockSessionController,
      authenticate: mockAuthenticate,
      validations: mockValidations,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Security Firewall Gateways", () => {
    test("should mount mandatory passport identity validation immediately at the root threshold", () => {
      expect(mockRouter.use).toHaveBeenCalledWith(mockAuthenticate);
    });
  });

  describe("Session Scheduling Queries & Operational Mappings", () => {
    test("should bind session slot retrieval to target validation guards using GET", () => {
      expect(mockRouter.get).toHaveBeenCalledWith(
        "/:connectRequestId/slots",
        "celebrate_get_slots_shield",
        mockSessionController.getSlots,
      );
    });

    test("should bind mentor calendar availability lookups to validation guards using GET", () => {
      expect(mockRouter.get).toHaveBeenCalledWith(
        "/:connectRequestId/mentor-availability",
        "celebrate_mentor_availability_shield",
        mockSessionController.getMentorAvailability,
      );
    });

    test("should bind dynamic meeting URL updates to specific slot index filters using PATCH", () => {
      expect(mockRouter.patch).toHaveBeenCalledWith(
        "/:connectRequestId/slots/:slotIndex/meeting-link",
        "celebrate_set_meeting_link_shield",
        mockSessionController.setMeetingLink,
      );
    });

    test("should bind session step closures to specific slot index parameter shields using PATCH", () => {
      expect(mockRouter.patch).toHaveBeenCalledWith(
        "/:connectRequestId/slots/:slotIndex/mark-complete",
        "celebrate_slot_index_param_shield",
        mockSessionController.markSlotComplete,
      );
    });

    test("should bind scheduling add-on proposals to appropriate payload check shields using POST", () => {
      expect(mockRouter.post).toHaveBeenCalledWith(
        "/:connectRequestId/add-slot",
        "celebrate_add_slot_shield",
        mockSessionController.addSlot,
      );
    });

    test("should bind slot cancellation triggers to index path check shields using PATCH", () => {
      expect(mockRouter.patch).toHaveBeenCalledWith(
        "/:connectRequestId/slots/:slotIndex/cancel",
        "celebrate_cancel_slot_shield",
        mockSessionController.cancelSlot,
      );
    });

    test("should bind slot rescheduling vectors to index path check shields using PATCH", () => {
      expect(mockRouter.patch).toHaveBeenCalledWith(
        "/:connectRequestId/slots/:slotIndex/reschedule",
        "celebrate_reschedule_slot_shield",
        mockSessionController.rescheduleSlot,
      );
    });
  });
});
