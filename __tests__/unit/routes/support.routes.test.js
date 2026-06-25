const createSupportRoutes = require("../../../routes/support.routes");

const mockRouter = {
  get: jest.fn(),
  post: jest.fn(),
  patch: jest.fn(),
  use: jest.fn(),
};
jest.mock("express", () => ({ Router: () => mockRouter }));

describe("Support Router Unit Tests", () => {
  test("should assert endpoint pathways apply correct celebrate schema verification filters", () => {
    const mockController = {
      createMessage: "c_post",
      getMessages: "c_get",
      resolveMessage: "c_patch",
    };
    const mockValidations = {
      createMessageValidation: "v_post",
      resolveMessageValidation: "v_patch",
    };

    createSupportRoutes(mockController, "admin_auth_wall", mockValidations);
    expect(mockRouter.post).toHaveBeenCalledWith(
      "/messages",
      "v_post",
      "c_post",
    );
    expect(mockRouter.use).toHaveBeenCalledWith("/messages", "admin_auth_wall");
    expect(mockRouter.patch).toHaveBeenCalledWith(
      "/messages/:id/resolve",
      "v_patch",
      "c_patch",
    );
  });
});
