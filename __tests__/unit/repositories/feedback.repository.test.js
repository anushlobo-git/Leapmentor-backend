const createFeedbackRepository = require("../../../repositories/feedback.repository");

describe("Feedback Repository Unit Tests", () => {
  let mockModel, repository;

  beforeEach(() => {
    mockModel = {
      findOne: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(() => ({
        populate: jest.fn(() => ({
          populate: jest.fn(() => ({
            lean: jest.fn().mockResolvedValue({ _id: "f1" }),
          })),
        })),
      })),
      find: jest.fn(() => ({
        populate: jest.fn(() => ({
          lean: jest.fn().mockResolvedValue([{ _id: "f2" }]),
        })),
        lean: jest.fn().mockResolvedValue([{ _id: "f3" }]),
      })),
    };
    repository = createFeedbackRepository(mockModel);
  });

  test("findOne should match precise query criteria targets", async () => {
    mockModel.findOne.mockResolvedValue({ _id: "f_found" });
    const result = await repository.findOne({ connectRequest: "c1" });
    expect(mockModel.findOne).toHaveBeenCalledWith({ connectRequest: "c1" });
    expect(result).toEqual({ _id: "f_found" });
  });

  test("findByIdAndPopulateParticipants should chain correct drivers selection layers", async () => {
    const result = await repository.findByIdAndPopulateParticipants("id123");
    expect(mockModel.findById).toHaveBeenCalledWith("id123");
    expect(result).toEqual({ _id: "f1" });
  });
});
