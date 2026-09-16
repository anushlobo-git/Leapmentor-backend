/**
 * @fileoverview Full statement/branch coverage suite for middleware/noteAccess.js
 */

jest.mock("../../../models/ConnectRequest", () => ({
  findById: jest.fn(),
}));
jest.mock("../../../models/Note", () => ({
  findById: jest.fn(),
}));

const ConnectRequest = require("../../../models/ConnectRequest");
const Note = require("../../../models/Note");
const {
  validateSessionMembership,
  validateNoteOwnership,
  requirePrivateOwnership,
} = require("../../../middleware/noteAccess");

describe("noteAccess middleware", () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    jest.clearAllMocks();
    req = { params: {}, body: {}, user: { _id: "u_1" } };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  const mockSessionQuery = (resolvedValue) => {
    ConnectRequest.findById.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue(resolvedValue),
    });
  };

  // ── validateSessionMembership ────────────────────────────────────────────
  describe("validateSessionMembership", () => {
    test("returns 400 when connectRequestId is missing from both params and body", async () => {
      await validateSessionMembership(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "connectRequestId is required",
        code: "MISSING_SESSION_ID",
      });
      expect(next).not.toHaveBeenCalled();
    });

    test("reads connectRequestId from req.body when params is absent", async () => {
      req.body.connectRequestId = "cr_1";
      mockSessionQuery(null);

      await validateSessionMembership(req, res, next);

      expect(ConnectRequest.findById).toHaveBeenCalledWith("cr_1");
    });

    test("returns 404 when the session does not exist", async () => {
      req.params.connectRequestId = "cr_1";
      mockSessionQuery(null);

      await validateSessionMembership(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: "Session not found",
        code: "SESSION_NOT_FOUND",
      });
    });

    test("returns 403 when the session status is not ongoing or completed", async () => {
      req.params.connectRequestId = "cr_1";
      mockSessionQuery({ mentor: "m_1", mentee: "u_1", status: "pending" });

      await validateSessionMembership(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        message: "Session is not active",
        code: "SESSION_INACTIVE",
      });
    });

    test("returns 403 when the requesting user is neither mentor nor mentee", async () => {
      req.params.connectRequestId = "cr_1";
      req.user._id = "stranger_1";
      mockSessionQuery({ mentor: "m_1", mentee: "u_1", status: "ongoing" });

      await validateSessionMembership(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        message: "You are not a participant of this session",
        code: "NOT_A_PARTICIPANT",
      });
    });

    test("attaches sessionRole 'mentor' and calls next when the caller is the mentor", async () => {
      req.params.connectRequestId = "cr_1";
      req.user._id = "m_1";
      const session = { mentor: "m_1", mentee: "u_1", status: "ongoing" };
      mockSessionQuery(session);

      await validateSessionMembership(req, res, next);

      expect(req.sessionRole).toBe("mentor");
      expect(req.connectRequest).toBe(session);
      expect(next).toHaveBeenCalled();
    });

    test("attaches sessionRole 'mentee' and calls next when the caller is the mentee (completed status also allowed)", async () => {
      req.params.connectRequestId = "cr_1";
      req.user._id = "u_1";
      const session = { mentor: "m_1", mentee: "u_1", status: "completed" };
      mockSessionQuery(session);

      await validateSessionMembership(req, res, next);

      expect(req.sessionRole).toBe("mentee");
      expect(next).toHaveBeenCalled();
    });

    test("returns 500 when an unexpected error is thrown", async () => {
      req.params.connectRequestId = "cr_1";
      ConnectRequest.findById.mockImplementation(() => {
        throw new Error("DB connection lost");
      });

      await validateSessionMembership(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: "DB connection lost",
      });
    });
  });

  // ── validateNoteOwnership ─────────────────────────────────────────────────
  describe("validateNoteOwnership", () => {
    test("returns 404 when the note does not exist", async () => {
      req.params.id = "note_1";
      Note.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      await validateNoteOwnership(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: "Note not found",
        code: "NOTE_NOT_FOUND",
      });
    });

    test("returns 404 (not 403) when the note exists but belongs to a different user", async () => {
      req.params.id = "note_1";
      req.user._id = "u_1";
      Note.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue({ uploadedBy: "someone_else" }),
      });

      await validateNoteOwnership(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: "Note not found",
        code: "NOTE_NOT_FOUND",
      });
      expect(next).not.toHaveBeenCalled();
    });

    test("attaches req.note and calls next when the caller is the note's author", async () => {
      req.params.id = "note_1";
      req.user._id = "u_1";
      const note = { uploadedBy: "u_1", title: "My note" };
      Note.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(note),
      });

      await validateNoteOwnership(req, res, next);

      expect(req.note).toBe(note);
      expect(next).toHaveBeenCalled();
    });

    test("returns 500 when an unexpected error is thrown", async () => {
      req.params.id = "note_1";
      Note.findById.mockImplementation(() => {
        throw new Error("Query timeout");
      });

      await validateNoteOwnership(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: "Query timeout" });
    });
  });

  // ── requirePrivateOwnership ───────────────────────────────────────────────
  describe("requirePrivateOwnership", () => {
    test("uses req.params.connectRequestId when present", () => {
      req.params.connectRequestId = "cr_from_params";
      req.body.connectRequestId = "cr_from_body";
      req.connectRequest = { _id: "cr_from_prior_middleware" };

      requirePrivateOwnership(req, res, next);

      expect(req.privateFilter).toEqual({
        connectRequest: "cr_from_params",
        uploadedBy: "u_1",
      });
      expect(next).toHaveBeenCalled();
    });

    test("falls back to req.body.connectRequestId when params is absent", () => {
      req.body.connectRequestId = "cr_from_body";
      req.connectRequest = { _id: "cr_from_prior_middleware" };

      requirePrivateOwnership(req, res, next);

      expect(req.privateFilter.connectRequest).toBe("cr_from_body");
      expect(next).toHaveBeenCalled();
    });

    test("falls back to req.connectRequest._id when both params and body are absent", () => {
      req.connectRequest = { _id: "cr_from_prior_middleware" };

      requirePrivateOwnership(req, res, next);

      expect(req.privateFilter.connectRequest).toBe("cr_from_prior_middleware");
      expect(next).toHaveBeenCalled();
    });

    test("results in undefined connectRequest when no source is available at all", () => {
      // req.connectRequest is undefined entirely (optional-chaining branch)
      requirePrivateOwnership(req, res, next);

      expect(req.privateFilter.connectRequest).toBeUndefined();
      expect(next).toHaveBeenCalled();
    });
  });
});
