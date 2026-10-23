/**
 * @fileoverview User Self-Service Controller Unit Tests
 * @description Covers GET /me (now routed through the DTO mapper instead of
 * returning the raw Mongoose document) and the new PATCH /me/roles action.
 */

const createUserController = require("../../../controllers/user.controller");
const { successEnvelope } = require("../../helpers/apiResponse");

const flushPromises = () => new Promise(setImmediate);

describe("User Controller Unit Tests", () => {
  let mockAuthService;
  let controller;
  let req, res, next;

  beforeEach(() => {
    mockAuthService = {
      addAccountRole: jest.fn(),
    };
    controller = createUserController({ authService: mockAuthService });

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  describe("getMe", () => {
    test("returns the caller's own profile through the DTO mapper (never the raw document)", async () => {
      req = {
        user: {
          _id: "u1",
          name: "Test User",
          email: "t@example.com",
          roles: ["mentee"],
          password: "should-never-appear",
          isDeleted: false,
        },
      };

      await controller.getMe(req, res, next);
      await flushPromises();

      expect(res.status).toHaveBeenCalledWith(200);
      const body = res.json.mock.calls[0][0];
      expect(body.data).not.toHaveProperty("password");
      expect(body.data.roles).toEqual(["mentee"]);
    });
  });

  describe("addRole", () => {
    test("delegates to authService.addAccountRole with the caller's own user, never a body-supplied id", async () => {
      req = {
        user: { _id: "u1", roles: ["mentee"] },
        body: { role: "mentor" },
      };
      const updatedDto = { _id: "u1", roles: ["mentee", "mentor"] };
      mockAuthService.addAccountRole.mockResolvedValue(updatedDto);

      await controller.addRole(req, res, next);
      await flushPromises();

      expect(mockAuthService.addAccountRole).toHaveBeenCalledWith(
        req.user,
        "mentor",
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        successEnvelope(updatedDto, '"mentor" role added to your account.'),
      );
    });

    test("forwards a service rejection to next() via catchAsync rather than throwing synchronously", async () => {
      req = { user: { _id: "u1", roles: ["mentee"] }, body: { role: "mentor" } };
      const error = Object.assign(new Error("already has role"), {
        statusCode: 409,
        isOperational: true,
      });
      mockAuthService.addAccountRole.mockRejectedValue(error);

      await controller.addRole(req, res, next);
      await flushPromises();

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
    });
  });
});
