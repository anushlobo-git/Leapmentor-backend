/**
 * @fileoverview User Real-time Alerts and Notifications Router Unit Tests
 * @description Assures valid alignment of HTTP methods, parameter constraints,
 * celebrate validation shields, and global identity walls completely in memory.
 */

const createNotificationRoutes = require("../../../routes/notification.routes");

// Isolate the global express router layer to monitor endpoint registration hooks
const mockRouter = {
  use: jest.fn(),
  get: jest.fn(),
  patch: jest.fn(),
  delete: jest.fn(),
};

jest.mock("express", () => ({
  Router: () => mockRouter,
}));

describe("User Real-time Alerts Router Configuration Matrix", () => {
  let mockNotificationController;
  let mockAuthenticate;
  let mockValidations;

  beforeEach(() => {
    mockNotificationController = {
      getNotifications: jest.fn(),
      markAllRead: jest.fn(),
      markOneRead: jest.fn(),
      clearAll: jest.fn(),
      deleteNotification: jest.fn(),
    };

    mockAuthenticate = jest.fn();

    mockValidations = {
      notificationIdParamValidation: "celebrate_notification_id_param_shield",
    };

    // Instantiate the route factory using destructured configuration arguments
    createNotificationRoutes({
      notificationController: mockNotificationController,
      authenticate: mockAuthenticate,
      validations: mockValidations,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Security Firewall Gateways", () => {
    test("should mount mandatory passport identity checks immediately at the root threshold", () => {
      expect(mockRouter.use).toHaveBeenCalledWith(mockAuthenticate);
    });
  });

  describe("Alert Streaming & Mutation Endpoint Mappings", () => {
    test("should bind raw notification collection queries to the root path using GET", () => {
      expect(mockRouter.get).toHaveBeenCalledWith(
        "/",
        mockNotificationController.getNotifications,
      );
    });

    test("should bind mass-read updates to the /mark-all-read token path using PATCH", () => {
      expect(mockRouter.patch).toHaveBeenCalledWith(
        "/mark-all-read",
        mockNotificationController.markAllRead,
      );
    });

    test("should bind unique target status updates to validation shields and param paths using PATCH", () => {
      expect(mockRouter.patch).toHaveBeenCalledWith(
        "/:id/read",
        "celebrate_notification_id_param_shield",
        mockNotificationController.markOneRead,
      );
    });

    test("should bind mass inbox purges to the /clear-all token path using DELETE", () => {
      expect(mockRouter.delete).toHaveBeenCalledWith(
        "/clear-all",
        mockNotificationController.clearAll,
      );
    });

    test("should bind unique document evictions to validation shields and param paths using DELETE", () => {
      expect(mockRouter.delete).toHaveBeenCalledWith(
        "/:id",
        "celebrate_notification_id_param_shield",
        mockNotificationController.deleteNotification,
      );
    });
  });
});
