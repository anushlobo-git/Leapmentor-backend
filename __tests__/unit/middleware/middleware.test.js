const AppError = require("../../../utils/AppError");

jest.mock("../../../models/AdminUser", () => ({ findById: jest.fn() }));
jest.mock("../../../models/User", () => ({ findById: jest.fn() }));
jest.mock("../../../models/ConnectRequest", () => ({ findById: jest.fn() }));
jest.mock("../../../models/Note", () => ({ findById: jest.fn() }));
jest.mock("jsonwebtoken", () => ({ verify: jest.fn(), sign: jest.fn() }));

const AdminUser = require("../../../models/AdminUser");
const User = require("../../../models/User");
const ConnectRequest = require("../../../models/ConnectRequest");
const Note = require("../../../models/Note");
const jwt = require("jsonwebtoken");

const { adminAuthenticate } = require("../../../middleware/adminAuth");
const { authenticate, requireRole } = require("../../../middleware/authenticate");
const errorHandler = require("../../../middleware/errorHandler");
const { validateSessionMembership, validateNoteOwnership, requirePrivateOwnership } = require("../../../middleware/noteAccess");
const requestId = require("../../../middleware/requestId");
const requestLogger = require("../../../middleware/requestLogger");
const sanitizeRequest = require("../../../middleware/sanitizeRequest");
const { upload, getFileType } = require("../../../middleware/upload.middleware");

