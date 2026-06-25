/**
 * @fileoverview Admin Verification Route Pipeline Registration Tests
 */

const createAdminVerificationRoutes = require("../../../routes/admin-verification.routes");
const {
  mentorProfileIdParamValidation,
} = require("../../../validations/admin-verification.validation");

const mockRouter = { get: jest.fn(), patch: jest.fn(), use: jest.fn() };
jest.mock("express", () => ({ Router: () => mockRouter }));

describe("Admin Verification Routing Infrastructure Mappings", () => {
  test("should assert accurate placement of validation gates across parameters matching targets", () => {
    const mockCtrl = {
      getAllMentorVerifications: jest.fn(),
      getMentorVerificationById: jest.fn(),
      verifyMentor: jest.fn(),
      revokeMentorVerification: jest.fn(),
    };
    const mockAuth = jest.fn();

    createAdminVerificationRoutes(mockCtrl, mockAuth);
    expect(mockRouter.use).toHaveBeenCalledWith(mockAuth);
    expect(mockRouter.get).toHaveBeenCalledWith(
      "/:mentorProfileId",
      mentorProfileIdParamValidation,
      mockCtrl.getMentorVerificationById,
    );
  });
});
