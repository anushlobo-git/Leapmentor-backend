const createNoteService = require("../../../services/note.service");
const AppError = require("../../../utils/AppError");

jest.mock("../../../mappers/note.mapper", () => ({ toNoteDTO: (v) => v }));

describe("Note Service Unit Tests", () => {
  let mockNoteRepo,
    mockConnectRepo,
    mockCloudinary,
    mockStreamifier,
    mockGetFileType,
    mockLogger,
    service;

  beforeEach(() => {
    mockNoteRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findByIdWithUploaderLean: jest.fn(),
      deleteById: jest.fn(),
    };
    mockConnectRepo = { findById: jest.fn() };
    mockCloudinary = {
      uploader: { upload_stream: jest.fn(), destroy: jest.fn() },
    };
    mockStreamifier = {
      createReadStream: jest.fn(() => ({ pipe: jest.fn() })),
    };
    mockGetFileType = jest.fn(() => "pdf");
    mockLogger = { warn: jest.fn() };

    service = createNoteService(
      mockNoteRepo,
      mockConnectRepo,
      mockCloudinary,
      mockStreamifier,
      mockGetFileType,
      mockLogger,
    );
  });

  test("processNoteUpload should fail with 400 if target session tracking marks it completed", async () => {
    mockConnectRepo.findById.mockResolvedValue({
      status: "completed",
      mentor: "m1",
      mentee: "m2",
    });

    await expect(
      service.processNoteUpload(
        "session_99",
        "m1",
        { buffer: Buffer.from([]) },
        {},
      ),
    ).rejects.toThrow(
      new AppError(
        "Prohibited action: Uploading notes to a completed connection lifecycle is disabled",
        400,
      ),
    );
  });

  test("removeNoteRecord should fail with 403 if user credentials mismatch document authorship indicators", async () => {
    mockNoteRepo.findById.mockResolvedValue({
      uploadedBy: "rightful_author_id",
    });

    await expect(
      service.removeNoteRecord("note_id", "malicious_actor_id"),
    ).rejects.toThrow(
      new AppError(
        "Authorization restriction: You can only delete your own notes updates records",
        403,
      ),
    );
  });
});
