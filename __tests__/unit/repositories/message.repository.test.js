const createMessageRepository = require("../../../repositories/message.repository");

describe("Message Repository Unit Tests", () => {
  let mockModel, repository;

  beforeEach(() => {
    mockModel = {
      find: jest.fn(() => ({
        populate: jest.fn(() => ({
          sort: jest.fn(() => ({
            skip: jest.fn(() => ({
              limit: jest.fn(() => ({
                lean: jest.fn().mockResolvedValue([{ content: "Hello Word" }]),
              })),
            })),
          })),
        })),
      })),
      countDocuments: jest.fn(),
      updateMany: jest.fn(),
    };

    repository = createMessageRepository(mockModel);
  });

  test("findPaginatedMessages should build the expected chain sequence properties", async () => {
    const result = await repository.findPaginatedMessages("room_01", 0, 10);
    expect(mockModel.find).toHaveBeenCalledWith({ connectRequest: "room_01" });
    expect(result[0].content).toBe("Hello Word");
  });

  test("countUnreadMessages should isolate incoming unread indices", async () => {
    mockModel.countDocuments.mockResolvedValue(4);
    const count = await repository.countUnreadMessages("room_01", "my_id");
    expect(mockModel.countDocuments).toHaveBeenCalledWith({
      connectRequest: "room_01",
      sender: { $ne: "my_id" },
      readAt: null,
    });
    expect(count).toBe(4);
  });
});
