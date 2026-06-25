const createVerificationTokenRepository = require("../../../repositories/verificationToken.repository");

describe("Verification Token Repository Unit Tests", () => {
  let mockModel, repository;

  beforeEach(() => {
    mockModel = {
      deleteMany: jest.fn(),
      create: jest.fn(),
      findOne: jest.fn(),
      findByIdAndUpdate: jest.fn(),
    };
    repository = createVerificationTokenRepository(mockModel);
  });

  test("deleteAllForUser should trigger deletion based on query identity blocks", async () => {
    mockModel.deleteMany.mockResolvedValue({ deletedCount: 1 });
    const result = await repository.deleteAllForUser("user_101");
    expect(mockModel.deleteMany).toHaveBeenCalledWith({ user: "user_101" });
    expect(result.deletedCount).toBe(1);
  });

  test("saveToken should call the instance save method cleanly", async () => {
    const mockInstance = {
      save: jest.fn().mockResolvedValue({ success: true }),
    };
    const result = await repository.saveToken(mockInstance);
    expect(mockInstance.save).toHaveBeenCalled();
    expect(result.success).toBe(true);
  });
});
