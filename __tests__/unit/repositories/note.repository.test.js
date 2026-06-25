const createNoteRepository = require("../../../repositories/note.repository");

describe("Note Repository Unit Tests", () => {
  let mockModel, repository;

  beforeEach(() => {
    mockModel = {
      create: jest.fn(),
      findById: jest.fn(() => ({
        populate: jest.fn(() => ({
          lean: jest.fn().mockResolvedValue({ _id: "note_lean_01" }),
        })),
      })),
      find: jest.fn(() => ({
        populate: jest.fn(() => ({
          sort: jest.fn(() => ({
            lean: jest.fn().mockResolvedValue([{ _id: "note_listed" }]),
          })),
        })),
      })),
      findByIdAndDelete: jest.fn(),
    };
    repository = createNoteRepository(mockModel);
  });

  test("findByIdWithUploaderLean should assemble lean chained projections", async () => {
    const result = await repository.findByIdWithUploaderLean("n_101");
    expect(mockModel.findById).toHaveBeenCalledWith("n_101");
    expect(result._id).toBe("note_lean_01");
  });

  test("findSharedByConnectRequest should search for unrevoked public documents elements", async () => {
    const result = await repository.findSharedByConnectRequest("session_2026");
    expect(mockModel.find).toHaveBeenCalledWith({
      connectRequest: "session_2026",
      isPrivate: { $ne: true },
    });
    expect(result).toHaveLength(1);
  });
});
