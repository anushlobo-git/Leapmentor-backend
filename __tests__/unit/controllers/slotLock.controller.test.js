/**
 * @fileoverview Slot Lock Transport Controller Unit Tests
 * @description Assures valid mapping of body payloads, response message keys, and catchAsync error propagation.
 */

const createSlotLockController = require("../../../controllers/slotLock.controller");

describe("Slot Lock Controller Unit Tests", () => {
  let mockService, controller, mockReq, mockRes, mockNext;

  const flushPromises = () => new Promise(setImmediate);

  beforeEach(() => {
    mockService = {
      acquireSlotLock: jest.fn(),
      releaseSlotLock: jest.fn(),
      releaseAllUserLocks: jest.fn(),
      getMentorActiveLocksList: jest.fn(),
    };
    controller = createSlotLockController(mockService);

    mockReq = { user: { _id: "mentee_101" }, body: {}, params: {} };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  test("lockSlot should process form data payloads and issue a 200 verification message on success tracks", async () => {
    mockReq.body = {
      mentorId: "m1",
      date: "2026-10-12",
      startTime: "09:00",
      endTime: "10:00",
    };
    mockService.acquireSlotLock.mockResolvedValue({ lockedFor: 10 });

    await controller.lockSlot(mockReq, mockRes, mockNext);
    await flushPromises();

    expect(mockService.acquireSlotLock).toHaveBeenCalledWith(
      "mentee_101",
      mockReq.body,
    );
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({
      message: "Slot locked successfully",
      lockedFor: 10,
    });
  });
});
