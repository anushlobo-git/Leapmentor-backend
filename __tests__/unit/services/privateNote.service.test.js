/**
 * @fileoverview Private Note Business Logic Service Unit Tests
 * @description Secures participant verification boundaries, default title fallbacks,
 * ownership gates, error propagation states, and DTO mapping conversions.
 */

// ✅ FIXED: Corrected the relative import traversal depth to target the primary core services directory
const createPrivateNoteService = require("../../../services/privateNote.service");
const AppError = require("../../../utils/AppError");

describe("PrivateNoteService Unit Tests", () => {
  let mockPrivateNoteRepo;
  let mockConnectRepo;
  let mockToPrivateNoteDTO;
  let service;

  beforeEach(() => {
    // ── MOCK SYSTEM REPOSITORIES
    mockPrivateNoteRepo = {
      create: jest.fn(),
      findBySessionAndAuthor: jest.fn(),
      findById: jest.fn(),
      save: jest.fn(),
      deleteById: jest.fn(),
    };

    mockConnectRepo = {
      findById: jest.fn(),
    };

    // Spy mapping wrapper function
    mockToPrivateNoteDTO = jest.fn().mockImplementation((val) => ({
      ...val,
      isMappedDTO: true,
    }));

    // Inject dependencies encapsulated inside a destructured parameters layout
    service = createPrivateNoteService({
      privateNoteRepository: mockPrivateNoteRepo,
      connectRequestRepository: mockConnectRepo,
      toPrivateNoteDTO: mockToPrivateNoteDTO,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── INTERNAL HELPER GATES (_verifySessionParticipant) ───────────────────
  describe("_verifySessionParticipant Validation Boundaries", () => {
    test("should throw 404 AppError when targeted connection session does not exist", async () => {
      mockConnectRepo.findById.mockResolvedValue(null);

      await expect(
        service.createPrivateNote("user_123", {
          connectRequestId: "missing_session",
          title: "Valid Title",
        }),
      ).rejects.toThrow(
        new AppError("Target connection session request not found", 404),
      );
    });

    test("should throw 400 AppError when connection request status is inactive", async () => {
      mockConnectRepo.findById.mockResolvedValue({
        _id: "session_001",
        status: "pending", // "pending" is outside allowed ("ongoing", "completed") matrix
        mentor: "mentor_abc",
        mentee: "mentee_xyz",
      });

      await expect(
        service.createPrivateNote("mentor_abc", {
          connectRequestId: "session_001",
          title: "Valid Title",
        }),
      ).rejects.toThrow(
        new AppError(
          "Cannot manipulate note assets for an inactive connection session",
          400,
        ),
      );
    });

    test("should throw 403 AppError when calling user is not an active participant in the session", async () => {
      mockConnectRepo.findById.mockResolvedValue({
        _id: "session_002",
        status: "ongoing",
        mentor: "mentor_abc",
        mentee: "mentee_xyz",
      });

      await expect(
        service.createPrivateNote("unauthorized_intruder_id", {
          connectRequestId: "session_002",
          title: "Valid Title",
        }),
      ).rejects.toThrow(
        new AppError(
          "Access denied: You are not a valid participant inside this engagement pool",
          403,
        ),
      );
    });
  });

  // ── createPrivateNote ───────────────────────────────────────────────────
  describe("createPrivateNote", () => {
    test("should throw 400 AppError when connectRequestId parameter is omitted", async () => {
      await expect(
        service.createPrivateNote("user_123", { title: "Isolated Note" }),
      ).rejects.toThrow(
        new AppError("connectRequestId data query parameter is required", 400),
      );
    });

    test("should compile data fields, commit records, and transform results into mapped DTO on success", async () => {
      mockConnectRepo.findById.mockResolvedValue({
        status: "ongoing",
        mentor: "mentor_abc",
        mentee: "mentee_xyz",
      });

      const mockSavedNote = {
        _id: "note_999",
        title: "Architecture Blueprint",
        content: "Redis cluster map",
      };
      mockPrivateNoteRepo.create.mockResolvedValue(mockSavedNote);

      const result = await service.createPrivateNote("mentee_xyz", {
        connectRequestId: "session_active",
        title: "Architecture Blueprint",
        content: "Redis cluster map",
      });

      expect(mockPrivateNoteRepo.create).toHaveBeenCalledWith({
        connectRequest: "session_active",
        author: "mentee_xyz",
        title: "Architecture Blueprint",
        content: "Redis cluster map",
      });
      expect(mockToPrivateNoteDTO).toHaveBeenCalledWith(mockSavedNote);
      expect(result).toEqual({ ...mockSavedNote, isMappedDTO: true });
    });

    test("should fall back onto default title parameters if incoming title fields are empty or whitespace strings", async () => {
      mockConnectRepo.findById.mockResolvedValue({
        status: "completed",
        mentor: "mentor_abc",
        mentee: "mentee_xyz",
      });

      mockPrivateNoteRepo.create.mockResolvedValue({ title: "Untitled Note" });

      await service.createPrivateNote("mentor_abc", {
        connectRequestId: "session_completed",
        title: "   ", // Testing trim fallback
        content: "",
      });

      expect(mockPrivateNoteRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Untitled Note", content: "" }),
      );
    });
  });

  // ── getPrivateNotesList ─────────────────────────────────────────────────
  describe("getPrivateNotesList", () => {
    test("should load targeted user note arrays and map items iteratively on success", async () => {
      mockConnectRepo.findById.mockResolvedValue({
        status: "ongoing",
        mentor: "mentor_abc",
        mentee: "mentee_xyz",
      });

      const rawNotesCollection = [
        { _id: "n1", title: "Note A" },
        { _id: "n2", title: "Note B" },
      ];
      mockPrivateNoteRepo.findBySessionAndAuthor.mockResolvedValue(
        rawNotesCollection,
      );

      const result = await service.getPrivateNotesList(
        "session_active",
        "mentor_abc",
      );

      expect(mockPrivateNoteRepo.findBySessionAndAuthor).toHaveBeenCalledWith(
        "session_active",
        "mentor_abc",
      );
      expect(mockToPrivateNoteDTO).toHaveBeenCalledTimes(2);
      expect(result).toEqual([
        { _id: "n1", title: "Note A", isMappedDTO: true },
        { _id: "n2", title: "Note B", isMappedDTO: true },
      ]);
    });
  });

  // ── updatePrivateNote ───────────────────────────────────────────────────
  describe("updatePrivateNote", () => {
    test("should throw 404 AppError when document reference is missing", async () => {
      mockPrivateNoteRepo.findById.mockResolvedValue(null);

      await expect(
        service.updatePrivateNote("missing_note_id", "user_123", {
          title: "Update",
        }),
      ).rejects.toThrow(
        new AppError(
          "Requested private note reference missing or deleted",
          404,
        ),
      );
    });

    test("should throw 403 AppError when non-author accounts attempt modifications", async () => {
      mockPrivateNoteRepo.findById.mockResolvedValue({
        _id: "note_id",
        author: "original_author_id",
      });

      await expect(
        service.updatePrivateNote("note_id", "malicious_user_id", {
          title: "Sabotage",
        }),
      ).rejects.toThrow(
        new AppError(
          "Authorization restriction: You can only edit your own private notes",
          403,
        ),
      );
    });

    test("should apply localized modifications and overwrite empty strings with default title indicators", async () => {
      const activeDocumentInstance = {
        _id: "note_id",
        author: "author_777",
        title: "Original Title",
        content: "Original Content",
      };
      mockPrivateNoteRepo.findById.mockResolvedValue(activeDocumentInstance);
      mockPrivateNoteRepo.save.mockImplementation(async (doc) => doc);

      const result = await service.updatePrivateNote("note_id", "author_777", {
        title: "  ", // Shifting back to fallback string parameters
        content: "Mutated Content",
      });

      expect(activeDocumentInstance.title).toBe("Untitled Note");
      expect(activeDocumentInstance.content).toBe("Mutated Content");
      expect(mockPrivateNoteRepo.save).toHaveBeenCalledWith(
        activeDocumentInstance,
      );
      expect(result.isMappedDTO).toBe(true);
    });

    test("should skip value updates when optional parameter attributes are left undefined", async () => {
      const targetNoteInstance = {
        _id: "note_id",
        author: "author_777",
        title: "Preserve Title",
        content: "Preserve Content",
      };
      mockPrivateNoteRepo.findById.mockResolvedValue(targetNoteInstance);
      mockPrivateNoteRepo.save.mockImplementation(async (doc) => doc);

      await service.updatePrivateNote("note_id", "author_777", {
        title: undefined,
        content: undefined,
      });

      expect(targetNoteInstance.title).toBe("Preserve Title");
      expect(targetNoteInstance.content).toBe("Preserve Content");
    });
  });

  // ── removePrivateNote ───────────────────────────────────────────────────
  describe("removePrivateNote", () => {
    test("should throw 404 AppError when document reference is missing on deletion", async () => {
      mockPrivateNoteRepo.findById.mockResolvedValue(null);

      await expect(
        service.removePrivateNote("missing_note_id", "user_123"),
      ).rejects.toThrow(
        new AppError(
          "Requested private note reference missing or deleted",
          404,
        ),
      );
    });

    test("should throw 403 AppError when non-author profiles issue hard purge commands", async () => {
      mockPrivateNoteRepo.findById.mockResolvedValue({
        _id: "note_id",
        author: "owner_id",
      });

      await expect(
        service.removePrivateNote("note_id", "stranger_id"),
      ).rejects.toThrow(
        new AppError(
          "Authorization restriction: You can only delete your own private notes",
          403,
        ),
      );
    });

    test("should trigger repository cleanup actions when request validates cleanly", async () => {
      mockPrivateNoteRepo.findById.mockResolvedValue({
        _id: "note_target_555",
        author: "author_888",
      });
      mockPrivateNoteRepo.deleteById.mockResolvedValue(true);

      await service.removePrivateNote("note_target_555", "author_888");

      expect(mockPrivateNoteRepo.deleteById).toHaveBeenCalledWith(
        "note_target_555",
      );
    });
  });
});
