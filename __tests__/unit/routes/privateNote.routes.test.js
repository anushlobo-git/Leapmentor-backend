const createPrivateNoteRoutes = require("../../../routes/privateNote.routes");

const mockRouter = {
  use: jest.fn(),
  get: jest.fn(),
  post: jest.fn(),
  patch: jest.fn(),
  delete: jest.fn(),
};
jest.mock("express", () => ({ Router: () => mockRouter }));

describe("Private Note Router Unit Tests", () => {
  test("should map endpoints paths to correct celebrate validations filters", () => {
    const mockController = { createNote: "c_post", getNotes: "c_get" };
    const mockValidations = {
      createNoteValidation: "v_post",
      connectRequestIdParamValidation: "v_param",
      noteIdParamValidation: "v_id",
    };

    createPrivateNoteRoutes(mockController, "auth_wall", mockValidations);
    expect(mockRouter.use).toHaveBeenCalledWith("auth_wall");
    expect(mockRouter.post).toHaveBeenCalledWith("/", "v_post", "c_post");
  });
});
