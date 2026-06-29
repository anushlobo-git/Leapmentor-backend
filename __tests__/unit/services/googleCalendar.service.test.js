const createGoogleCalendarService = require("../../../services/googleCalendar.service");

describe("googleCalendar.service", () => {
  let google,
    availabilityRepository,
    logger,
    googleConfig,
    service,
    oauth2Client;

  const makeCalendar = ({ busy = [], items = [], eventItems = [] } = {}) => ({
    freebusy: {
      query: jest.fn().mockResolvedValue({
        data: { calendars: { primary: { busy } } },
      }),
    },
    calendarList: {
      list: jest.fn().mockResolvedValue({ data: { items } }),
    },
    events: {
      list: jest.fn().mockResolvedValue({ data: { items: eventItems } }),
    },
  });

  beforeEach(() => {
    oauth2Client = {
      generateAuthUrl: jest.fn().mockReturnValue("https://google.com/auth"),
      getToken: jest
        .fn()
        .mockResolvedValue({ tokens: { access_token: "tok" } }),
      setCredentials: jest.fn(),
      on: jest.fn(),
    };

    google = {
      auth: { OAuth2: jest.fn().mockReturnValue(oauth2Client) },
      calendar: jest.fn().mockReturnValue(makeCalendar()),
    };

    availabilityRepository = {
      updateGoogleCalendarConfig: jest.fn().mockResolvedValue(true),
      findWithCalendarToken: jest.fn().mockResolvedValue({
        googleCalendarToken: JSON.stringify({ access_token: "valid" }),
      }),
    };

    logger = { error: jest.fn(), warn: jest.fn() };
    googleConfig = {
      clientId: "cid",
      clientSecret: "csecret",
      redirectUri: "http://redirect",
    };

    service = createGoogleCalendarService({
      google,
      availabilityRepository,
      logger,
      googleConfig,
    });
  });

  afterEach(() => jest.clearAllMocks());

  // ── generateAuthUrl ───────────────────────────────────────────

  test("returns auth url with offline access and consent prompt", async () => {
    const url = await service.generateAuthUrl("u1");
    expect(url).toBe("https://google.com/auth");
    expect(oauth2Client.generateAuthUrl).toHaveBeenCalledWith(
      expect.objectContaining({ access_type: "offline", prompt: "consent" }),
    );
  });

  // ── handleAuthCallback ────────────────────────────────────────

  test("throws 400 if code or state missing", async () => {
    await expect(
      service.handleAuthCallback(null, "state"),
    ).rejects.toMatchObject({ statusCode: 400 });
    await expect(
      service.handleAuthCallback("code", null),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  test("throws 400 if state is not valid base64 JSON", async () => {
    await expect(
      service.handleAuthCallback("code", "not_valid_base64!!!"),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  test("exchanges code for tokens and saves config", async () => {
    const state = Buffer.from(JSON.stringify({ userId: "u1" })).toString(
      "base64",
    );
    const userId = await service.handleAuthCallback("auth_code", state);

    expect(userId).toBe("u1");
    expect(oauth2Client.getToken).toHaveBeenCalledWith("auth_code");
    expect(
      availabilityRepository.updateGoogleCalendarConfig,
    ).toHaveBeenCalledWith(
      "u1",
      expect.objectContaining({ googleCalendarConnected: true }),
    );
  });

  // ── disconnectCalendar ────────────────────────────────────────

  test("disconnects calendar by clearing token and flag", async () => {
    await service.disconnectCalendar("m1");
    expect(
      availabilityRepository.updateGoogleCalendarConfig,
    ).toHaveBeenCalledWith("m1", {
      googleCalendarConnected: false,
      googleCalendarToken: "",
    });
  });

  // ── getBusySlots ──────────────────────────────────────────────

  test("returns empty array if no googleCalendarToken", async () => {
    availabilityRepository.findWithCalendarToken.mockResolvedValue({});
    const result = await service.getBusySlots({
      mentorId: "m1",
      startDate: "2025-01-01",
      endDate: "2025-01-02",
    });
    expect(result).toEqual([]);
  });

  test("returns busy slots from freebusy query", async () => {
    const busy = [
      { start: "2025-01-01T10:00:00Z", end: "2025-01-01T11:00:00Z" },
    ];
    google.calendar.mockReturnValue(makeCalendar({ busy }));

    const result = await service.getBusySlots({
      mentorId: "m1",
      startDate: "2025-01-01",
      endDate: "2025-01-02",
    });
    expect(result).toEqual(busy);
    expect(oauth2Client.setCredentials).toHaveBeenCalled();
    expect(oauth2Client.on).toHaveBeenCalledWith(
      "tokens",
      expect.any(Function),
    );
  });

  test("returns empty array if freebusy busy field is missing", async () => {
    google.calendar.mockReturnValue({
      freebusy: {
        query: jest.fn().mockResolvedValue({
          data: { calendars: { primary: {} } },
        }),
      },
    });

    const result = await service.getBusySlots({
      mentorId: "m1",
      startDate: "2025-01-01",
      endDate: "2025-01-02",
    });
    expect(result).toEqual([]);
  });

  test("token refresh listener merges and saves new tokens", async () => {
    availabilityRepository.findWithCalendarToken.mockResolvedValue({
      googleCalendarToken: JSON.stringify({
        access_token: "old",
        refresh_token: "rt",
      }),
    });

    let tokenListener;
    oauth2Client.on.mockImplementation((event, cb) => {
      tokenListener = cb;
    });

    google.calendar.mockReturnValue(makeCalendar({ busy: [] }));
    await service.getBusySlots({
      mentorId: "m1",
      startDate: "2025-01-01",
      endDate: "2025-01-02",
    });

    await tokenListener({ access_token: "new" });
    expect(
      availabilityRepository.updateGoogleCalendarConfig,
    ).toHaveBeenCalledWith(
      "m1",
      expect.objectContaining({
        googleCalendarToken: expect.stringContaining("new"),
      }),
    );
  });

  test("token refresh listener logs error if update fails", async () => {
    let tokenListener;
    oauth2Client.on.mockImplementation((event, cb) => {
      tokenListener = cb;
    });
    availabilityRepository.updateGoogleCalendarConfig.mockRejectedValue(
      new Error("db fail"),
    );

    google.calendar.mockReturnValue(makeCalendar({ busy: [] }));
    await service.getBusySlots({
      mentorId: "m1",
      startDate: "2025-01-01",
      endDate: "2025-01-02",
    });

    await tokenListener({ access_token: "new" });
    expect(logger.error).toHaveBeenCalled();
  });

  // ── getCalendarEvents ─────────────────────────────────────────

  test("returns empty array if no googleCalendarToken", async () => {
    availabilityRepository.findWithCalendarToken.mockResolvedValue({});
    const result = await service.getCalendarEvents({
      mentorId: "m1",
      startDate: "2025-01-01",
      endDate: "2025-01-02",
    });
    expect(result).toEqual([]);
  });

  test("returns empty array if calendarList has no items", async () => {
    google.calendar.mockReturnValue(makeCalendar({ items: [] }));
    const result = await service.getCalendarEvents({
      mentorId: "m1",
      startDate: "2025-01-01",
      endDate: "2025-01-02",
    });
    expect(result).toEqual([]);
  });

  test("fetches events from selected calendars and deduplicates by id", async () => {
    const eventItems = [
      {
        id: "e1",
        summary: "Meeting",
        start: { dateTime: "2025-01-01T10:00:00Z" },
        end: { dateTime: "2025-01-01T11:00:00Z" },
      },
      {
        id: "e1",
        summary: "Meeting",
        start: { dateTime: "2025-01-01T10:00:00Z" },
        end: { dateTime: "2025-01-01T11:00:00Z" },
      },
      {
        id: "e2",
        summary: null,
        start: { date: "2025-01-02" },
        end: { date: "2025-01-02" },
      },
    ];
    const cal = makeCalendar({
      items: [{ id: "primary", selected: true }],
      eventItems,
    });
    google.calendar.mockReturnValue(cal);

    const result = await service.getCalendarEvents({
      mentorId: "m1",
      startDate: "2025-01-01",
      endDate: "2025-01-02",
    });

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      id: "e1",
      summary: "Meeting",
      allDay: false,
    });
    expect(result[1]).toMatchObject({
      id: "e2",
      summary: "Busy",
      allDay: true,
    });
  });

  test("skips calendars where selected is false", async () => {
    const cal = makeCalendar({
      items: [{ id: "cal1", selected: false }],
    });
    google.calendar.mockReturnValue(cal);

    const result = await service.getCalendarEvents({
      mentorId: "m1",
      startDate: "2025-01-01",
      endDate: "2025-01-02",
    });
    expect(result).toEqual([]);
    expect(cal.events.list).not.toHaveBeenCalled();
  });

  test("logs warn and continues if events.list throws for a calendar", async () => {
    const cal = {
      calendarList: {
        list: jest
          .fn()
          .mockResolvedValue({ data: { items: [{ id: "cal1" }] } }),
      },
      events: {
        list: jest.fn().mockRejectedValue(new Error("permission denied")),
      },
    };
    google.calendar.mockReturnValue(cal);

    const result = await service.getCalendarEvents({
      mentorId: "m1",
      startDate: "2025-01-01",
      endDate: "2025-01-02",
    });
    expect(result).toEqual([]);
    expect(logger.warn).toHaveBeenCalled();
  });
});
