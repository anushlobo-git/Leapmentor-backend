/**
 * @fileoverview Availability Management Service Unit Tests
 * @description Validates validation guards, DTO serialization trees,
 * data mapping conversions, and domain exception pipelines.
 */

const createAvailabilityService = require("../../../services/availability.service");
const AppError = require("../../../utils/AppError");

// Mock mappers and slot utilities to isolate business calculations completely
jest.mock("../../../mappers/availability.mapper", () => ({
  toAvailabilityDTO: jest.fn((data) => ({ isDTO: true, ...data })),
}));

jest.mock("../../../utils/generateSlots", () => ({
  generateAvailableSlots: jest.fn(() => [{ date: "2026-06-24", slots: [] }]),
}));

describe("Availability Management Service Unit Tests", () => {
  let mockAvailabilityRepo, mockConnectRequestRepo, mockSlotLockRepo, service;

  beforeEach(() => {
    mockAvailabilityRepo = {
      findAvailabilityByMentor: jest.fn(),
      createAvailability: jest.fn(),
      updateAvailability: jest.fn(),
      deleteAvailability: jest.fn(),
    };
    mockConnectRequestRepo = {
      findBookedRequestsByMentor: jest.fn(),
    };
    mockSlotLockRepo = {
      findActiveLocksByMentor: jest.fn(),
    };

    service = createAvailabilityService(
      mockAvailabilityRepo,
      mockConnectRequestRepo,
      mockSlotLockRepo,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getMyAvailability Action Window", () => {
    test("should pass properties to the DTO mapper if a record exists inside the data store", async () => {
      mockAvailabilityRepo.findAvailabilityByMentor.mockResolvedValue({
        mentor: "m1",
        timezone: "UTC",
      });

      const result = await service.getMyAvailability("m1");

      expect(
        mockAvailabilityRepo.findAvailabilityByMentor,
      ).toHaveBeenCalledWith("m1");
      expect(result).toEqual({ isDTO: true, mentor: "m1", timezone: "UTC" });
    });

    test("should return explicit structural defaults if no record exists for the mentor", async () => {
      mockAvailabilityRepo.findAvailabilityByMentor.mockResolvedValue(null);

      const result = await service.getMyAvailability("m2");

      expect(result).toEqual({
        mentor: "m2",
        timezone: "Asia/Kolkata",
        sessionDurations: [30, 60],
        googleCalendarConnected: false,
        specificDates: [],
        isNew: true,
      });
    });
  });

  describe("createAvailability Record Seed", () => {
    test("should throw a 409 status clash error if a schedule configuration already exists", async () => {
      mockAvailabilityRepo.findAvailabilityByMentor.mockResolvedValue({
        _id: "exists",
      });

      await expect(service.createAvailability("m3", {})).rejects.toThrow(
        new AppError(
          "Availability already exists. Use PATCH /api/availability/me to update.",
          409,
        ),
      );
    });

    test("should delegate parameters to repository creation methods if unallocated", async () => {
      mockAvailabilityRepo.findAvailabilityByMentor.mockResolvedValue(null);
      mockAvailabilityRepo.createAvailability.mockResolvedValue({
        mentor: "m3",
        success: true,
      });

      const body = {
        timezone: "UTC",
        sessionDurations: [30],
        specificDates: [],
        weeklyHours: [],
      };
      const result = await service.createAvailability("m3", body);

      expect(mockAvailabilityRepo.createAvailability).toHaveBeenCalledWith({
        mentorId: "m3",
        ...body,
      });
      expect(result).toEqual({ mentor: "m3", success: true });
    });
  });

  describe("updateAvailability Modifications", () => {
    test("should reject update cycles with a 400 bad request error if no valid keys are supplied", async () => {
      await expect(
        service.updateAvailability("m4", { invalidKey: "data" }),
      ).rejects.toThrow(
        new AppError("No valid fields provided to update", 400),
      );
    });

    test("should parse acceptable input fields and forward changes cleanly to the database tier", async () => {
      mockAvailabilityRepo.updateAvailability.mockResolvedValue({
        updated: true,
      });

      const result = await service.updateAvailability("m4", {
        timezone: "Europe/London",
        hackField: "malicious",
      });

      expect(mockAvailabilityRepo.updateAvailability).toHaveBeenCalledWith(
        "m4",
        { timezone: "Europe/London" },
      );
      expect(result).toEqual({ updated: true });
    });
  });

  describe("getAvailableSlots Matrix Calculation", () => {
    test("should throw a 400 error if duration values violate strict step constraints", async () => {
      await expect(service.getAvailableSlots("m5", 15, "u1")).rejects.toThrow(
        new AppError("Duration must be 30, 45, or 60 minutes", 400),
      );
    });

    test("should extract active blocks from dependencies, combine calendars, and map slot schemas correctly", async () => {
      const mockAvailabilityDoc = {
        timezone: "Asia/Kolkata",
        sessionDurations: [30, 60],
        specificDates: [],
        weeklyHours: [],
      };
      mockAvailabilityRepo.findAvailabilityByMentor.mockResolvedValue(
        mockAvailabilityDoc,
      );

      mockConnectRequestRepo.findBookedRequestsByMentor.mockResolvedValue([
        {
          selectedSlots: [
            { date: "2026-06-24", startTime: "10:00", endTime: "11:00" },
          ],
        },
      ]);
      mockSlotLockRepo.findActiveLocksByMentor.mockResolvedValue([
        { date: "2026-06-24", startTime: "11:00", endTime: "11:30" },
      ]);

      const result = await service.getAvailableSlots("m5", 60, "u1");

      expect(
        mockAvailabilityRepo.findAvailabilityByMentor,
      ).toHaveBeenCalledWith("m5");
      expect(
        mockConnectRequestRepo.findBookedRequestsByMentor,
      ).toHaveBeenCalledWith("m5");
      expect(mockSlotLockRepo.findActiveLocksByMentor).toHaveBeenCalledWith(
        "m5",
        "u1",
      );
      expect(result).toEqual({
        timezone: "Asia/Kolkata",
        sessionDurations: [30, 60],
        slots: [{ date: "2026-06-24", slots: [] }],
      });
    });
  });
});
