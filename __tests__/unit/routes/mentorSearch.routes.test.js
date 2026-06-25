/**
 * @fileoverview Mentor Search Router Configuration Unit Tests
 * @description Validates role checkpoints, URL paths registrations, and celebrate guards sequences.
 */

const createMentorSearchRoutes = require("../../../routes/mentorSearch.routes");

const mockRouter = { use: jest.fn(), get: jest.fn() };
jest.mock("express", () => ({ Router: () => mockRouter }));

describe("Mentor Search Router Unit Tests", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test("should enforce security gates and mount verification checks sequentially", () => {
    const mockController = { searchMentors: "c_search" };
    const mockMiddlewares = {
      authenticate: "jwt",
      requireRole: jest.fn(() => "mentee_guard"),
    };
    const mockValidations = { searchMentorsValidation: "v_search" };

    createMentorSearchRoutes(mockController, mockMiddlewares, mockValidations);

    // Realigned to expect "mentee_guard" exactly as returned by the mock wrapper above
    expect(mockRouter.use).toHaveBeenCalledWith("jwt", "mentee_guard");
    expect(mockRouter.get).toHaveBeenCalledWith(
      "/search",
      "v_search",
      "c_search",
    );
  });
});
