/**
 * @fileoverview Connection Request Router Unit Tests
 * @description Assures valid mapping assignments, verification middleware stacks,
 * and exact path execution sequencing completely in memory.
 */

const createConnectRequestRoutes = require("../../../routes/connectRequest.routes");

// Isolate the global router layer to monitor entry registration hooks
const mockRouter = {
  get: jest.fn(),
  post: jest.fn(),
  patch: jest.fn(),
  delete: jest.fn(),
};
jest.mock("express", () => ({
  Router: () => mockRouter,
}));

describe("Connection Request Router Unit Tests", () => {
  let mockControllers, mockMiddlewares, mockValidations;

  beforeEach(() => {
    mockControllers = {
      connectRequestController: {
        sendConnectRequest: jest.fn(),
        getMyRequests: jest.fn(),
        getIncomingRequests: jest.fn(),
        respondToRequest: jest.fn(),
        cancelRequest: jest.fn(),
        referRequest: jest.fn(),
        getOngoingConnects: jest.fn(),
        getConnectDetail: jest.fn(),
      },
      mentorReferController: {
        getSimilarMentors: jest.fn(),
      },
    };

    mockMiddlewares = {
      authenticate: "middleware_auth",
      requireRole: jest.fn((role) => `middleware_role_${role}`),
    };

    mockValidations = {
      sendConnectRequestValidation: "v_send",
      respondToRequestValidation: "v_respond",
      referRequestValidation: "v_refer",
      validateObjectId: "v_object_id",
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("should attach mentee transaction pathways along with schema validation guards", () => {
    createConnectRequestRoutes(
      mockControllers,
      mockMiddlewares,
      mockValidations,
    );

    expect(mockRouter.post).toHaveBeenCalledWith(
      "/",
      "middleware_auth",
      "v_send",
      mockControllers.connectRequestController.sendConnectRequest,
    );
    expect(mockRouter.get).toHaveBeenCalledWith(
      "/my-requests",
      "middleware_auth",
      mockControllers.connectRequestController.getMyRequests,
    );
  });

  test("should mount specialized mentor query and referral routes with role parameters", () => {
    createConnectRequestRoutes(
      mockControllers,
      mockMiddlewares,
      mockValidations,
    );

    expect(mockMiddlewares.requireRole).toHaveBeenCalledWith("mentor");

    // Verifies that getSimilarMentors still requires standalone object ID validation
    expect(mockRouter.get).toHaveBeenCalledWith(
      "/:id/similar-mentors",
      "middleware_auth",
      "middleware_role_mentor",
      "v_object_id",
      mockControllers.mentorReferController.getSimilarMentors,
    );

    // Verifies that /:id/refer does NOT use v_object_id separately because it's built into v_refer
    expect(mockRouter.patch).toHaveBeenCalledWith(
      "/:id/refer",
      "middleware_auth",
      "middleware_role_mentor",
      "v_refer",
      mockControllers.connectRequestController.referRequest,
    );
  });

  test("should bind generic fallback resource parameters below specific route match hooks", () => {
    createConnectRequestRoutes(
      mockControllers,
      mockMiddlewares,
      mockValidations,
    );

    // Verifies that patch /:id does NOT require a separate v_object_id anymore
    expect(mockRouter.patch).toHaveBeenCalledWith(
      "/:id",
      "middleware_auth",
      "v_respond",
      mockControllers.connectRequestController.respondToRequest,
    );

    expect(mockRouter.delete).toHaveBeenCalledWith(
      "/:id",
      "middleware_auth",
      "v_object_id",
      mockControllers.connectRequestController.cancelRequest,
    );
  });
});
