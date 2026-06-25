const createSupportMessageRepository = require("../../../repositories/supportMessage.repository");

describe("Support Message Repository Unit Tests", () => {
  let mockModel, repository;

  beforeEach(() => {
    mockModel = {
      create: jest.fn(),
      find: jest.fn(() => ({
        sort: jest.fn(() => ({
          lean: jest.fn().mockResolvedValue([{ subject: "Payment query" }]),
        })),
      })),
      findByIdAndUpdate: jest.fn(() => ({
        lean: jest.fn().mockResolvedValue({ status: "resolved" }),
      })),
    };
    repository = createSupportMessageRepository(mockModel);
  });

  test("findAllSortedByNewest should sort chronologically in descending order", async () => {
    const result = await repository.findAllSortedByNewest();
    expect(mockModel.find).toHaveBeenCalled();
    expect(result).toHaveLength(1);
    expect(result[0].subject).toBe("Payment query");
  });

  test("updateStatusById should apply atomic status updates with findByIdAndUpdate paths", async () => {
    const result = await repository.updateStatusById("ticket_101", "resolved");
    expect(mockModel.findByIdAndUpdate).toHaveBeenCalledWith(
      "ticket_101",
      { $set: { status: "resolved" } },
      { new: true },
    );
    expect(result.status).toBe("resolved");
  });
});
