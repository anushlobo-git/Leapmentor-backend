const createNotificationRoutes = require("../../../routes/notification.routes");

const mockRouter = {
  use: jest.fn(),
  get: jest.fn(),
  patch: jest.fn(),
  delete: jest.fn(),
};
jest.mock("express", () => ({ Router: () => mockRouter }));

describe("Notification Router Unit Tests", () => {
  test("should assert router paths mount explicit validation shields", () => {
    const mockController = { getNotifications: "c1", markOneRead: "c2" };
    const mockValidations = { notificationIdParamValidation: "v_param" };

    createNotificationRoutes(mockController, "auth_guard", mockValidations);
    expect(mockRouter.use).toHaveBeenCalledWith("auth_guard");
    expect(mockRouter.patch).toHaveBeenCalledWith("/:id/read", "v_param", "c2");
  });
});
