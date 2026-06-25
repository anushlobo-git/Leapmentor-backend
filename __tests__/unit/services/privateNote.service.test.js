const createPrivateNoteService = require("../../../services/privateNote.service");
const AppError = require("../../../utils/AppError");

jest.mock("../../../mappers/privateNote.mapper", () => ({
  toPrivateNoteDTO: (v) => v,
}));

describe("Private Note Service Unit Tests", () => {
  let mockPrivateNoteRepo, mockConnectRepo, service;

  beforeEach(() => {
    mockPrivateNoteRepo = {
      create: jest.fn(),
      findBySessionAndAuthor: jest.fn(),
      findById: jest.fn(),
      save: jest.fn(),
      deleteById: jest.fn(),
    };
    mockConnectRepo = { findById: jest.fn() };
    service = createPrivateNoteService(
      mockPrivateNoteRepo,
      mockConnectRepo,
      (v) => v,
    );
  });

  test("createPrivateNote should throw 403 if user credentials mismatch participant records", async () => {
    mockConnectRepo.findById.mockResolvedValue({
      status: "ongoing",
      mentor: "mentor_abc",
      mentee: "mentee_xyz",
    });

    await expect(
      service.createPrivateNote("intruder_id", {
        connectRequestId: "s_01",
        title: "Secret Note",
      }),
    ).rejects.toThrow(
      new AppError(
        "Access denied: You are not a valid participant inside this engagement pool",
        403,
      ),
    );
  });

  test("updatePrivateNote should throw a 404 AppError if target document is missing", async () => {
    mockPrivateNoteRepo.findById.mockResolvedValue(null);

    await expect(
      service.updatePrivateNote("missing_note_id", "u_1", { title: "Revise" }),
    ).rejects.toThrow(
      new AppError("Requested private note reference missing or deleted", 404),
    );
  });
});
