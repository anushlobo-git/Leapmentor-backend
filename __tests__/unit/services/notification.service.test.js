const createNotificationService = require("../../../services/notification.service");
const AppError = require("../../../utils/AppError");

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
    service = createNotificationService(mockRepo, mockMapper);
  });

  test("markOneNotificationAsRead should throw a 404 AppError if document returns empty", async () => {
    mockRepo.findOneAndUpdateByRecipient.mockResolvedValue(null);

    await expect(
      service.markOneNotificationAsRead("n_id", "user_id"),
    ).rejects.toThrow(
      new AppError(
        "Target notification metadata point not found or authorization restriction matching record failed",
        404,
      ),
    );
  });

  test("removeNotificationRecord should complete successfully when document references are verified", async () => {
    mockRepo.deleteOneByRecipient.mockResolvedValue({
      _id: "deleted_alert_id",
    });

    await service.removeNotificationRecord("n_id", "user_id");
    expect(mockRepo.deleteOneByRecipient).toHaveBeenCalledWith(
      "n_id",
      "user_id",
    );
  });
});
