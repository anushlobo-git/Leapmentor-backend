/**
 * @fileoverview Mentor Availability Router Unit Tests
 * @description Assures valid alignment of HTTP methods, path strings, and security middleware bounds.
 */

const createAvailabilityRoutes = require("../../../routes/availability.routes");

// Isolate the router layer to monitor endpoint registration hooks
const mockRouter = {
  get: jest.fn(),
  post: jest.fn(),
  patch: jest.fn(),
  delete: jest.fn(),
};
jest.mock("express", () => ({
  Router: () => mockRouter,
}));

describe("Mentor Availability Router Unit Tests", () => {
  let mockController;
  let mockAuthenticate;

  beforeEach(() => {
    mockController = {
      getMyAvailability: jest.fn(),
      createAvailability: jest.fn(),
      updateAvailability: jest.fn(),
      deleteAvailability: jest.fn(),
      getAvailableSlots: jest.fn(),
      getMentorAvailability: jest.fn(),
    };
    mockAuthenticate = (req, res, next) => next();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("should enforce token authentication guards on private mentor profile schedules", () => {
    createAvailabilityRoutes(mockController, mockAuthenticate);

    expect(mockRouter.get).toHaveBeenCalledWith(
      "/me",
      mockAuthenticate,
      mockController.getMyAvailability,
    );
    expect(mockRouter.post).toHaveBeenCalledWith(
      "/",
      mockAuthenticate,
      mockController.createAvailability,
    );
    expect(mockRouter.patch).toHaveBeenCalledWith(
      "/me",
      mockAuthenticate,
      mockController.updateAvailability,
    );
    expect(mockRouter.delete).toHaveBeenCalledWith(
      "/me",
      mockAuthenticate,
      mockController.deleteAvailability,
    );
  });

  test("should pass authentication guards into calculation paths and keep public lookup open", () => {
    createAvailabilityRoutes(mockController, mockAuthenticate);

    // Private slot evaluation pathway requires validation
    expect(mockRouter.get).toHaveBeenCalledWith(
      "/:mentorId/slots",
      mockAuthenticate,
      mockController.getAvailableSlots,
    );

    // Public visualization parameters skip security walls
    expect(mockRouter.get).toHaveBeenCalledWith(
      "/:mentorId",
      mockController.getMentorAvailability,
    );
  });
});
