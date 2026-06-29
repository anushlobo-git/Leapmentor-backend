/**
 * @fileoverview Notification Repository Corporate Unit Tests
 * @description Assures precise verification of visibility scopes, bulk read mutations,
 * layout optimization chains, and targeted collection deletions with zero network access.
 */

const createNotificationRepository = require("../../../repositories/notification.repository");

describe("Notification Repository", () => {
  let mockNotificationModel;
  let notificationRepository;

  const mockNotificationRecord = {
    _id: "notif123",
    recipient: "user555",
    type: "CONNECT_REQUEST_ACCEPTED",
    title: "Request Accepted",
    body: "Your mentorship connection request has been approved.",
    read: false,
    createdAt: new Date("2026-06-29"),
  };

  const mockRecordsArray = [mockNotificationRecord];

  // Safe Factory: Decorates a genuine Promise instance to completely avoid "manual then" linter errors
  const makeChain = (resolvedValue = null) => {
    const promise = Promise.resolve(resolvedValue);

    // Attach Mongoose chain builders directly to the native Promise, returning itself for fluid chaining
    promise.sort = jest.fn().mockReturnValue(promise);
    promise.limit = jest.fn().mockReturnValue(promise);
    promise.lean = jest
      .fn()
      .mockImplementation(() => Promise.resolve(resolvedValue));

    return promise;
  };

  beforeEach(() => {
    mockNotificationModel = {
      find: jest.fn(),
      updateMany: jest.fn(),
      findOneAndUpdate: jest.fn(),
      findOneAndDelete: jest.fn(),
      deleteMany: jest.fn(),
      create: jest.fn(),
    };

    // FIX: Pass the mock directly as a positional parameter to match your production repository signature
    notificationRepository = createNotificationRepository(
      mockNotificationModel,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── READ OPERATIONS & LOOKUPS ───────────────────────────────────────────
  describe("Read Operations & Lookups", () => {
    test("findByRecipientLimit should fetch records matching parameters with reverse chronological sorting and tight capacity bounds", async () => {
      const mockChain = makeChain(mockRecordsArray);
      mockNotificationModel.find.mockReturnValue(mockChain);

      const result = await notificationRepository.findByRecipientLimit(
        "user555",
        5,
      );

      expect(mockNotificationModel.find).toHaveBeenCalledWith({
        recipient: "user555",
      });
      expect(mockChain.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(mockChain.limit).toHaveBeenCalledWith(5);
      expect(mockChain.lean).toHaveBeenCalled();
      expect(result).toEqual(mockRecordsArray);
    });
  });

  // ── DATA MUTATIONS & WRITE ACTIONS ──────────────────────────────────────
  describe("Data Mutations & Write Actions", () => {
    test("updateManyReadStatus should execute bulk updates targeting specific read properties exclusively", async () => {
      mockNotificationModel.updateMany.mockResolvedValue({ modifiedCount: 4 });

      const result = await notificationRepository.updateManyReadStatus(
        "user555",
        false,
        true,
      );

      expect(mockNotificationModel.updateMany).toHaveBeenCalledWith(
        { recipient: "user555", read: false },
        { $set: { read: true } },
      );
      expect(result).toEqual({ modifiedCount: 4 });
    });

    test("findOneAndUpdateByRecipient should execute localized profile modifications using lean validation layouts", async () => {
      const mockChain = makeChain(mockNotificationRecord);
      mockNotificationModel.findOneAndUpdate.mockReturnValue(mockChain);
      const updatePayload = { read: true };

      const result = await notificationRepository.findOneAndUpdateByRecipient(
        "notif123",
        "user555",
        updatePayload,
      );

      expect(mockNotificationModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: "notif123", recipient: "user555" },
        { $set: updatePayload },
        { new: true },
      );
      expect(mockChain.lean).toHaveBeenCalled();
      expect(result).toEqual(mockNotificationRecord);
    });

    test("createNotification should wrap payload maps into native document creations immediately", async () => {
      mockNotificationModel.create.mockResolvedValue(mockNotificationRecord);
      const incomingData = { recipient: "user555", title: "New Message" };

      const result =
        await notificationRepository.createNotification(incomingData);

      expect(mockNotificationModel.create).toHaveBeenCalledWith(incomingData);
      expect(result).toEqual(mockNotificationRecord);
    });
  });

  // ── REMOVALS & CLEANUP ACTIONS ──────────────────────────────────────────
  describe("Removals & Cleanup Actions", () => {
    test("deleteOneByRecipient should target a specific notification configuration matching recipient verification gates", async () => {
      mockNotificationModel.findOneAndDelete.mockResolvedValue(
        mockNotificationRecord,
      );

      const result = await notificationRepository.deleteOneByRecipient(
        "notif123",
        "user555",
      );

      expect(mockNotificationModel.findOneAndDelete).toHaveBeenCalledWith({
        _id: "notif123",
        recipient: "user555",
      });
      expect(result).toEqual(mockNotificationRecord);
    });

    test("deleteManyByRecipient should scrub multiple historical logs across a complete user reference identity space", async () => {
      mockNotificationModel.deleteMany.mockResolvedValue({ deletedCount: 12 });

      const result =
        await notificationRepository.deleteManyByRecipient("user555");

      expect(mockNotificationModel.deleteMany).toHaveBeenCalledWith({
        recipient: "user555",
      });
      expect(result).toEqual({ deletedCount: 12 });
    });
  });
});