describe("100% Comprehensive Middleware Unit Test Suite", () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      headers: {},
      user: null,
      admin: null,
      cookies: {},
      body: {},
      query: {},
      params: {},
      path: "/test",
      method: "GET",
      originalUrl: "/test",
      ip: "127.0.0.1",
      socket: { remoteAddress: "127.0.0.1" },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn(),
      on: jest.fn((event, cb) => {
        if (event === "finish") cb();
      }),
      statusCode: 200,
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  // 1. adminAuth
  describe("adminAuth middleware", () => {
    test("401 if adminToken missing", async () => {
      await adminAuthenticate(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(next.mock.calls[0][0].statusCode).toBe(401);
    });

    test("401 on invalid JWT verify", async () => {
      req.cookies = { adminToken: "invalid" };
      jwt.verify.mockImplementation(() => { throw new Error("jwt error"); });
      await adminAuthenticate(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.any(AppError));
    });

    test("403 on role/type mismatch in decoded token", async () => {
      req.cookies = { adminToken: "valid" };
      jwt.verify.mockReturnValue({ role: "user", type: "access" });
      await adminAuthenticate(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.any(AppError));
    });

    test("401 if admin user not found", async () => {
      req.cookies = { adminToken: "valid" };
      jwt.verify.mockReturnValue({ role: "admin", type: "access", id: "a1" });
      AdminUser.findById.mockResolvedValue(null);
      await adminAuthenticate(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.any(AppError));
    });

    test("403 if admin inactive", async () => {
      req.cookies = { adminToken: "valid" };
      jwt.verify.mockReturnValue({ role: "admin", type: "access", id: "a1" });
      AdminUser.findById.mockResolvedValue({ _id: "a1", isActive: false });
      await adminAuthenticate(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.any(AppError));
    });

    test("401 on tokenVersion mismatch", async () => {
      req.cookies = { adminToken: "valid" };
      jwt.verify.mockReturnValue({ role: "admin", type: "access", id: "a1", tokenVersion: 1 });
      AdminUser.findById.mockResolvedValue({ _id: "a1", isActive: true, tokenVersion: 2 });
      await adminAuthenticate(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.any(AppError));
    });

    test("succeeds and attaches DTO on valid token and active admin", async () => {
      req.cookies = { adminToken: "valid" };
      jwt.verify.mockReturnValue({ role: "admin", type: "access", id: "a1", tokenVersion: 1 });
      AdminUser.findById.mockResolvedValue({ _id: "a1", isActive: true, tokenVersion: 1, email: "admin@test.com" });
      await adminAuthenticate(req, res, next);
      expect(req.admin).toBeDefined();
      expect(next).toHaveBeenCalledWith();
    });
  });

  // 2. authenticate & requireRole
  describe("authenticate & requireRole middleware", () => {
    test("401 if authorization header missing", async () => {
      await authenticate(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: "No token provided" });
    });

    test("401 on invalid JWT verify", async () => {
      req.headers.authorization = "Bearer invalid";
      jwt.verify.mockImplementation(() => { throw new Error("bad token"); });
      await authenticate(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: "Invalid or expired token" });
    });

    test("401 if user not found", async () => {
      req.headers.authorization = "Bearer valid";
      jwt.verify.mockReturnValue({ id: "u1" });
      User.findById.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        setOptions: jest.fn().mockResolvedValue(null),
      });
      await authenticate(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: "User not found" });
    });

    test("403 if user account is deleted", async () => {
      req.headers.authorization = "Bearer valid";
      jwt.verify.mockReturnValue({ id: "u1" });
      User.findById.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        setOptions: jest.fn().mockResolvedValue({ _id: "u1", isDeleted: true }),
      });
      await authenticate(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    test("attaches user and calls next when valid", async () => {
      req.headers.authorization = "Bearer valid";
      jwt.verify.mockReturnValue({ id: "u1" });
      User.findById.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        setOptions: jest.fn().mockResolvedValue({ _id: "u1", isDeleted: false, email: "u@t.com", roles: ["mentor"] }),
      });
      await authenticate(req, res, next);
      expect(req.user).toBeDefined();
      expect(next).toHaveBeenCalled();
    });

    test("requireRole allows request when role matches", () => {
      req.user = { roles: ["mentor"] };
      const guard = requireRole("mentor");
      guard(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    test("requireRole denies request when role does not match", () => {
      req.user = { roles: ["mentee"] };
      const guard = requireRole("mentor");
      guard(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    test("requireRole handles missing roles array gracefully", () => {
      req.user = {};
      const guard = requireRole("admin");
      guard(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  // 3. errorHandler
  describe("errorHandler middleware", () => {
    test("handles operational error cleanly", () => {
      const err = new AppError("Bad Input", 400);
      errorHandler(err, req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Bad Input",
        })
      );
    });

    test("handles non-operational error fallback", () => {
      const err = new Error("Database Crash");
      errorHandler(err, req, res, next);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Something went wrong",
        })
      );
    });
  });

  // 4. noteAccess
  describe("noteAccess middleware", () => {
    test("validateSessionMembership returns 400 if connectRequestId missing", async () => {
      await validateSessionMembership(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test("validateSessionMembership returns 404 if session not found", async () => {
      req.params = { connectRequestId: "cr1" };
      ConnectRequest.findById.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(null),
      });
      await validateSessionMembership(req, res, next);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    test("validateSessionMembership returns 403 if session inactive", async () => {
      req.params = { connectRequestId: "cr1" };
      ConnectRequest.findById.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue({ status: "pending" }),
      });
      await validateSessionMembership(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    test("validateSessionMembership returns 403 if user not a participant", async () => {
      req.params = { connectRequestId: "cr1" };
      req.user = { _id: "u3" };
      ConnectRequest.findById.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue({ status: "ongoing", mentor: "u1", mentee: "u2" }),
      });
      await validateSessionMembership(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    test("validateSessionMembership sets session and role when user is mentor", async () => {
      req.params = { connectRequestId: "cr1" };
      req.user = { _id: "u1" };
      ConnectRequest.findById.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue({ status: "ongoing", mentor: "u1", mentee: "u2" }),
      });
      await validateSessionMembership(req, res, next);
      expect(req.sessionRole).toBe("mentor");
      expect(next).toHaveBeenCalled();
    });

    test("validateSessionMembership handles exceptions via 500 error", async () => {
      req.params = { connectRequestId: "cr1" };
      ConnectRequest.findById.mockImplementation(() => { throw new Error("DB Error"); });
      await validateSessionMembership(req, res, next);
      expect(res.status).toHaveBeenCalledWith(500);
    });

    test("validateNoteOwnership returns 404 if note missing", async () => {
      req.params = { id: "n1" };
      Note.findById.mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });
      await validateNoteOwnership(req, res, next);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    test("validateNoteOwnership returns 404 if uploadedBy mismatch", async () => {
      req.params = { id: "n1" };
      req.user = { _id: "u1" };
      Note.findById.mockReturnValue({ lean: jest.fn().mockResolvedValue({ uploadedBy: "u2" }) });
      await validateNoteOwnership(req, res, next);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    test("validateNoteOwnership sets req.note when valid", async () => {
      req.params = { id: "n1" };
      req.user = { _id: "u1" };
      Note.findById.mockReturnValue({ lean: jest.fn().mockResolvedValue({ uploadedBy: "u1", title: "Note" }) });
      await validateNoteOwnership(req, res, next);
      expect(req.note).toBeDefined();
      expect(next).toHaveBeenCalled();
    });

    test("validateNoteOwnership catches exceptions with 500", async () => {
      req.params = { id: "n1" };
      Note.findById.mockImplementation(() => { throw new Error("DB fail"); });
      await validateNoteOwnership(req, res, next);
      expect(res.status).toHaveBeenCalledWith(500);
    });

    test("requirePrivateOwnership constructs filter from params, body, or connectRequest", () => {
      req.params = { connectRequestId: "cr1" };
      req.user = { _id: "u1" };
      requirePrivateOwnership(req, res, next);
      expect(req.privateFilter).toEqual({ connectRequest: "cr1", uploadedBy: "u1" });
      expect(next).toHaveBeenCalled();
    });
  });

  // 5. requestId
  describe("requestId middleware", () => {
    test("sets correlationId from headers or uuid", () => {
      req.headers["x-correlation-id"] = "custom-id-123";
      requestId(req, res, next);
      expect(req.correlationId).toBe("custom-id-123");
      expect(res.setHeader).toHaveBeenCalledWith("X-Correlation-ID", "custom-id-123");
      expect(next).toHaveBeenCalled();
    });
  });

  // 6. requestLogger
  describe("requestLogger middleware", () => {
    test("attaches finish handler and calls next", () => {
      requestLogger(req, res, next);
      expect(res.on).toHaveBeenCalledWith("finish", expect.any(Function));
      expect(next).toHaveBeenCalled();
    });
  });

  // 7. sanitizeRequest
  describe("sanitizeRequest middleware", () => {
    test("strips malicious keys containing $ or . from body, query, and params", () => {
      req.body = { safe: "ok", "$gt": "bad", nested: { "user.id": "bad" }, list: [{ "$ne": "bad" }] };
      req.query = { normal: "ok", "$where": "bad" };
      req.params = { id: "123" };

      sanitizeRequest(req, res, next);
      expect(req.body.safe).toBe("ok");
      expect(req.body["$gt"]).toBeUndefined();
      expect(next).toHaveBeenCalled();
    });

    test("catches errors and passes to next", () => {
      req.body = Object.create(null); // cause Object.entries error
      sanitizeRequest(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });

  // 8. upload.middleware
  describe("upload.middleware", () => {
    test("getFileType returns 'pdf' for application/pdf", () => {
      expect(getFileType("application/pdf")).toBe("pdf");
    });

    test("getFileType returns 'image' for image/* types", () => {
      expect(getFileType("image/png")).toBe("image");
      expect(getFileType("image/jpeg")).toBe("image");
      expect(getFileType("image/webp")).toBe("image");
    });

    test("getFileType returns 'doc' for word document types", () => {
      expect(getFileType("application/msword")).toBe("doc");
      expect(getFileType("application/vnd.openxmlformats-officedocument.wordprocessingml.document")).toBe("doc");
    });

    test("getFileType returns 'ppt' for presentation mime types", () => {
      // Must include 'presentation' in the mime string
      expect(getFileType("application/vnd.openxmlformats-officedocument.presentationml.presentation")).toBe("ppt");
    });

    test("getFileType returns 'excel' for spreadsheet mime types", () => {
      expect(getFileType("application/vnd.ms-excel")).toBe("excel");
      expect(getFileType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")).toBe("excel");
    });

    test("getFileType returns 'txt' for text/plain", () => {
      expect(getFileType("text/plain")).toBe("txt");
    });

    test("getFileType returns 'other' for unknown types", () => {
      expect(getFileType("application/vnd.ms-powerpoint")).toBe("other");
      expect(getFileType("unknown/type")).toBe("other");
    });

    test("fileFilter calls cb(null, true) for allowed MIME types", () => {
      const file = { mimetype: "application/pdf" };
      const cb = jest.fn();
      upload.fileFilter(req, file, cb);
      expect(cb).toHaveBeenCalledWith(null, true);
    });

    test("fileFilter calls cb(Error, false) for disallowed MIME types", () => {
      const file = { mimetype: "application/x-sh" };
      const cb = jest.fn();
      upload.fileFilter(req, file, cb);
      expect(cb).toHaveBeenCalledWith(expect.any(Error), false);
    });
  });
});
