/**
 * @fileoverview Availability Repository Unit Tests
 * @description Validates fluent query chains, update properties, and conditional
 * transaction sessions using completely isolated Mongoose driver mocks.
 */

const createAvailabilityRepository = require("../../../repositories/availability.repository");

describe("Availability Repository Unit Tests", () => {
  let mockModel;
  let repository;
  let mockSession;

  // Emulates chainable query logic structures seamlessly (.session, .select)
  const createQueryChainMock = (resolvedValue) => {
    const chain = {
      session: jest.fn(),
      select: jest.fn(),
      then: jest.fn(),
    };

    chain.session.mockReturnValue(chain);
    chain.select.mockReturnValue(chain);
    chain.then.mockImplementation((callback) => {
      if (typeof callback === "function") {
        return Promise.resolve(callback(resolvedValue));
      }
      return Promise.resolve(resolvedValue);
    });

    return chain;
  };

  beforeEach(() => {
    mockModel = {
      findOne: jest.fn(),
      create: jest.fn(),
      findOneAndUpdate: jest.fn(),
      findOneAndDelete: jest.fn(),
    };
    mockSession = { id: "mock_mongoose_transaction_session_id" };
    repository = createAvailabilityRepository(mockModel);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── findAvailabilityByMentor and Alias Lookups ──────────────────────────
  describe("findAvailabilityByMentor and Alias Lookups", () => {
    test("should execute findOne matching target query profiles when session is omitted", async () => {
      const mockChain = createQueryChainMock({ mentor: "m1" });
      mockModel.findOne.mockReturnValue(mockChain);

      const result = await repository.findAvailabilityByMentor("m1");

      expect(mockModel.findOne).toHaveBeenCalledWith({ mentor: "m1" });
      expect(mockChain.session).not.toHaveBeenCalled();
      expect(result).toEqual({ mentor: "m1" });
    });

    test("should forward active transaction constraints along the query chain if passed a valid session", async () => {
      const mockChain = createQueryChainMock({ mentor: "m2" });
      mockModel.findOne.mockReturnValue(mockChain);

      await repository.findByMentorId("m2", mockSession);

      expect(mockModel.findOne).toHaveBeenCalledWith({ mentor: "m2" });
      expect(mockChain.session).toHaveBeenCalledWith(mockSession);
    });
  });

  // ── createAvailability Matrix Handling ──────────────────────────────────
  describe("createAvailability Matrix Handling", () => {
    test("should apply standard regional fallbacks when incoming payload parameters are missing keys", async () => {
      mockModel.create.mockResolvedValue({ mentor: "m3" });

      await repository.createAvailability({ mentorId: "m3", weeklyHours: [] });

      expect(mockModel.create).toHaveBeenCalledWith({
        mentor: "m3",
        timezone: "Asia/Kolkata",
        sessionDurations: [30, 60],
        specificDates: [],
        weeklyHours: [],
      });
    });

    test("should encapsulate payload inputs inside an isolated array scope if initialized within an active transaction session", async () => {
      mockModel.create.mockResolvedValue([{ mentor: "m4" }]);

      await repository.createAvailability(
        {
          mentorId: "m4",
          timezone: "UTC",
          sessionDurations: [45],
          specificDates: [],
          weeklyHours: [],
        },
        mockSession,
      );

      expect(mockModel.create).toHaveBeenCalledWith(
        [
          {
            mentor: "m4",
            timezone: "UTC",
            sessionDurations: [45],
            specificDates: [],
            weeklyHours: [],
          },
        ],
        { session: mockSession },
      );
    });
  });

  // ── updateAvailability Configuration Updates ────────────────────────────
  describe("updateAvailability Configuration Updates", () => {
    test("should trigger precise update variables matching structural parameters without session", async () => {
      const mockChain = createQueryChainMock({ mentor: "m5" });
      mockModel.findOneAndUpdate.mockReturnValue(mockChain);

      const updates = { timezone: "America/New_York" };
      await repository.updateAvailability("m5", updates);

      expect(mockModel.findOneAndUpdate).toHaveBeenCalledWith(
        { mentor: "m5" },
        { $set: updates },
        { new: true, runValidators: true, upsert: true },
      );
      expect(mockChain.session).not.toHaveBeenCalled();
    });

    test("should append session transaction context to update chain query when provided", async () => {
      const mockChain = createQueryChainMock({ mentor: "m5" });
      mockModel.findOneAndUpdate.mockReturnValue(mockChain);

      const updates = { timezone: "America/New_York" };
      await repository.updateAvailability("m5", updates, mockSession);

      expect(mockChain.session).toHaveBeenCalledWith(mockSession);
    });
  });

  // ── deleteAvailability ──────────────────────────────────────────────────
  describe("deleteAvailability", () => {
    test("should invoke findOneAndDelete without session handling", async () => {
      const mockChain = createQueryChainMock({ mentor: "m5" });
      mockModel.findOneAndDelete.mockReturnValue(mockChain);

      await repository.deleteAvailability("m5");

      expect(mockModel.findOneAndDelete).toHaveBeenCalledWith({ mentor: "m5" });
      expect(mockChain.session).not.toHaveBeenCalled();
    });

    test("should chain session parameter context to findOneAndDelete call", async () => {
      const mockChain = createQueryChainMock({ mentor: "m5" });
      mockModel.findOneAndDelete.mockReturnValue(mockChain);

      await repository.deleteAvailability("m5", mockSession);

      expect(mockModel.findOneAndDelete).toHaveBeenCalledWith({ mentor: "m5" });
      expect(mockChain.session).toHaveBeenCalledWith(mockSession);
    });
  });

  // ── updateGoogleCalendarConfig ──────────────────────────────────────────
  describe("updateGoogleCalendarConfig", () => {
    test("should find and modify parameters using precise upsert flags without a session", async () => {
      const mockChain = createQueryChainMock({ mentor: "m5" });
      mockModel.findOneAndUpdate.mockReturnValue(mockChain);

      const updateData = { googleCalendarToken: "new_token" };
      await repository.updateGoogleCalendarConfig("m5", updateData);

      expect(mockModel.findOneAndUpdate).toHaveBeenCalledWith(
        { mentor: "m5" },
        updateData,
        { upsert: true, new: true },
      );
      expect(mockChain.session).not.toHaveBeenCalled();
    });

    test("should map findAndModify parameter streams alongside runtime sessions", async () => {
      const mockChain = createQueryChainMock({ mentor: "m5" });
      mockModel.findOneAndUpdate.mockReturnValue(mockChain);

      const updateData = { googleCalendarToken: "new_token" };
      await repository.updateGoogleCalendarConfig(
        "m5",
        updateData,
        mockSession,
      );

      expect(mockModel.findOneAndUpdate).toHaveBeenCalledWith(
        { mentor: "m5" },
        updateData,
        { upsert: true, new: true },
      );
      expect(mockChain.session).toHaveBeenCalledWith(mockSession);
    });
  });

  // ── findWithCalendarToken Hidden Field Lookups ──────────────────────────
  describe("findWithCalendarToken Hidden Field Lookups", () => {
    test("should append selection rules to expose protected sensitive field values", async () => {
      const mockChain = createQueryChainMock({
        mentor: "m6",
        googleCalendarToken: "sec_tok",
      });
      mockModel.findOne.mockReturnValue(mockChain);

      await repository.findWithCalendarToken("m6");

      expect(mockModel.findOne).toHaveBeenCalledWith({ mentor: "m6" });
      expect(mockChain.select).toHaveBeenCalledWith("+googleCalendarToken");
    });
  });
});
