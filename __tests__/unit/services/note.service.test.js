const createNoteService = require("../../../services/note.service");

jest.mock("../../../mappers/note.mapper", () => ({
  toNoteDTO: jest.fn((v) => v),
}));

describe("Note Service", () => {
  let mockNoteRepo,
    mockConnectRepo,
    mockCloudinary,
    mockStreamifier,
    mockGetFileType,
    mockLogger,
    service;

  const ongoingRequest = { status: "ongoing", mentor: "m1", mentee: "m2" };
  const completedRequest = { status: "completed", mentor: "m1", mentee: "m2" };
  const mockFile = {
    buffer: Buffer.from("data"),
    originalname: "file.pdf",
    mimetype: "application/pdf",
    size: 1234,
  };
  const mockNote = { _id: "note1", publicId: "pub1", uploadedBy: "m1" };

  const makeUploadStream = (
    result = { secure_url: "http://url", public_id: "pub1" },
    error = null,
  ) => {
    return jest.fn((_opts, cb) => {
      setTimeout(() => cb(error, result), 0);
      return { on: jest.fn() };
    });
  };

  beforeEach(() => {
    mockNoteRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findByIdWithUploaderLean: jest.fn(),
      findSharedByConnectRequest: jest.fn(),
      findPrivateByConnectRequestAndUser: jest.fn(),
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

    service = createNoteService({
      noteRepository: mockNoteRepo,
      connectRequestRepository: mockConnectRepo,
      cloudinary: mockCloudinary,
      streamifier: mockStreamifier,
      getFileType: mockGetFileType,
      logger: mockLogger,
    });
  });

  afterEach(() => jest.clearAllMocks());

  // ── _verifySessionAccess (shared guard) ─────────────────────────────────
  describe("_verifySessionAccess (via processNoteUpload)", () => {
    test("throws 404 if connection request not found", async () => {
      mockConnectRepo.findById.mockResolvedValue(null);

      await expect(
        service.processNoteUpload("req1", "m1", mockFile, {}),
      ).rejects.toMatchObject({
        statusCode: 404,
        message: "Target connection session request not found",
      });
    });

    test("throws 400 if session status is not ongoing or completed", async () => {
      mockConnectRepo.findById.mockResolvedValue({
        status: "pending",
        mentor: "m1",
        mentee: "m2",
      });

      await expect(
        service.processNoteUpload("req1", "m1", mockFile, {}),
      ).rejects.toMatchObject({
        statusCode: 400,
        message:
          "Cannot manipulate assets for an inactive connection session context",
      });
    });

    test("throws 403 if user is not mentor or mentee", async () => {
      mockConnectRepo.findById.mockResolvedValue(ongoingRequest);

      await expect(
        service.processNoteUpload("req1", "outsider", mockFile, {}),
      ).rejects.toMatchObject({
        statusCode: 403,
        message:
          "Access denied: You are not a valid participant inside this engagement pool",
      });
    });
  });

  // ── processNoteUpload ───────────────────────────────────────────────────
  describe("processNoteUpload", () => {
    test("throws 400 if connectRequestId is missing", async () => {
      await expect(
        service.processNoteUpload(null, "m1", mockFile, {}),
      ).rejects.toMatchObject({
        statusCode: 400,
        message: "connectRequestId query context field parameter is required",
      });
    });

    test("throws 400 if file payload is missing", async () => {
      await expect(
        service.processNoteUpload("req1", "m1", null, {}),
      ).rejects.toMatchObject({
        statusCode: 400,
        message:
          "No valid processing file structure or object payload uploaded",
      });
    });

    test("throws 400 if session is completed", async () => {
      mockConnectRepo.findById.mockResolvedValue(completedRequest);

      await expect(
        service.processNoteUpload("req1", "m1", mockFile, {}),
      ).rejects.toMatchObject({
        statusCode: 400,
        message:
          "Prohibited action: Uploading notes to a completed connection lifecycle is disabled",
      });
    });

    test("throws 400 if cloudinary upload fails", async () => {
      mockConnectRepo.findById.mockResolvedValue(ongoingRequest);
      mockCloudinary.uploader.upload_stream = makeUploadStream(
        null,
        new Error("upload failed"),
      );

      await expect(
        service.processNoteUpload("req1", "m1", mockFile, {}),
      ).rejects.toMatchObject({
        statusCode: 400,
        message: "Cloud asset storage delivery system failure: upload failed",
      });
    });

    test("uploads note successfully with isPrivate true (string)", async () => {
      mockConnectRepo.findById.mockResolvedValue(ongoingRequest);
      mockCloudinary.uploader.upload_stream = makeUploadStream({
        secure_url: "http://url",
        public_id: "pub1",
      });
      mockNoteRepo.create.mockResolvedValue(mockNote);
      mockNoteRepo.findByIdWithUploaderLean.mockResolvedValue(mockNote);

      const result = await service.processNoteUpload("req1", "m1", mockFile, {
        isPrivate: "true",
        title: "  My Note  ",
      });

      expect(mockNoteRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          isPrivate: true,
          uploaderRole: "mentor",
          title: "My Note",
          fileType: "pdf",
        }),
      );
      expect(result).toBe(mockNote);
    });

    test("uploads note as mentee with isPrivate false and falls back to originalname for title", async () => {
      mockConnectRepo.findById.mockResolvedValue(ongoingRequest);
      mockCloudinary.uploader.upload_stream = makeUploadStream({
        secure_url: "http://url",
        public_id: "pub1",
      });
      mockNoteRepo.create.mockResolvedValue(mockNote);
      mockNoteRepo.findByIdWithUploaderLean.mockResolvedValue(mockNote);

      await service.processNoteUpload("req1", "m2", mockFile, {
        isPrivate: false,
      });

      expect(mockNoteRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          isPrivate: false,
          uploaderRole: "mentee",
          title: "file.pdf",
        }),
      );
    });
  });

  // ── getSharedNotesList ──────────────────────────────────────────────────
  describe("getSharedNotesList", () => {
    test("returns mapped shared notes for valid participant", async () => {
      mockConnectRepo.findById.mockResolvedValue(ongoingRequest);
      mockNoteRepo.findSharedByConnectRequest.mockResolvedValue([mockNote]);

      const result = await service.getSharedNotesList("req1", "m1");

      expect(mockNoteRepo.findSharedByConnectRequest).toHaveBeenCalledWith(
        "req1",
      );
      expect(result).toEqual([mockNote]);
    });
  });

  // ── getPrivateNotesList ─────────────────────────────────────────────────
  describe("getPrivateNotesList", () => {
    test("returns mapped private notes for valid participant", async () => {
      mockConnectRepo.findById.mockResolvedValue(ongoingRequest);
      mockNoteRepo.findPrivateByConnectRequestAndUser.mockResolvedValue([
        mockNote,
      ]);

      const result = await service.getPrivateNotesList("req1", "m1");

      expect(
        mockNoteRepo.findPrivateByConnectRequestAndUser,
      ).toHaveBeenCalledWith("req1", "m1");
      expect(result).toEqual([mockNote]);
    });
  });

  // ── removeNoteRecord ────────────────────────────────────────────────────
  describe("removeNoteRecord", () => {
    test("throws 404 if note not found", async () => {
      mockNoteRepo.findById.mockResolvedValue(null);

      await expect(
        service.removeNoteRecord("note1", "m1"),
      ).rejects.toMatchObject({
        statusCode: 404,
        message: "Requested note reference point missing or deleted",
      });
    });

    test("throws 403 if user is not the uploader", async () => {
      mockNoteRepo.findById.mockResolvedValue({
        ...mockNote,
        uploadedBy: "other",
      });

      await expect(
        service.removeNoteRecord("note1", "m1"),
      ).rejects.toMatchObject({
        statusCode: 403,
        message:
          "Authorization restriction: You can only delete your own notes updates records",
      });
    });

    test("deletes note and destroys cloudinary asset", async () => {
      mockNoteRepo.findById.mockResolvedValue(mockNote);
      mockCloudinary.uploader.destroy.mockResolvedValue({ result: "ok" });

      await service.removeNoteRecord("note1", "m1");

      expect(mockCloudinary.uploader.destroy).toHaveBeenCalledWith("pub1", {
        resource_type: "raw",
      });
      expect(mockNoteRepo.deleteById).toHaveBeenCalledWith("note1");
    });

    test("logs warning and continues if cloudinary destroy fails", async () => {
      mockNoteRepo.findById.mockResolvedValue(mockNote);
      mockCloudinary.uploader.destroy.mockRejectedValue(new Error("cdn error"));

      await service.removeNoteRecord("note1", "m1");

      expect(mockLogger.warn).toHaveBeenCalledWith(
        "Cloudinary file unlinking warning",
        { message: "cdn error" },
      );
      expect(mockNoteRepo.deleteById).toHaveBeenCalledWith("note1");
    });
  });
});
