const createMenteeProfileRoutes = require("../../../routes/menteeProfile.routes");

const mockRouter = { get: jest.fn(), put: jest.fn(), post: jest.fn() };
jest.mock("express", () => ({ Router: () => mockRouter }));

describe("Mentee Profile Router Unit Tests", () => {
  test("should mount proper routes parameters matching endpoint definitions", () => {
    const mockController = { getMyProfile: "c1", updateProfile: "c2" };
    const mockMiddlewares = {
      authenticate: "auth",
      requireRole: jest.fn(() => "role_mentee"),
    };
    const mockValidations = {
      createProfileValidation: "v1",
      updateProfileValidation: "v2",
      menteeIdParamValidation: "v3",
    };

    createMenteeProfileRoutes(mockController, mockMiddlewares, mockValidations);
    expect(mockRouter.get).toHaveBeenCalledWith(
      "/me",
      "auth",
      "role_mentee",
      "c1",
    );
  });
});
