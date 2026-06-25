const createUploadController = require("../../../controllers/upload.controller");

describe("Asset Upload Controller Unit Tests", () => {
  let mockService, controller, mockReq, mockRes, mockNext;

  beforeEach(() => {
    mockService = {
      processProfilePicture: jest.fn(),
      processVerificationDocuments: jest.fn(),
    };
    controller = createUploadController(mockService);
    mockReq = { user: { _id: "u1" }, body: {}, params: {}, query: {} };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  test("uploadProfilePicture should return mapped CDN link coordinates with a 200 code status", async () => {
    mockReq.file = { originalname: "avatar.png" };
    mockService.processProfilePicture.mockResolvedValue({
      url: "https://cdn.url",
    });

    await controller.uploadProfilePicture(mockReq, mockRes, mockNext);
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: true,
      url: "https://cdn.url",
    });
  });
});
