/**
 * @fileoverview Slot Lock Controller Unit Tests
 */

const createSlotLockController = require("../../../controllers/slotLock.controller");

describe("SlotLock Controller Unit Tests", () => {
  let mockService, controller, mockReq, mockRes, mockNext;
  const flushPromises = () => new Promise(setImmediate);

  beforeEach(() => {
    mockService = {
      acquireSlotLock: jest.fn(),
      releaseSlotLock: jest.fn(),
      releaseAllUserLocks: jest.fn(),
      getMentorActiveLocksList: jest.fn(),
    };
    controller = createSlotLockController({ slotLockService: mockService });
    mockReq = { user: { _id: "u1" }, body: {}, params: {} };
    mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
    mockNext = jest.fn();
  });

  test("lockSlot should return 200 with lock data", async () => {
    mockReq.body = { mentorId: "m1", slotIndex: 0 };
    mockService.acquireSlotLock.mockResolvedValue({ lockId: "lock_1" });

    await controller.lockSlot(mockReq, mockRes, mockNext);
    await flushPromises();

    expect(mockService.acquireSlotLock).toHaveBeenCalledWith("u1", mockReq.body);
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({ message: "Slot locked successfully", lockId: "lock_1" });
  });

  test("lockSlot should route error to next()", async () => {
    mockService.acquireSlotLock.mockRejectedValue(new Error("Lock failed"));
    await controller.lockSlot(mockReq, mockRes, mockNext);
    await flushPromises();
    expect(mockNext).toHaveBeenCalled();
  });

  test("unlockSlot should return 200 on successful unlock", async () => {
    mockReq.body = { mentorId: "m1", slotIndex: 0 };
    mockService.releaseSlotLock.mockResolvedValue();

    await controller.unlockSlot(mockReq, mockRes, mockNext);
    await flushPromises();

    expect(mockService.releaseSlotLock).toHaveBeenCalledWith("u1", mockReq.body);
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({ message: "Slot unlocked successfully" });
  });

  test("unlockSlot should route error to next()", async () => {
    mockService.releaseSlotLock.mockRejectedValue(new Error("Unlock failed"));
    await controller.unlockSlot(mockReq, mockRes, mockNext);
    await flushPromises();
    expect(mockNext).toHaveBeenCalled();
  });

  test("unlockAllByMentee should return 200 on successful unlock of all locks", async () => {
    mockReq.body = { mentorId: "m1" };
    mockService.releaseAllUserLocks.mockResolvedValue();

    await controller.unlockAllByMentee(mockReq, mockRes, mockNext);
    await flushPromises();

    expect(mockService.releaseAllUserLocks).toHaveBeenCalledWith("u1", "m1");
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({ message: "All locks released successfully" });
  });

  test("unlockAllByMentee should route error to next()", async () => {
    mockService.releaseAllUserLocks.mockRejectedValue(new Error("Release failed"));
    await controller.unlockAllByMentee(mockReq, mockRes, mockNext);
    await flushPromises();
    expect(mockNext).toHaveBeenCalled();
  });

  test("getActiveLocks should return 200 with list of locks", async () => {
    mockReq.params.mentorId = "m1";
    mockService.getMentorActiveLocksList.mockResolvedValue([{ lockId: "l1" }]);

    await controller.getActiveLocks(mockReq, mockRes, mockNext);
    await flushPromises();

    expect(mockService.getMentorActiveLocksList).toHaveBeenCalledWith("m1", "u1");
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith([{ lockId: "l1" }]);
  });

  test("getActiveLocks should route error to next()", async () => {
    mockService.getMentorActiveLocksList.mockRejectedValue(new Error("Fetch failed"));
    await controller.getActiveLocks(mockReq, mockRes, mockNext);
    await flushPromises();
    expect(mockNext).toHaveBeenCalled();
  });
});
