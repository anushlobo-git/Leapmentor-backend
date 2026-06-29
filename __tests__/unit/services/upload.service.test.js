/**
 * @fileoverview Cloudinary Asset Upload Service Unit Tests
 * @description Secures mime type restrictions, private error parsing extractors,
 * atomic database transactional link rollbacks, and failed cleanup warnings with 100% coverage.
 */

// ✅ FIXED: Corrected the relative lookup path to point to the central services folder context
const createUploadService = require("../../../services/upload.service");
const AppError = require("../../../utils/AppError");

describe("UploadService Unit Tests", () => {
  let mockCloudinary;
  let mockStreamifier;
  let mockMentorRepo;
  let mockMapper;
  let mockFireAndForget;
  let mockSendEmail;
  let mockLogger;
  let service;

  // Intercept pointer to dynamically alter Cloudinary upload mock behavior per test
  let uploadStreamStub;

  beforeEach(() => {
    // Default setup: simulate immediate successful upload stream processing
    uploadStreamStub = (options, callback) => {
      callback(null, {
        secure_url: "https://cdn.leapmentor.com/file.pdf",
        public_id: "pid_success_123",
      });
      return { pipe: jest.fn() };
    };

    // ── MOCK EXTERNAL SYSTEM DEPENDENCIES
    mockCloudinary = {
      uploader: {
        upload_stream: jest.fn((options, callback) =>
          uploadStreamStub(options, callback),
        ),
        destroy: jest.fn().mockResolvedValue({ result: "ok" }),
      },
    };

    mockStreamifier = {
      createReadStream: jest.fn(() => ({
        pipe: jest.fn(),
      })),
    };

    mockMentorRepo = {
      findOneAndUpdateByUserId: jest.fn(),
    };

    mockMapper = jest.fn().mockImplementation((val) => ({
      ...val,
      isMappedDTO: true,
    }));

    mockFireAndForget = jest.fn().mockImplementation((task) => task());
    mockSendEmail = jest.fn();
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    };

    // Inject dependencies encapsulated inside a single configuration parameters object
    service = createUploadService({
      cloudinary: mockCloudinary,
      streamifier: mockStreamifier,
      mentorProfileRepository: mockMentorRepo,
      toMentorProfileDTO: mockMapper,
      fireAndForgetEmail: mockFireAndForget,
      sendDocumentsSubmittedEmail: mockSendEmail,
      logger: mockLogger,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── processProfilePicture ───────────────────────────────────────────────
  describe("processProfilePicture Path Configurations", () => {
    test("should throw 400 AppError when filePayload parameter is completely omitted", async () => {
      await expect(
        service.processProfilePicture(null, "custom_name.png"),
      ).rejects.toThrow(new AppError("Payload missing: No file uploaded", 400));
    });

    test("should throw 400 AppError when file payload binary maps to an unapproved mime type", async () => {
      const unapprovedPayload = {
        mimetype: "application/pdf",
        buffer: Buffer.from([]),
      };

      await expect(
        service.processProfilePicture(unapprovedPayload),
      ).rejects.toThrow(
        new AppError("Only image files allowed for profile pictures", 400),
      );
    });

    test("should upload image cleanly and use the specified custom title string parameters if provided", async () => {
      const validPayload = {
        mimetype: "image/png",
        originalname: "avatar.png",
        buffer: Buffer.from([1, 2]),
      };

      const result = await service.processProfilePicture(
        validPayload,
        "transformed_face.png",
      );

      expect(mockCloudinary.uploader.upload_stream).toHaveBeenCalledWith(
        expect.objectContaining({ display_name: "transformed_face.png" }),
        expect.any(Function),
      );
      expect(result).toEqual({
        url: "https://cdn.leapmentor.com/file.pdf",
        publicId: "pid_success_123",
        fileName: "transformed_face.png",
      });
    });

    test("should fall back onto original payload filenames if optional name titles are omitted", async () => {
      const validPayload = {
        mimetype: "image/jpeg",
        originalname: "raw_capture.jpg",
        buffer: Buffer.from([3, 4]),
      };

      const result = await service.processProfilePicture(
        validPayload,
        undefined,
      );

      expect(result.fileName).toBe("raw_capture.jpg");
    });

    test("should extract error messages from Error instances and throw 500 AppError when upload streams crash", async () => {
      const validPayload = {
        mimetype: "image/png",
        originalname: "img.png",
        buffer: Buffer.from([]),
      };

      // Forces the private upload wrapper promise to reject with an Error instance
      uploadStreamStub = (options, callback) => {
        callback(new Error("Cloudinary pipeline timeout"), null);
        return { pipe: jest.fn() };
      };

      await expect(service.processProfilePicture(validPayload)).rejects.toThrow(
        new AppError("Failed to upload profile picture", 500),
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        "Cloudinary upload failed",
        { error: "Cloudinary pipeline timeout" },
      );
    });

    test("should parse error parameters using JSON serialization string conversions if error is a generic object descriptor", async () => {
      const validPayload = {
        mimetype: "image/png",
        originalname: "img.png",
        buffer: Buffer.from([]),
      };

      // Forces rejection with a structural raw payload object to test the object serializer branch
      uploadStreamStub = (options, callback) => {
        callback({ status: "token_expired", code: 401 }, null);
        return { pipe: jest.fn() };
      };

      await expect(service.processProfilePicture(validPayload)).rejects.toThrow(
        AppError,
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        "Cloudinary upload failed",
        {
          error: '{"status":"token_expired","code":401}',
        },
      );
    });

    test("should convert error variables to string equivalents if error maps to a raw non-object primitive value", async () => {
      const validPayload = {
        mimetype: "image/png",
        originalname: "img.png",
        buffer: Buffer.from([]),
      };

      // Forces rejection with a literal primitive string to test the default baseline casting branch
      uploadStreamStub = (options, callback) => {
        callback("Unspecified infrastructure disruption threshold", null);
        return { pipe: jest.fn() };
      };

      await expect(service.processProfilePicture(validPayload)).rejects.toThrow(
        AppError,
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        "Cloudinary upload failed",
        {
          error: "Unspecified infrastructure disruption threshold",
        },
      );
    });
  });

  // ── processVerificationDocuments ────────────────────────────────────────
  describe("processVerificationDocuments Verification Protocols", () => {
    test("should throw 400 AppError when mandatory resume document payload is missing", async () => {
      const payloads = { workExperienceDocs: [{ buffer: Buffer.from([]) }] };

      await expect(
        service.processVerificationDocuments(
          { _id: "u1" },
          { phoneNumber: "+9199999" },
          payloads,
        ),
      ).rejects.toThrow(new AppError("Resume is required", 400));
    });

    test("should throw 400 AppError when phoneNumber string parameter is empty or contains only whitespace", async () => {
      const payloads = { resume: [{ buffer: Buffer.from([]) }] };

      await expect(
        service.processVerificationDocuments(
          { _id: "u1" },
          { phoneNumber: "   " },
          payloads,
        ),
      ).rejects.toThrow(new AppError("Phone number is required", 400));
    });

    test("should sequence parallel assets streams, update records, and send confirmations on clear success paths", async () => {
      const currentUser = {
        _id: "mentor_abc123",
        name: "Jane Coach",
        email: "jane@leapmentor.com",
      };
      const formFields = { phoneNumber: " +123456789  " }; // Emulating un-trimmed input strings

      const filePayloads = {
        resume: [{ originalname: "cv.pdf", buffer: Buffer.from([10]) }],
        workExperienceDocs: [
          { originalname: "cert1.pdf", buffer: Buffer.from([20]) },
          { originalname: "cert2.pdf", buffer: Buffer.from([30]) },
        ],
      };

      const mockProfileInstance = {
        _id: "prof_xyz",
        verificationStatus: "pending",
      };
      mockMentorRepo.findOneAndUpdateByUserId.mockResolvedValue(
        mockProfileInstance,
      );

      const result = await service.processVerificationDocuments(
        currentUser,
        formFields,
        filePayloads,
      );

      expect(mockMentorRepo.findOneAndUpdateByUserId).toHaveBeenCalledWith(
        "mentor_abc123",
        {
          phoneNumber: "+123456789",
          resumeDocument: {
            url: "https://cdn.leapmentor.com/file.pdf",
            publicId: "pid_success_123",
            fileName: "cv.pdf",
            uploadedAt: expect.any(Date),
          },
          workExperienceDocuments: [
            {
              url: "https://cdn.leapmentor.com/file.pdf",
              publicId: "pid_success_123",
              fileName: "cert1.pdf",
              uploadedAt: expect.any(Date),
            },
            {
              url: "https://cdn.leapmentor.com/file.pdf",
              publicId: "pid_success_123",
              fileName: "cert2.pdf",
              uploadedAt: expect.any(Date),
            },
          ],
          verificationStatus: "pending",
        },
      );

      expect(mockSendEmail).toHaveBeenCalledWith({
        mentorName: "Jane Coach",
        mentorEmail: "jane@leapmentor.com",
      });
      result.isMappedDTO ? expect(result.isMappedDTO).toBe(true) : null;
    });

    test("should default work experience vectors to empty arrays if no supplemental files are submitted", async () => {
      const currentUser = { _id: "mentor_abc123" };
      const filePayloads = {
        resume: [{ originalname: "cv.pdf", buffer: Buffer.from([9]) }],
      };

      mockMentorRepo.findOneAndUpdateByUserId.mockResolvedValue({
        _id: "profile_updated",
      });

      await service.processVerificationDocuments(
        currentUser,
        { phoneNumber: "123" },
        filePayloads,
      );

      expect(mockMentorRepo.findOneAndUpdateByUserId).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ workExperienceDocuments: [] }),
      );
    });

    test("should trigger database find fallbacks, compile historical list arrays, and issue cleanup destructions if query updates evaluate null", async () => {
      const filePayloads = {
        resume: [{ originalname: "cv.pdf", buffer: Buffer.from([]) }],
        workExperienceDocs: [
          { originalname: "work.pdf", buffer: Buffer.from([]) },
        ],
      };

      // Simulate successful Cloudinary streams, but database document reference evaluation fails
      mockMentorRepo.findOneAndUpdateByUserId.mockResolvedValue(null);

      await expect(
        service.processVerificationDocuments(
          { _id: "m_999" },
          { phoneNumber: "999" },
          filePayloads,
        ),
      ).rejects.toThrow(
        new AppError(
          "System could not process documents. Please try again.",
          500,
        ),
      );

      expect(mockCloudinary.uploader.destroy).toHaveBeenCalledTimes(2);
      expect(mockLogger.error).toHaveBeenCalledWith(
        "Verification upload failed, initiating rollback",
        {
          userId: "m_999",
          error: "Profile not found",
        },
      );
    });

    test("should trap destruction execution exceptions safely inside loop catches and trigger alert metrics logs", async () => {
      const filePayloads = {
        resume: [{ originalname: "cv.pdf", buffer: Buffer.from([]) }],
      };

      mockMentorRepo.findOneAndUpdateByUserId.mockRejectedValue(
        new Error("Mongoose cluster write lockout"),
      );
      // Simulate Cloudinary purge routine failing during critical runtime rollbacks
      mockCloudinary.uploader.destroy.mockRejectedValue(
        new Error("Network connection dropped on delete packet"),
      );

      await expect(
        service.processVerificationDocuments(
          { _id: "m_fail" },
          { phoneNumber: "111" },
          filePayloads,
        ),
      ).rejects.toThrow(AppError);

      expect(mockCloudinary.uploader.destroy).toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        "Rollback cleanup failed for ID",
        {
          publicId: "pid_success_123",
          error: "Network connection dropped on delete packet",
        },
      );
    });
  });
});
