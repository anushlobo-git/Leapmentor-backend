/**
 * @fileoverview Note Repository Corporate Unit Tests
 * @description Assures precise verification of privacy filters, upload population contexts,
 * timeline sorting criteria, and document deletion methods with zero network connectivity.
 */

const createNoteRepository = require("../../../repositories/note.repository");

describe("Note Repository", () => {
  let mockNoteModel;
  let noteRepository;

  const mockNoteRecord = {
    _id: "note123",
    connectRequest: "req456",
    uploadedBy: "user789",
    title: "System Design Key Takeaways",
    fileUrl: "https://cloudinary.com/notes/architecture.pdf",
    isPrivate: false,
    createdAt: new Date("2026-06-28"),
  };

  const mockRecordsArray = [mockNoteRecord];

  // Safe Factory: Decorates a genuine Promise instance to completely avoid "manual then" linter errors
  const makeChain = (resolvedValue = null) => {
    const promise = Promise.resolve(resolvedValue);

    // Attach Mongoose chain builders directly to the native Promise, returning itself for fluid chaining
    promise.populate = jest.fn().mockReturnValue(promise);
    promise.sort = jest.fn().mockReturnValue(promise);
    promise.lean = jest
      .fn()
      .mockImplementation(() => Promise.resolve(resolvedValue));

    return promise;
  };

  beforeEach(() => {
    mockNoteModel = {
      create: jest.fn(),
      findById: jest.fn(),
      find: jest.fn(),
      findByIdAndDelete: jest.fn(),
    };
    noteRepository = createNoteRepository(mockNoteModel);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── STANDARD CRUD METHODS ───────────────────────────────────────────────
  describe("Standard CRUD Methods", () => {
    test("create should instantly instantiate and persist a brand-new note record payload", async () => {
      mockNoteModel.create.mockResolvedValue(mockNoteRecord);
      const dataPayload = {
        connectRequest: "req456",
        title: "System Design Key Takeaways",
      };

      const result = await noteRepository.create(dataPayload);

      expect(mockNoteModel.create).toHaveBeenCalledWith(dataPayload);
      expect(result).toEqual(mockNoteRecord);
    });

    test("findById should fetch a unique note configuration tracking its native model ID", async () => {
      mockNoteModel.findById.mockResolvedValue(mockNoteRecord);

      const result = await noteRepository.findById("note123");

      expect(mockNoteModel.findById).toHaveBeenCalledWith("note123");
      expect(result).toEqual(mockNoteRecord);
    });

    test("deleteById should execute precise drop operations matching target document identifiers", async () => {
      mockNoteModel.findByIdAndDelete.mockResolvedValue(mockNoteRecord);

      const result = await noteRepository.deleteById("note123");

      expect(mockNoteModel.findByIdAndDelete).toHaveBeenCalledWith("note123");
      expect(result).toEqual(mockNoteRecord);
    });
  });

  // ── POPULATED & CHAINED QUERY PIPELINES ─────────────────────────────────
  describe("Populated & Chained Query Pipelines", () => {
    test("findByIdWithUploaderLean should expand the uploader ID reference with optimized lean conversion", async () => {
      const mockChain = makeChain(mockNoteRecord);
      mockNoteModel.findById.mockReturnValue(mockChain);

      const result = await noteRepository.findByIdWithUploaderLean("note123");

      expect(mockNoteModel.findById).toHaveBeenCalledWith("note123");
      expect(mockChain.populate).toHaveBeenCalledWith(
        "uploadedBy",
        "name email",
      );
      expect(mockChain.lean).toHaveBeenCalled();
      expect(result).toEqual(mockNoteRecord);
    });

    test("findSharedByConnectRequest should isolate entries matching open connection spaces sorted sequentially", async () => {
      const mockChain = makeChain(mockRecordsArray);
      mockNoteModel.find.mockReturnValue(mockChain);

      const result = await noteRepository.findSharedByConnectRequest("req456");

      expect(mockNoteModel.find).toHaveBeenCalledWith({
        connectRequest: "req456",
        isPrivate: { $ne: true },
      });
      expect(mockChain.populate).toHaveBeenCalledWith(
        "uploadedBy",
        "name email",
      );
      expect(mockChain.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(mockChain.lean).toHaveBeenCalled();
      expect(result).toEqual(mockRecordsArray);
    });

    test("findPrivateByConnectRequestAndUser should segment confidential note clusters mapping explicit user bounds", async () => {
      const mockChain = makeChain(mockRecordsArray);
      mockNoteModel.find.mockReturnValue(mockChain);

      const result = await noteRepository.findPrivateByConnectRequestAndUser(
        "req456",
        "user789",
      );

      expect(mockNoteModel.find).toHaveBeenCalledWith({
        connectRequest: "req456",
        uploadedBy: "user789",
        isPrivate: true,
      });
      expect(mockChain.populate).toHaveBeenCalledWith(
        "uploadedBy",
        "name email",
      );
      expect(mockChain.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(mockChain.lean).toHaveBeenCalled();
      expect(result).toEqual(mockRecordsArray);
    });
  });
});
