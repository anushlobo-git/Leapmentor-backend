const createPrivateNoteRepository = require("../../../repositories/privateNote.repository");

describe("Private Note Repository Unit Tests", () => {
  let mockModel, repository;

  beforeEach(() => {
    mockModel = {
      create: jest.fn(),
      find: jest.fn(() => ({
        sort: jest.fn(() => ({
          lean: jest.fn().mockResolvedValue([{ title: "Draft Diary" }]),
        })),
      })),
      findById: jest.fn(),
      findByIdAndDelete: jest.fn(),
    };
    repository = createPrivateNoteRepository(mockModel);
  });

  test("findBySessionAndAuthor should trigger conditional match filtering", async () => {
    const result = await repository.findBySessionAndAuthor("s_1", "u_1");
    expect(mockModel.find).toHaveBeenCalledWith({
      connectRequest: "s_1",
      author: "u_1",
    });
    expect(result).toHaveLength(1);
  });
});
