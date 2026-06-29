/**
 * @fileoverview HelpCenter Ingestion & Ticket Management Router Unit Tests
 * @description Confirms endpoint mapping configurations, specific path-scoped
 * admin middleware application, and celebrate schemas validation injection.
 */

const createSupportRoutes = require("../../../routes/support.routes");

// Isolate the global express router layer to monitor endpoint registration hooks
const mockRouter = {
  post: jest.fn(),
  get: jest.fn(),
  patch: jest.fn(),
  use: jest.fn(),
};

jest.mock("express", () => ({
  Router: () => mockRouter,
}));

describe("Support HelpCenter Router Configuration Matrix", () => {
  let mockSupportController;
  let mockAdminAuthenticate;
  let mockValidations;

  beforeEach(() => {
    mockSupportController = {
      createMessage: jest.fn(),
      getMessages: jest.fn(),
      resolveMessage: jest.fn(),
    };

    mockAdminAuthenticate = jest.fn();

    mockValidations = {
      createMessageValidation: "celebrate_create_message_shield",
      resolveMessageValidation: "celebrate_resolve_message_shield",
    };

    // Instantiate using destructured configuration arguments
    createSupportRoutes({
      supportController: mockSupportController,
      adminAuthenticate: mockAdminAuthenticate,
      validations: mockValidations,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Public Endpoint Ingestion Mappings", () => {
    test("should bind open out-of-band message creation requests without base auth guards using POST", () => {
      expect(mockRouter.post).toHaveBeenCalledWith(
        "/messages",
        "celebrate_create_message_shield",
        mockSupportController.createMessage,
      );
    });
  });

  describe("Secured Administrative Management Segments", () => {
    test("should scope the administrative authentication guard strictly to the /messages pathway", () => {
      expect(mockRouter.use).toHaveBeenCalledWith(
        "/messages",
        mockAdminAuthenticate,
      );
    });

    test("should bind administrative message lookup queries behind the admin guard using GET", () => {
      expect(mockRouter.get).toHaveBeenCalledWith(
        "/messages",
        mockSupportController.getMessages,
      );
    });

    test("should bind unique message resolution blocks behind validation parameter shields using PATCH", () => {
      expect(mockRouter.patch).toHaveBeenCalledWith(
        "/messages/:id/resolve",
        "celebrate_resolve_message_shield",
        mockSupportController.resolveMessage,
      );
    });
  });
});
