const createGoogleCalendarRoutes = require("../../../routes/googleCalendar.routes");

const mockRouter = { use: jest.fn(), get: jest.fn(), post: jest.fn() };
jest.mock("express", () => ({ Router: () => mockRouter }));

describe("Google Calendar Router Unit Tests", () => {
  test("should anchor integration parameters mapping public callback options outside protection fences", () => {
    const mockController = { handleCallback: "c_cb", getAuthUrl: "c_url" };
    const mockValidations = {
      handleCallbackValidation: "v_cb",
      getCalendarIntervalValidation: "v_interval",
    };

    createGoogleCalendarRoutes({ googleCalendarController: mockController, authenticate: "auth_guard", validations: mockValidations });

    expect(mockRouter.get).toHaveBeenCalledWith("/callback", "v_cb", "c_cb");
    expect(mockRouter.use).toHaveBeenCalledWith("auth_guard");
  });
});
