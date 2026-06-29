/**
 * @fileoverview Private Note Repository Corporate Unit Tests
 * @description Assures precise verification of relationship boundaries, timeline sorting filters,
 * layout optimizations, and instance mutations with zero network dependency.
 */

const createPrivateNoteRepository = require("../../../repositories/privateNote.repository");

describe("PrivateNote Repository", () => {
  let mockPrivateNoteModel;
  let privateNoteRepository;

  const mockNoteRecord = {
    _id: "pnote123",
    connectRequest: "req777",
    author: "user888",
    content:
      "Keep track of mentor's advice regarding Redis connection pooling architectures.",
    createdAt: new Date("2026-06-25"),
    updatedAt: new Date("2026-06-26"),
  };

  const mockRecordsArray = [mockNoteRecord];

  // Safe Factory: Decorates a genuine Promise instance to completely avoid "manual then" linter errors
  const makeChain = (resolvedValue = null) => {
    const promise = Promise.resolve(resolvedValue);

    // Attach Mongoose chain builders directly to the native Promise, returning itself for fluid chaining
    promise.sort = jest.fn().mockReturnValue(promise);
    promise.lean = jest
      .fn()
      .mockImplementation(() => Promise.resolve(resolvedValue));

    return promise;
  };

  beforeEach(() => {
    mockPrivateNoteModel = {
      create: jest.fn(),
      find: jest.fn(),
      findById: jest.fn(),
      findByIdAndDelete: jest.fn(),
    };
    privateNoteRepository = createPrivateNoteRepository(mockPrivateNoteModel);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── STANDARD LOOKUPS & CRUD METHODS ─────────────────────────────────────
  describe("Standard Lookups & CRUD Methods", () => {
    test("create should instantly instantiate and save a brand-new private note payload", async () => {
      mockPrivateNoteModel.create.mockResolvedValue(mockNoteRecord);
      const incomingData = {
        connectRequest: "req777",
        author: "user888",
        content: "Some content",
      };

      const result = await privateNoteRepository.create(incomingData);

      expect(mockPrivateNoteModel.create).toHaveBeenCalledWith(incomingData);
      expect(result).toEqual(mockNoteRecord);
    });

    test("findById should fetch a single document tracking its explicit database identifier", async () => {
      mockPrivateNoteModel.findById.mockResolvedValue(mockNoteRecord);

      const result = await privateNoteRepository.findById("pnote123");

      expect(mockPrivateNoteModel.findById).toHaveBeenCalledWith("pnote123");
      expect(result).toEqual(mockNoteRecord);
    });

    test("deleteById should dispatch target document removal pipelines matching an explicit record key", async () => {
      mockPrivateNoteModel.findByIdAndDelete.mockResolvedValue(mockNoteRecord);

      const result = await privateNoteRepository.deleteById("pnote123");

      expect(mockPrivateNoteModel.findByIdAndDelete).toHaveBeenCalledWith(
        "pnote123",
      );
      expect(result).toEqual(mockNoteRecord);
    });
  });

  // ── CHAINED & OPTIMIZED READ PIPELINES ──────────────────────────────────
  describe("Chained & Optimized Read Pipelines", () => {
    test("findBySessionAndAuthor should locate personal notes with inverse-date sorting rules and lean layouts", async () => {
      const mockChain = makeChain(mockRecordsArray);
      mockPrivateNoteModel.find.mockReturnValue(mockChain);

      const result = await privateNoteRepository.findBySessionAndAuthor(
        "req777",
        "user888",
      );

      expect(mockPrivateNoteModel.find).toHaveBeenCalledWith({
        connectRequest: "req777",
        author: "user888",
      });
      expect(mockChain.sort).toHaveBeenCalledWith({ updatedAt: -1 });
      expect(mockChain.lean).toHaveBeenCalled();
      expect(result).toEqual(mockRecordsArray);
    });
  });

  // ── INSTANCE LIFECYCLE MUTATIONS ────────────────────────────────────────
  describe("Instance Lifecycle Mutations", () => {
    test("save should fire internal persistence routines directly on the given document instance context reference", async () => {
      const mockInstance = {
        ...mockNoteRecord,
        save: jest.fn().mockResolvedValue(mockNoteRecord),
      };

      const result = await privateNoteRepository.save(mockInstance);

      expect(mockInstance.save).toHaveBeenCalled();
      expect(result).toEqual(mockNoteRecord);
    });
  });
});
