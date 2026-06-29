/**
 * @fileoverview Escrow Router Unit Tests
 * @description Assures valid alignment of HTTP methods, path strings, global security walls,
 * and celebrate request payload mapping validations completely in memory.
 */

const createEscrowRoutes = require("../../../routes/escrow.routes");

// Isolate the Express Router engine to audit registered route endpoints
const mockRouter = {
  use: jest.fn(),
  get: jest.fn(),
  post: jest.fn(),
};
jest.mock("express", () => ({
  Router: () => mockRouter,
}));

describe("Escrow Router Unit Tests", () => {
  let mockController, mockAuthenticate, mockValidations;

  beforeEach(() => {
    mockController = {
      pay: jest.fn(),
      payAdditional: jest.fn(),
      release: jest.fn(),
      refund: jest.fn(),
      getStatus: jest.fn(),
      getMyWallet: jest.fn(),
      getCommissionRate: jest.fn(),
    };

    mockAuthenticate = "middleware_authentication_token_guard";

    mockValidations = {
      payValidation: "celebrate_pay_shield",
      payAdditionalValidation: "celebrate_pay_additional_shield",
      escrowRequestIdParamsValidation: "celebrate_params_request_id_shield",
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("should mount global authentication protection across all downstream endpoints", () => {
    createEscrowRoutes({ escrowController: mockController, authenticate: mockAuthenticate, validations: mockValidations });

    expect(mockRouter.use).toHaveBeenCalledWith(
      "middleware_authentication_token_guard",
    );
  });

  test("should enforce structured payload checks on token commitments and add-on sessions", () => {
    createEscrowRoutes({ escrowController: mockController, authenticate: mockAuthenticate, validations: mockValidations });

    expect(mockRouter.post).toHaveBeenCalledWith(
      "/pay",
      "celebrate_pay_shield",
      mockController.pay,
    );
    expect(mockRouter.post).toHaveBeenCalledWith(
      "/pay-additional",
      "celebrate_pay_additional_shield",
      mockController.payAdditional,
    );
  });

  test("should enforce path parameter verification on mutations and active resource state checks", () => {
    createEscrowRoutes({ escrowController: mockController, authenticate: mockAuthenticate, validations: mockValidations });

    expect(mockRouter.post).toHaveBeenCalledWith(
      "/release/:requestId",
      "celebrate_params_request_id_shield",
      mockController.release,
    );
    expect(mockRouter.post).toHaveBeenCalledWith(
      "/refund/:requestId",
      "celebrate_params_request_id_shield",
      mockController.refund,
    );
    expect(mockRouter.get).toHaveBeenCalledWith(
      "/status/:requestId",
      "celebrate_params_request_id_shield",
      mockController.getStatus,
    );
  });

  test("should mount balance tracking and commission query routes cleanly", () => {
    createEscrowRoutes({ escrowController: mockController, authenticate: mockAuthenticate, validations: mockValidations });

    expect(mockRouter.get).toHaveBeenCalledWith(
      "/wallet",
      mockController.getMyWallet,
    );
    expect(mockRouter.get).toHaveBeenCalledWith(
      "/commission-rate",
      mockController.getCommissionRate,
    );
  });
});
