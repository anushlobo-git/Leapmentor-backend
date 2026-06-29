/**
 * @fileoverview Mentor Availability Controller Unit Tests
 * @description Verifies availability configurations, time window slotting queries,
 * duration fallback parsing, error propagation, and response status criteria.
 */

// CRITICAL FIX: Mock catchAsync to return the promise chain so tests can reliably await its completion.
jest.mock("../../../utils/catchAsync", () => {
  return (fn) => (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);
});

const createAvailabilityController = require("../../../controllers/availability.controller");

describe("AvailabilityController", () => {
  let mockAvailabilityService;
  let controller;
  let req;
  let res;
  let next;

  const mockAvailabilityConfig = {
    _id: "avail_001",
    mentor: "mentor_abc123",
    timeSlots: [{ dayOfWeek: 1, startTime: "09:00", endTime: "17:00" }],
  };
  const mockSlotsResult = [
    { date: "2026-07-01", startTime: "10:00", endTime: "11:00" },
  ];

  beforeEach(() => {
    // ── MOCK DEPENDENCIES
    mockAvailabilityService = {
      getMyAvailability: jest.fn(),
      createAvailability: jest.fn(),
      updateAvailability: jest.fn(),
      getMentorAvailability: jest.fn(),
      deleteAvailability: jest.fn(),
      getAvailableSlots: jest.fn(),
    };

    controller = createAvailabilityController({
      availabilityService: mockAvailabilityService,
    });

    // ── EXPRESS HTTP MOCKS
    req = {
      user: { _id: "mentor_default_id" },
      body: {},
      query: {},
      params: {},
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    next = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── getMyAvailability ───────────────────────────────────────────────────
  describe("getMyAvailability", () => {
    test("should return 200 and raw schedule configurations on success", async () => {
      req.user._id = "mentor_variant_x";
      mockAvailabilityService.getMyAvailability.mockResolvedValue(
        mockAvailabilityConfig,
      );

      await controller.getMyAvailability(req, res, next);

      expect(mockAvailabilityService.getMyAvailability).toHaveBeenCalledWith(
        "mentor_variant_x",
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockAvailabilityConfig);
      expect(next).not.toHaveBeenCalled();
    });

    test("should call next(err) and withhold status updates when service throws", async () => {
      const error = new Error("Database find operation timed out");
      mockAvailabilityService.getMyAvailability.mockRejectedValue(error);

      await controller.getMyAvailability(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  // ── createAvailability ──────────────────────────────────────────────────
  describe("createAvailability", () => {
    test("should return 201 and confirm structural setup with a wrapper response on success", async () => {
      req.user._id = "mentor_variant_y";
      req.body = { timeSlots: [] };
      mockAvailabilityService.createAvailability.mockResolvedValue(
        mockAvailabilityConfig,
      );

      await controller.createAvailability(req, res, next);

      expect(mockAvailabilityService.createAvailability).toHaveBeenCalledWith(
        "mentor_variant_y",
        req.body,
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Availability created successfully",
        availability: mockAvailabilityConfig,
      });
      expect(next).not.toHaveBeenCalled();
    });

    test("should call next(err) and withhold status updates when service throws", async () => {
      const error = new Error("Mongoose compilation validation failure");
      mockAvailabilityService.createAvailability.mockRejectedValue(error);

      await controller.createAvailability(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  // ── updateAvailability ──────────────────────────────────────────────────
  describe("updateAvailability", () => {
    test("should return 200 and the modified model configuration on success", async () => {
      req.user._id = "mentor_variant_z";
      req.body = {
        timeSlots: [{ dayOfWeek: 2, startTime: "10:00", endTime: "12:00" }],
      };
      mockAvailabilityService.updateAvailability.mockResolvedValue(
        mockAvailabilityConfig,
      );

      await controller.updateAvailability(req, res, next);

      expect(mockAvailabilityService.updateAvailability).toHaveBeenCalledWith(
        "mentor_variant_z",
        req.body,
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Availability updated successfully",
        availability: mockAvailabilityConfig,
      });
      expect(next).not.toHaveBeenCalled();
    });

    test("should call next(err) and withhold status updates when service throws", async () => {
      const error = new Error("Target availability row not found");
      mockAvailabilityService.updateAvailability.mockRejectedValue(error);

      await controller.updateAvailability(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  // ── getMentorAvailability ───────────────────────────────────────────────
  describe("getMentorAvailability", () => {
    test("should return 200 and public profile items based on dynamic route parameters", async () => {
      req.params.mentorId = "mentor_public_456";
      mockAvailabilityService.getMentorAvailability.mockResolvedValue(
        mockAvailabilityConfig,
      );

      await controller.getMentorAvailability(req, res, next);

      expect(
        mockAvailabilityService.getMentorAvailability,
      ).toHaveBeenCalledWith("mentor_public_456");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockAvailabilityConfig);
      expect(next).not.toHaveBeenCalled();
    });

    test("should call next(err) and withhold status updates when service throws", async () => {
      req.params.mentorId = "mentor_invalid";
      const error = new Error("Account deactivated or missing");
      mockAvailabilityService.getMentorAvailability.mockRejectedValue(error);

      await controller.getMentorAvailability(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  // ── deleteAvailability ──────────────────────────────────────────────────
  describe("deleteAvailability", () => {
    test("should return 200 and emit confirmation indicators on clear success", async () => {
      req.user._id = "mentor_purge_777";
      mockAvailabilityService.deleteAvailability.mockResolvedValue(true);

      await controller.deleteAvailability(req, res, next);

      expect(mockAvailabilityService.deleteAvailability).toHaveBeenCalledWith(
        "mentor_purge_777",
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Availability cleared successfully",
      });
      expect(next).not.toHaveBeenCalled();
    });

    test("should call next(err) and withhold status updates when service throws", async () => {
      const error = new Error("Write constraint permission conflict");
      mockAvailabilityService.deleteAvailability.mockRejectedValue(error);

      await controller.deleteAvailability(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  // ── getAvailableSlots ───────────────────────────────────────────────────
  describe("getAvailableSlots", () => {
    test("should return 200 and parse custom duration query metrics properly on success", async () => {
      req.params.mentorId = "mentor_slots_111";
      req.user._id = "mentee_visitor_888";
      req.query.duration = "45";
      mockAvailabilityService.getAvailableSlots.mockResolvedValue(
        mockSlotsResult,
      );

      await controller.getAvailableSlots(req, res, next);

      expect(mockAvailabilityService.getAvailableSlots).toHaveBeenCalledWith(
        "mentor_slots_111",
        45,
        "mentee_visitor_888",
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockSlotsResult);
      expect(next).not.toHaveBeenCalled();
    });

    test("should fall back onto corporate 60-minute windows if duration is absent or empty", async () => {
      req.params.mentorId = "mentor_slots_222";
      req.user._id = "mentee_visitor_999";
      req.query.duration = undefined;
      mockAvailabilityService.getAvailableSlots.mockResolvedValue(
        mockSlotsResult,
      );

      await controller.getAvailableSlots(req, res, next);

      expect(mockAvailabilityService.getAvailableSlots).toHaveBeenCalledWith(
        "mentor_slots_222",
        60,
        "mentee_visitor_999",
      );
      expect(next).not.toHaveBeenCalled();
    });

    test("should fall back onto default limits if query input strings cannot be parsed numerically", async () => {
      req.params.mentorId = "mentor_slots_222";
      req.user._id = "mentee_visitor_999";
      req.query.duration = "invalid_string_token";
      mockAvailabilityService.getAvailableSlots.mockResolvedValue(
        mockSlotsResult,
      );

      await controller.getAvailableSlots(req, res, next);

      expect(mockAvailabilityService.getAvailableSlots).toHaveBeenCalledWith(
        "mentor_slots_222",
        60,
        "mentee_visitor_999",
      );
      expect(next).not.toHaveBeenCalled();
    });

    test("should call next(err) and withhold status updates when service throws", async () => {
      const error = new Error("Slot division calculation matrix exception");
      mockAvailabilityService.getAvailableSlots.mockRejectedValue(error);

      await controller.getAvailableSlots(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
    });
  });
});
