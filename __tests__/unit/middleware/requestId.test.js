/**
 * @fileoverview Full statement/branch coverage suite for middleware/requestId.js
 */

jest.mock("uuid", () => ({
  v4: jest.fn(),
}));

const { v4: uuidv4 } = require("uuid");
const asyncLocalStorage = require("../../../config/context");
const requestId = require("../../../middleware/requestId");

describe("requestId middleware", () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    jest.clearAllMocks();
    req = { headers: {} };
    res = { setHeader: jest.fn() };
    next = jest.fn();
  });

  test("uses the incoming x-correlation-id header when present", () => {
    req.headers["x-correlation-id"] = "incoming-correlation-id";

    requestId(req, res, next);

    expect(uuidv4).not.toHaveBeenCalled();
    expect(req.correlationId).toBe("incoming-correlation-id");
    expect(res.setHeader).toHaveBeenCalledWith(
      "X-Correlation-ID",
      "incoming-correlation-id",
    );
  });

  test("generates a new uuid when the x-correlation-id header is absent", () => {
    uuidv4.mockReturnValue("generated-uuid-1234");

    requestId(req, res, next);

    expect(uuidv4).toHaveBeenCalledTimes(1);
    expect(req.correlationId).toBe("generated-uuid-1234");
    expect(res.setHeader).toHaveBeenCalledWith(
      "X-Correlation-ID",
      "generated-uuid-1234",
    );
  });

  test("generates a new uuid when the x-correlation-id header is an empty string (falsy)", () => {
    req.headers["x-correlation-id"] = "";
    uuidv4.mockReturnValue("generated-uuid-5678");

    requestId(req, res, next);

    expect(uuidv4).toHaveBeenCalledTimes(1);
    expect(req.correlationId).toBe("generated-uuid-5678");
  });

  test("calls next() inside the AsyncLocalStorage run context", () => {
    uuidv4.mockReturnValue("generated-uuid-9999");

    requestId(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  test("makes the correlationId available via asyncLocalStorage.getStore() during the request", () => {
    req.headers["x-correlation-id"] = "trace-me";
    let capturedStore;
    next.mockImplementation(() => {
      capturedStore = asyncLocalStorage.getStore();
    });

    requestId(req, res, next);

    expect(capturedStore).toEqual({ correlationId: "trace-me" });
  });
});
