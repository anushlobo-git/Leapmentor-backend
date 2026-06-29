const createGoalRoutes = require("../../../routes/goal.routes");

const mockRouter = {
  use: jest.fn(),
  get: jest.fn(),
  post: jest.fn(),
  patch: jest.fn(),
  delete: jest.fn(),
};
jest.mock("express", () => ({ Router: () => mockRouter }));

describe("Goal Router Unit Tests", () => {
  test("should assert target endpoints registration blocks correct validation shields", () => {
    const mockController = { createGoal: "c_create", getGoal: "c_get" };
    const mockValidations = {
      createGoalValidation: "v_create",
      getGoalValidation: "v_get",
      patchGoalValidation: "v_patch",
    };

    createGoalRoutes({ goalController: mockController, authenticate: "passport_auth", validations: mockValidations });
    expect(mockRouter.use).toHaveBeenCalledWith("passport_auth");
    expect(mockRouter.post).toHaveBeenCalledWith("/", "v_create", "c_create");
  });
});
