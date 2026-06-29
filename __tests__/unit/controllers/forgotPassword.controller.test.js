/**
 * @fileoverview Forgot Password Domain Controller Unit Tests
 * @description Verifies dynamic OTP distribution parsing, temporary security token validations,
 * password overwrite parameters mappings, error propagation, and response status criteria.
 */

const createForgotPasswordController = require("../../../controllers/forgotPassword.controller");

describe("ForgotPasswordController", () => {
  let mockForgotPasswordService;
  let controller;
  let req;
  let res;
  let next;

  const flushPromises = () => new Promise(setImmediate);

  const mockSuccessResult = {
    success: true,
    message: "Operation completed successfully",
  };

  beforeEach(() => {
    // ── MOCK DEPENDENCIES
    mockForgotPasswordService = {
      sendForgotPasswordOtp: jest.fn(),
      verifyResetOtp: jest.fn(),
      resetPassword: jest.fn(),
    };

    controller = createForgotPasswordController({
      forgotPasswordService: mockForgotPasswordService,
    });

    // ── EXPRESS HTTP MOCKS
    req = {
      body: {},
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    next = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── sendForgotPasswordOtp ───────────────────────────────────────────────
  describe("sendForgotPasswordOtp", () => {
    test("should return 200 and output service results payload on successful dynamic dispatch", async () => {
      req.body = { email: "user_alpha@leapmentor.com" }; // Varying context parameter
      mockForgotPasswordService.sendForgotPasswordOtp.mockResolvedValue({
        success: true,
        message: "OTP sent successfully to user_alpha@leapmentor.com",
      });

      await controller.sendForgotPasswordOtp(req, res, next);

      expect(
        mockForgotPasswordService.sendForgotPasswordOtp,
      ).toHaveBeenCalledWith("user_alpha@leapmentor.com");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "OTP sent successfully to user_alpha@leapmentor.com",
      });
      expect(next).not.toHaveBeenCalled();
    });

    test("should call next(err) and withhold status updates when dispatch service throws", async () => {
      req.body = { email: "user_alpha@leapmentor.com" };
      const error = new Error("Mailing provider connection timeout exception");
      mockForgotPasswordService.sendForgotPasswordOtp.mockRejectedValue(error);

      await controller.sendForgotPasswordOtp(req, res, next);
      await flushPromises();

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  // ── verifyResetOtp ──────────────────────────────────────────────────────
  describe("verifyResetOtp", () => {
    test("should return 200 and confirm security code match records on success", async () => {
      req.body = { email: "user_beta@leapmentor.com", otp: "123456" }; // Varying input parameters
      mockForgotPasswordService.verifyResetOtp.mockResolvedValue(
        mockSuccessResult,
      );

      await controller.verifyResetOtp(req, res, next);

      expect(mockForgotPasswordService.verifyResetOtp).toHaveBeenCalledWith(
        "user_beta@leapmentor.com",
        "123456",
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockSuccessResult);
      expect(next).not.toHaveBeenCalled();
    });

    test("should call next(err) and withhold status updates when verification service throws", async () => {
      req.body = { email: "user_beta@leapmentor.com", otp: "000000" };
      const error = new Error(
        "Provided temporary dynamic validation token expired",
      );
      mockForgotPasswordService.verifyResetOtp.mockRejectedValue(error);

      await controller.verifyResetOtp(req, res, next);
      await flushPromises();

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  // ── resetPassword ───────────────────────────────────────────────────────
  describe("resetPassword", () => {
    test("should return 200 and forward structural overwrite updates on success", async () => {
      req.body = {
        email: "user_gamma@leapmentor.com",
        otp: "654321",
        newPassword: "SecurePassword2026!",
      };
      mockForgotPasswordService.resetPassword.mockResolvedValue(
        mockSuccessResult,
      );

      await controller.resetPassword(req, res, next);

      expect(mockForgotPasswordService.resetPassword).toHaveBeenCalledWith({
        email: "user_gamma@leapmentor.com",
        otp: "654321",
        newPassword: "SecurePassword2026!",
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockSuccessResult);
      expect(next).not.toHaveBeenCalled();
    });

    test("should call next(err) and withhold status updates when update service throws", async () => {
      req.body = {
        email: "user_gamma@leapmentor.com",
        otp: "654321",
        newPassword: "weak",
      };
      const error = new Error("Password complexity entropy validation failure");
      mockForgotPasswordService.resetPassword.mockRejectedValue(error);

      await controller.resetPassword(req, res, next);
      await flushPromises();

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
    });
  });
});
