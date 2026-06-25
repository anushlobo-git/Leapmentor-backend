const createForgotPasswordController = require("../../../controllers/forgotPassword.controller");

describe("Forgot Password Controller Unit Tests", () => {
  let mockService, controller, mockReq, mockRes, mockNext;

  beforeEach(() => {
    mockService = {
      sendForgotPasswordOtp: jest.fn(),
      verifyResetOtp: jest.fn(),
      resetPassword: jest.fn(),
    };
    controller = createForgotPasswordController(mockService);
    mockReq = { body: {} };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  test("sendForgotPasswordOtp should process outputs with a 200 status code", async () => {
    mockReq.body.email = "test@lm.com";
    mockService.sendForgotPasswordOtp.mockResolvedValue({ success: true });

    await controller.sendForgotPasswordOtp(mockReq, mockRes, mockNext);
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({ success: true });
  });
});
