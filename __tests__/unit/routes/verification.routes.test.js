/**
 * @fileoverview User Account Verification and Core Communications Router Unit Tests
 * @description Confirms mapping compliance, path structures, and celebrate integration
 * points for OTP and magic link distribution channels completely in memory.
 */

const createVerificationRoutes = require("../../../routes/verification.routes");

// Isolate the global express router layer to monitor endpoint registration hooks
const mockRouter = {
  post: jest.fn(),
  get: jest.fn(),
};

jest.mock("express", () => ({
  Router: () => mockRouter,
}));

describe("Account Verification Router Configuration Matrix", () => {
  let mockVerificationController;
  let mockValidations;

  beforeEach(() => {
    mockVerificationController = {
      sendVerification: jest.fn(),
      resendVerification: jest.fn(),
      verifyOtp: jest.fn(),
      verifyLink: jest.fn(),
    };

    mockValidations = {
      emailPayloadValidation: "celebrate_email_payload_shield",
      verifyOtpValidation: "celebrate_otp_verification_shield",
      verifyLinkValidation: "celebrate_magic_link_param_shield",
    };

    // Instantiate the route factory using destructured named parameters
    createVerificationRoutes({
      verificationController: mockVerificationController,
      validations: mockValidations,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Communications Ingestion Endpoint Mappings", () => {
    test("should bind registration verification triggers to email payload validation guards using POST", () => {
      expect(mockRouter.post).toHaveBeenCalledWith(
        "/send",
        "celebrate_email_payload_shield",
        mockVerificationController.sendVerification,
      );
    });

    test("should bind OTP retransmission configurations to email payload validation guards using POST", () => {
      expect(mockRouter.post).toHaveBeenCalledWith(
        "/resend",
        "celebrate_email_payload_shield",
        mockVerificationController.resendVerification,
      );
    });

    test("should bind passcode resolution blocks to OTP string verification guards using POST", () => {
      expect(mockRouter.post).toHaveBeenCalledWith(
        "/verify-otp",
        "celebrate_otp_verification_shield",
        mockVerificationController.verifyOtp,
      );
    });

    test("should bind asynchronous magic URL handshakes to path parameter verification guards using GET", () => {
      expect(mockRouter.get).toHaveBeenCalledWith(
        "/verify/:token",
        "celebrate_magic_link_param_shield",
        mockVerificationController.verifyLink,
      );
    });
  });
});
