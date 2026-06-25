const createFeedbackRoutes = require("../../../routes/feedback.routes");

const mockRouter = { use: jest.fn(), get: jest.fn(), post: jest.fn() };
jest.mock("express", () => ({ Router: () => mockRouter }));

describe("Feedback Router Unit Tests", () => {
  test("should assert target endpoints registration blocks correct validation shields", () => {
    const mockController = { createFeedback: "c_p", getFeedback: "c_g" };
    const mockValidations = {
      createFeedbackValidation: "v_p",
      getFeedbackValidation: "v_g",
    };

    createFeedbackRoutes(mockController, "auth_guard", mockValidations);
    expect(mockRouter.use).toHaveBeenCalledWith("auth_guard");
    expect(mockRouter.post).toHaveBeenCalledWith("/", "v_p", "c_p");
  });
});
