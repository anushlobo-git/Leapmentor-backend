const createForgotPasswordRoutes = require("../../../routes/forgotPassword.routes");

const mockRouter = { post: jest.fn() };
jest.mock("express", () => ({ Router: () => mockRouter }));

describe("Forgot Password Router Unit Tests", () => {
  test("should anchor specific path definitions to matching validation shields", () => {
    const mockController = {
      sendForgotPasswordOtp: "c1",
      verifyResetOtp: "c2",
      resetPassword: "c3",
    };
    const mockValidations = {
      sendForgotPasswordOtpValidation: "v1",
      verifyResetOtpValidation: "v2",
      resetPasswordValidation: "v3",
    };

    createForgotPasswordRoutes(mockController, mockValidations);
    expect(mockRouter.post).toHaveBeenCalledWith(
      "/forgot-password",
      "v1",
      "c1",
    );
    expect(mockRouter.post).toHaveBeenCalledWith(
      "/verify-reset-otp",
      "v2",
      "c2",
    );
    expect(mockRouter.post).toHaveBeenCalledWith(
      "/reset-password",
      "v3",
      "c3",
    );
  });
});
