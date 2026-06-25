/**
 * @fileoverview Cloudinary Asset Upload Service Unit Tests
 * @description Validates mime restrictions, fallback parameters, and upload file rollbacks.
 */

const createUploadService = require("../../../services/upload.service");
const AppError = require("../../../utils/AppError");

describe("Asset Upload Service Unit Tests", () => {
  let mockCloudinary,
    mockStreamifier,
    mockMentorRepo,
    mockMapper,
    mockFireAndForget,
    mockSendEmail,
    mockLogger,
    service;

  beforeEach(() => {
    mockCloudinary = {
      uploader: {
        upload_stream: jest.fn((options, callback) => {
          callback(null, {
            secure_url: "https://cdn.com/file",
            public_id: "pid_123",
          });
          return { pipe: jest.fn() };
        }),
        destroy: jest.fn().mockResolvedValue({ result: "ok" }),
      },
    };
    mockStreamifier = {
      createReadStream: jest.fn(() => ({ pipe: jest.fn() })),
    };
    mockMentorRepo = { findOneAndUpdateByUserId: jest.fn() };
    mockMapper = jest.fn((val) => val);
    mockFireAndForget = jest.fn((task) => task());
    mockSendEmail = jest.fn();
    mockLogger = { info: jest.fn(), error: jest.fn(), warn: jest.fn() };

    service = createUploadService(
      mockCloudinary,
      mockStreamifier,
      mockMentorRepo,
      mockMapper,
      mockFireAndForget,
      mockSendEmail,
      mockLogger,
    );
  });

  test("processProfilePicture should block unapproved binary mime extensions with a 400 error", async () => {
    const invalidFile = {
      mimetype: "application/pdf",
      buffer: Buffer.from([]),
    };
    await expect(service.processProfilePicture(invalidFile)).rejects.toThrow(
      new AppError("Only image files allowed for profile pictures", 400),
    );
  });

  test("processVerificationDocuments should trigger full asset removal rollbacks if document link processes drop inside the database tier", async () => {
    mockMentorRepo.findOneAndUpdateByUserId.mockRejectedValue(
      new Error("DB Disconnect"),
    );

    const mockFiles = {
      resume: [{ buffer: Buffer.from([]), public_id: "res_01" }],
      workExperienceDocs: [{ buffer: Buffer.from([]), public_id: "work_01" }],
    };

    await expect(
      service.processVerificationDocuments(
        { _id: "u1" },
        { phoneNumber: "12345" },
        mockFiles,
      ),
    ).rejects.toThrow(
      new AppError(
        "System could not process documents. Please try again.",
        500,
      ),
    );

    expect(mockCloudinary.uploader.destroy).toHaveBeenCalled();
  });
});
