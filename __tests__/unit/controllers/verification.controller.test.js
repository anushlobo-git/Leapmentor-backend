/**
 * @fileoverview Verification Controller Unit Tests
 */

const createVerificationController = require("../../../controllers/verification.controller");

describe("Verification Controller Unit Tests", () => {
  let mockService, controller, mockReq, mockRes, mockNext;
  const flushPromises = () => new Promise(setImmediate);

  beforeEach(() => {
    mockService = {
      initiateVerification: jest.fn(),
      processOtpVerification: jest.fn(),
      processLinkVerification: jest.fn(),
    };
    controller = createVerificationController({ verificationService: mockService });
    mockReq = { body: {}, params: {}, query: {} };
    mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
    mockNext = jest.fn();
  });

  test("sendVerification should return 200 with success message", async () => {
    mockReq.body.email = "user@test.com";
    mockService.initiateVerification.mockResolvedValue();

    await controller.sendVerification(mockReq, mockRes, mockNext);
    await flushPromises();

    expect(mockService.initiateVerification).toHaveBeenCalledWith("user@test.com");
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({ message: "Verification email sent (OTP + magic link)" });
  });

  test("sendVerification should route error to next()", async () => {
    mockService.initiateVerification.mockRejectedValue(new Error("Send failed"));
    await controller.sendVerification(mockReq, mockRes, mockNext);
    await flushPromises();
    expect(mockNext).toHaveBeenCalled();
  });

  test("resendVerification should return 200 with resend message", async () => {
    mockReq.body.email = "user@test.com";
    mockService.initiateVerification.mockResolvedValue();

    await controller.resendVerification(mockReq, mockRes, mockNext);
    await flushPromises();

    expect(mockService.initiateVerification).toHaveBeenCalledWith("user@test.com", " (Resend)");
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({ message: "Verification email resent (OTP + magic link)" });
  });

  test("resendVerification should route error to next()", async () => {
    mockService.initiateVerification.mockRejectedValue(new Error("Resend failed"));
    await controller.resendVerification(mockReq, mockRes, mockNext);
    await flushPromises();
    expect(mockNext).toHaveBeenCalled();
  });

  test("verifyOtp should return 200 with verified message", async () => {
    mockReq.body = { email: "user@test.com", otp: "123456" };
    mockService.processOtpVerification.mockResolvedValue();

    await controller.verifyOtp(mockReq, mockRes, mockNext);
    await flushPromises();

    expect(mockService.processOtpVerification).toHaveBeenCalledWith("user@test.com", "123456");
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({ message: "Email verified successfully" });
  });

  test("verifyOtp should route error to next()", async () => {
    mockService.processOtpVerification.mockRejectedValue(new Error("OTP invalid"));
    await controller.verifyOtp(mockReq, mockRes, mockNext);
    await flushPromises();
    expect(mockNext).toHaveBeenCalled();
  });

  test("verifyLink should return 200 with role in response", async () => {
    mockReq.params.token = "token_abc";
    mockReq.query.email = "user@test.com";
    mockService.processLinkVerification.mockResolvedValue({ role: "mentee" });

    await controller.verifyLink(mockReq, mockRes, mockNext);
    await flushPromises();

    expect(mockService.processLinkVerification).toHaveBeenCalledWith("token_abc", "user@test.com");
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({ message: "Email verified successfully", role: "mentee" });
  });

  test("verifyLink should route error to next()", async () => {
    mockService.processLinkVerification.mockRejectedValue(new Error("Link expired"));
    await controller.verifyLink(mockReq, mockRes, mockNext);
    await flushPromises();
    expect(mockNext).toHaveBeenCalled();
  });
});
