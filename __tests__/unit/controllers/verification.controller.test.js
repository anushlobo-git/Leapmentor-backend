const createVerificationController = require("../../../controllers/verification.controller");

describe("Verification Controller Unit Tests", () => {
  let mockService, controller, mockReq, mockRes, mockNext;

  beforeEach(() => {
    mockService = {
      initiateVerification: jest.fn(),
      processOtpVerification: jest.fn(),
      processLinkVerification: jest.fn(),
    };
    controller = createVerificationController(mockService);

    mockReq = { body: {}, params: {}, query: {} };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  test("sendVerification should execute processing streams returning a 200 HTTP status code", async () => {
    mockReq.body.email = "peer@test.com";
    mockService.initiateVerification.mockResolvedValue();

    await controller.sendVerification(mockReq, mockRes, mockNext);
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({
      message: "Verification email sent (OTP + magic link)",
    });
  });
});
