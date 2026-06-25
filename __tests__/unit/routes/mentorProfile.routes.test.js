/**
 * @fileoverview Mentor Profile Router Engine Configuration Unit Tests
 * @description Confirms mapping compliance, path structures, and celebrate integration points completely in memory.
 */

const createMentorProfileRoutes = require("../../../routes/mentorProfile.routes");

const mockRouter = { get: jest.fn(), put: jest.fn(), post: jest.fn() };
jest.mock("express", () => ({ Router: () => mockRouter }));

describe("Mentor Profile Router Unit Tests", () => {
  test("should assert target endpoints registration blocks correct validation shields", () => {
    const mockController = {
      getMyProfile: "c_get",
      updateProfile: "c_put",
      createProfile: "c_post",
      getPublicProfile: "c_pub",
    };
    const mockMiddlewares = {
      authenticate: "jwt_auth",
      requireRole: jest.fn(() => "role_mentor_guard"),
    };
    const mockValidations = {
      createProfileValidation: "v_post",
      updateProfileValidation: "v_put",
      mentorIdParamValidation: "v_param",
    };

    createMentorProfileRoutes(mockController, mockMiddlewares, mockValidations);

    expect(mockRouter.get).toHaveBeenCalledWith(
      "/me",
      "jwt_auth",
      "role_mentor_guard",
      "c_get",
    );
    expect(mockRouter.post).toHaveBeenCalledWith(
      "/",
      "jwt_auth",
      "role_mentor_guard",
      "v_post",
      "c_post",
    );
  });
});
