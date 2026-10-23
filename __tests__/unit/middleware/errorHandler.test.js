/**
 * @fileoverview Full statement/branch coverage suite for middleware/errorHandler.js
 */

jest.mock("../../../config/logger", () => ({
  error: jest.fn(),
}));

// env is mocked per-test via jest.doMock + isolateModules so we can flip
// nodeEnv between "development" and "production" without cross-test bleed.

describe("errorHandler middleware", () => {
  let mockRes;
  let mockReq;
  let mockNext;

  beforeEach(() => {
    jest.resetModules();
    mockReq = { originalUrl: "/api/test-route" };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  const loadHandlerWithEnv = (nodeEnv) => {
    jest.doMock("../../../config/env", () => ({ nodeEnv }));
    jest.doMock("../../../config/logger", () => ({ error: jest.fn() }));
    // eslint-disable-next-line global-require
    const errorHandler = require("../../../middleware/errorHandler");
    // eslint-disable-next-line global-require
    const logger = require("../../../config/logger");
    return { errorHandler, logger };
  };

  test("logs the unhandled error with message, stack, status, and request URL", () => {
    const { errorHandler, logger } = loadHandlerWithEnv("production");
    const err = new Error("Boom");
    err.stack = "Error: Boom\n    at somewhere.js:1:1";

    errorHandler(err, mockReq, mockRes, mockNext);

    expect(logger.error).toHaveBeenCalledWith("Unhandled error", {
      message: "Boom",
      stack: err.stack,
      status: 500,
      url: "/api/test-route",
    });
  });

  test("defaults statusCode to 500 when err.statusCode is not set", () => {
    const { errorHandler } = loadHandlerWithEnv("production");
    const err = new Error("No status here");

    errorHandler(err, mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(500);
  });

  test("uses err.statusCode when provided", () => {
    const { errorHandler } = loadHandlerWithEnv("production");
    const err = new Error("Not found");
    err.statusCode = 404;

    errorHandler(err, mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(404);
  });

  test("uses err.message when the error is operational", () => {
    const { errorHandler } = loadHandlerWithEnv("production");
    const err = new Error("Validation failed: name is required");
    err.isOperational = true;
    err.statusCode = 400;

    errorHandler(err, mockReq, mockRes, mockNext);

    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Validation failed: name is required",
      }),
    );
  });

  test("masks the message with a generic string when the error is not operational", () => {
    const { errorHandler } = loadHandlerWithEnv("production");
    const err = new Error("some internal db connection string leaked");
    err.isOperational = false;

    errorHandler(err, mockReq, mockRes, mockNext);

    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Something went wrong" }),
    );
  });

  test("also masks the message when isOperational is undefined (falsy default)", () => {
    const { errorHandler } = loadHandlerWithEnv("production");
    const err = new Error("unexpected crash");

    errorHandler(err, mockReq, mockRes, mockNext);

    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Something went wrong" }),
    );
  });

  test("includes err.error when the error is operational and carries a structured error payload", () => {
    const { errorHandler } = loadHandlerWithEnv("production");
    const err = new Error("Validation failed");
    err.isOperational = true;
    err.error = { field: "email", reason: "invalid format" };

    errorHandler(err, mockReq, mockRes, mockNext);

    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: { field: "email", reason: "invalid format" },
      }),
    );
  });

  test("falls back to null for error payload when operational but err.error is not set", () => {
    const { errorHandler } = loadHandlerWithEnv("production");
    const err = new Error("Validation failed");
    err.isOperational = true;
    // err.error intentionally omitted

    errorHandler(err, mockReq, mockRes, mockNext);

    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: null }),
    );
  });

  test("sets error payload to null when the error is not operational, even if err.error is set", () => {
    const { errorHandler } = loadHandlerWithEnv("production");
    const err = new Error("Internal failure");
    err.isOperational = false;
    err.error = { leaked: "internal detail" };

    errorHandler(err, mockReq, mockRes, mockNext);

    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: null }),
    );
  });

  test("always sets success to false and data to null", () => {
    const { errorHandler } = loadHandlerWithEnv("production");
    const err = new Error("Anything");

    errorHandler(err, mockReq, mockRes, mockNext);

    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, data: null }),
    );
  });

  test("omits the stack trace from the response body when nodeEnv is production", () => {
    const { errorHandler } = loadHandlerWithEnv("production");
    const err = new Error("Prod error");
    err.stack = "Error: Prod error\n    at prodFile.js:10:5";

    errorHandler(err, mockReq, mockRes, mockNext);

    const jsonPayload = mockRes.json.mock.calls[0][0];
    expect(jsonPayload).not.toHaveProperty("stack");
  });

  test("includes the stack trace in the response body when nodeEnv is development", () => {
    const { errorHandler } = loadHandlerWithEnv("development");
    const err = new Error("Dev error");
    err.stack = "Error: Dev error\n    at devFile.js:20:3";

    errorHandler(err, mockReq, mockRes, mockNext);

    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({ stack: err.stack }),
    );
  });

  test("does not include the stack trace for any other nodeEnv value (e.g. test)", () => {
    const { errorHandler } = loadHandlerWithEnv("test");
    const err = new Error("Test-env error");
    err.stack = "Error: Test-env error\n    at testFile.js:1:1";

    errorHandler(err, mockReq, mockRes, mockNext);

    const jsonPayload = mockRes.json.mock.calls[0][0];
    expect(jsonPayload).not.toHaveProperty("stack");
  });

  test("does not call next()", () => {
    const { errorHandler } = loadHandlerWithEnv("production");
    const err = new Error("Anything");

    errorHandler(err, mockReq, mockRes, mockNext);

    expect(mockNext).not.toHaveBeenCalled();
  });
});
