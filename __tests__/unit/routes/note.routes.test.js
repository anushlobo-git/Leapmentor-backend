const createNoteRoutes = require("../../../routes/note.routes");

const mockRouter = {
  use: jest.fn(),
  get: jest.fn(),
  post: jest.fn(),
  delete: jest.fn(),
};
jest.mock("express", () => ({ Router: () => mockRouter }));

describe("Note Router Unit Tests", () => {
  test("should anchor specific validation masks to pipeline hooks execution paths", () => {
    const mockController = { uploadNote: "c_up", getNotes: "c_get" };
    const mockMiddlewares = {
      authenticate: "auth_wall",
      upload: { single: jest.fn(() => "multer_intercept") },
    };
    const mockValidations = {
      uploadNoteValidation: "v_up",
      connectRequestIdParamValidation: "v_param",
      noteIdParamValidation: "v_del",
    };

    createNoteRoutes(mockController, mockMiddlewares, mockValidations);
    expect(mockRouter.use).toHaveBeenCalledWith("auth_wall");
    expect(mockRouter.post).toHaveBeenCalledWith(
      "/upload",
      "multer_intercept",
      "v_up",
      "c_up",
    );
  });
});
