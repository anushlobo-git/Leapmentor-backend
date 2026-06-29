const createMessageRoutes = require("../../../routes/message.routes");

const mockRouter = { use: jest.fn(), get: jest.fn() };
jest.mock("express", () => ({ Router: () => mockRouter }));

describe("Message Router Unit Tests", () => {
  test("should assert target endpoints registration blocks correct validation shields", () => {
    const mockController = { getMessages: "c_get", getUnreadCount: "c_unread" };
    const mockValidations = {
      getMessagesValidation: "v_get",
      getUnreadCountValidation: "v_unread",
    };

    createMessageRoutes({ messageController: mockController, authenticate: "auth_guard", validations: mockValidations });
    expect(mockRouter.use).toHaveBeenCalledWith("auth_guard");
    expect(mockRouter.get).toHaveBeenCalledWith(
      "/:connectRequestId",
      "v_get",
      "c_get",
    );
  });
});
