/**
 * @fileoverview Notification Service Unit Tests
 */

const createNotificationService = require("../../../services/notification.service");

describe("Notification Service Unit Tests", () => {
  let mockRepo, mockMapper, service;

  beforeEach(() => {
    mockRepo = {
      findByRecipientLimit: jest.fn(),
      updateManyReadStatus: jest.fn(),
      findOneAndUpdateByRecipient: jest.fn(),
      deleteOneByRecipient: jest.fn(),
      deleteManyByRecipient: jest.fn(),
    };
    mockMapper = jest.fn((item) => ({ serialized: true, ...item }));

    service = createNotificationService({
      notificationRepository: mockRepo,
      toNotificationDTO: mockMapper,
    });
  });

  afterEach(() => jest.clearAllMocks());

  // ── getRecipientNotifications ─────────────────────────────────

  test("getRecipientNotifications: returns mapped notifications for recipient", async () => {
    mockRepo.findByRecipientLimit.mockResolvedValue([
      { _id: "n1" },
      { _id: "n2" },
    ]);

    const result = await service.getRecipientNotifications("user_1");

    expect(mockRepo.findByRecipientLimit).toHaveBeenCalledWith("user_1", 50);
    expect(mockMapper).toHaveBeenCalledTimes(2);
    expect(result).toEqual([
      { serialized: true, _id: "n1" },
      { serialized: true, _id: "n2" },
    ]);
  });

  // ── markAllNotificationsAsRead ────────────────────────────────

  test("markAllNotificationsAsRead: calls updateManyReadStatus with correct args", async () => {
    mockRepo.updateManyReadStatus.mockResolvedValue();

    await service.markAllNotificationsAsRead("user_1");

    expect(mockRepo.updateManyReadStatus).toHaveBeenCalledWith(
      "user_1",
      false,
      true,
    );
  });

  // ── markOneNotificationAsRead ─────────────────────────────────

  test("markOneNotificationAsRead: resolves successfully when notification is found", async () => {
    mockRepo.findOneAndUpdateByRecipient.mockResolvedValue({
      _id: "n1",
      read: true,
    });

    await expect(
      service.markOneNotificationAsRead("n1", "user_1"),
    ).resolves.toBeUndefined();

    expect(mockRepo.findOneAndUpdateByRecipient).toHaveBeenCalledWith(
      "n1",
      "user_1",
      { read: true },
    );
  });

  test("markOneNotificationAsRead: throws 404 if notification not found", async () => {
    mockRepo.findOneAndUpdateByRecipient.mockResolvedValue(null);

    await expect(
      service.markOneNotificationAsRead("n_id", "user_id"),
    ).rejects.toMatchObject({
      statusCode: 404,
      message:
        "Target notification metadata point not found or authorization restriction matching record failed",
    });
  });

  // ── removeNotificationRecord ──────────────────────────────────

  test("removeNotificationRecord: resolves successfully when document is deleted", async () => {
    mockRepo.deleteOneByRecipient.mockResolvedValue({ _id: "n1" });

    await expect(
      service.removeNotificationRecord("n1", "user_1"),
    ).resolves.toBeUndefined();

    expect(mockRepo.deleteOneByRecipient).toHaveBeenCalledWith("n1", "user_1");
  });

  test("removeNotificationRecord: throws 404 if document not found", async () => {
    mockRepo.deleteOneByRecipient.mockResolvedValue(null);

    await expect(
      service.removeNotificationRecord("n_id", "user_id"),
    ).rejects.toMatchObject({
      statusCode: 404,
      message:
        "Action failed: Target alert parameters match non-existent index locations",
    });
  });

  // ── clearAllUserNotifications ─────────────────────────────────

  test("clearAllUserNotifications: calls deleteManyByRecipient with recipientId", async () => {
    mockRepo.deleteManyByRecipient.mockResolvedValue();

    await service.clearAllUserNotifications("user_1");

    expect(mockRepo.deleteManyByRecipient).toHaveBeenCalledWith("user_1");
  });
});
