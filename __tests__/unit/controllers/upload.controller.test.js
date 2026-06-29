/**
 * @fileoverview Upload Controller Unit Tests
 */

const createUploadController = require("../../../controllers/upload.controller");

describe("Upload Controller Unit Tests", () => {
  let mockService, controller, mockReq, mockRes, mockNext;
  const flushPromises = () => new Promise(setImmediate);

  beforeEach(() => {
    mockService = {
      processProfilePicture: jest.fn(),
      processVerificationDocuments: jest.fn(),
    };
    controller = createUploadController({ uploadService: mockService });
    mockReq = {
      user: { _id: "u1", email: "test@test.com" },
      body: {},
      file: null,
      files: [],
    };
    mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
    mockNext = jest.fn();
  });

  test("uploadProfilePicture should return 200 with upload result", async () => {
    mockReq.file = { originalname: "avatar.png" };
    mockReq.body = { imageName: "profile_pic" };
    mockService.processProfilePicture.mockResolvedValue({ url: "https://cdn.example.com/avatar.png" });

    await controller.uploadProfilePicture(mockReq, mockRes, mockNext);
    await flushPromises();

    expect(mockService.processProfilePicture).toHaveBeenCalledWith(mockReq.file, "profile_pic");
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({ success: true, url: "https://cdn.example.com/avatar.png" });
  });

  test("uploadProfilePicture should handle undefined imageName", async () => {
    mockReq.file = { originalname: "avatar.png" };
    mockReq.body = {};
    mockService.processProfilePicture.mockResolvedValue({ url: "https://cdn.example.com/avatar.png" });

    await controller.uploadProfilePicture(mockReq, mockRes, mockNext);
    await flushPromises();

    expect(mockService.processProfilePicture).toHaveBeenCalledWith(mockReq.file, undefined);
  });

  test("uploadProfilePicture should route error to next()", async () => {
    mockService.processProfilePicture.mockRejectedValue(new Error("Upload failed"));
    await controller.uploadProfilePicture(mockReq, mockRes, mockNext);
    await flushPromises();
    expect(mockNext).toHaveBeenCalled();
  });

  test("uploadVerificationDocuments should return 200 with result", async () => {
    mockReq.files = [{ originalname: "doc.pdf" }];
    mockReq.body = { documentType: "id_proof" };
    mockService.processVerificationDocuments.mockResolvedValue({ uploaded: true });

    await controller.uploadVerificationDocuments(mockReq, mockRes, mockNext);
    await flushPromises();

    expect(mockService.processVerificationDocuments).toHaveBeenCalledWith(
      expect.objectContaining({ _id: "u1" }),
      mockReq.body,
      mockReq.files
    );
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({ success: true, uploaded: true });
  });

  test("uploadVerificationDocuments should route error to next()", async () => {
    mockService.processVerificationDocuments.mockRejectedValue(new Error("Upload failed"));
    await controller.uploadVerificationDocuments(mockReq, mockRes, mockNext);
    await flushPromises();
    expect(mockNext).toHaveBeenCalled();
  });
});
