const createNotificationRepository = require("../../../repositories/notification.repository");

describe("Notification Repository Unit Tests", () => {
  let mockModel, repository;

  beforeEach(() => {
    mockModel = {
      find: jest.fn(() => ({
        sort: jest.fn(() => ({
          limit: jest.fn(() => ({
            lean: jest.fn().mockResolvedValue([{ title: "Welcome Alert" }]),
          })),
        })),
      })),
      updateMany: jest.fn(),
      findOneAndUpdate: jest.fn(() => ({
        lean: jest.fn().mockResolvedValue({ read: true }),
      })),
      findOneAndDelete: jest.fn(),
      deleteMany: jest.fn(),
      create: jest.fn(),
    };
    repository = createNotificationRepository(mockModel);
  });

  test("findByRecipientLimit should call query builder paths with limit values", async () => {
    const result = await repository.findByRecipientLimit("recipient_uuid", 50);
    expect(mockModel.find).toHaveBeenCalledWith({
      recipient: "recipient_uuid",
    });
    expect(result).toHaveLength(1);
  });

  test("updateManyReadStatus should trigger bulk modifications across items fields", async () => {
    mockModel.updateMany.mockResolvedValue({ modifiedCount: 5 });
    const result = await repository.updateManyReadStatus(
      "recipient_uuid",
      false,
      true,
    );
    expect(mockModel.updateMany).toHaveBeenCalledWith(
      { recipient: "recipient_uuid", read: false },
      { $set: { read: true } },
    );
    expect(result.modifiedCount).toBe(5);
  });
});
