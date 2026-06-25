const createVerificationRoutes = require("../../../routes/verification.routes");

const mockRouter = { post: jest.fn(), get: jest.fn() };
jest.mock("express", () => ({ Router: () => mockRouter }));

describe("Verification Router Unit Tests", () => {
  test("should assert endpoint pathways apply correct celebrate payload validation filters", () => {
    const mockController = {
      sendVerification: "c_send",
      verifyOtp: "c_otp",
      verifyLink: "c_link",
    };
    const mockValidations = {
      emailPayloadValidation: "v_email",
      verifyOtpValidation: "v_otp",
      verifyLinkValidation: "v_link",
    };

    createVerificationRoutes(mockController, mockValidations);
    expect(mockRouter.post).toHaveBeenCalledWith("/send", "v_email", "c_send");
    expect(mockRouter.post).toHaveBeenCalledWith(
      "/verify-otp",
      "v_otp",
      "c_otp",
    );
    expect(mockRouter.get).toHaveBeenCalledWith(
      "/verify/:token",
      "v_link",
      "c_link",
    );
  });
});
