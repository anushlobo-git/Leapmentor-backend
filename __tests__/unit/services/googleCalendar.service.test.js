const createGoogleCalendarService = require("../../../services/googleCalendar.service");
const AppError = require("../../../utils/AppError");

describe("Google Calendar Service Unit Tests", () => {
  let mockGoogle, mockAvailabilityRepo, mockLogger, service, mockOAuth2Client;

  beforeEach(() => {
    mockOAuth2Client = {
      generateAuthUrl: jest.fn().mockReturnValue("https://google.com/auth"),
      getToken: jest
        .fn()
        .mockResolvedValue({ tokens: { access_token: "mock_tok" } }),
      setCredentials: jest.fn(),
      on: jest.fn(),
    };

    mockGoogle = {
      auth: {
        OAuth2: jest.fn().mockImplementation(() => mockOAuth2Client),
      },
      calendar: jest.fn().mockReturnValue({
        freebusy: {
          query: jest
            .fn()
            .mockResolvedValue({
              data: { calendars: { primary: { busy: [{ start: "1" }] } } },
            }),
        },
      }),
    };

    mockAvailabilityRepo = {
      updateGoogleCalendarConfig: jest.fn().mockResolvedValue(true),
      findWithCalendarToken: jest
        .fn()
        .mockResolvedValue({ googleCalendarToken: '{"access_token":"valid"}' }),
    };

    mockLogger = { error: jest.fn(), warn: jest.fn() };

    service = createGoogleCalendarService(
      mockGoogle,
      mockAvailabilityRepo,
      mockLogger,
    );
  });

  test("generateAuthUrl should encode user references into state arrays safely", async () => {
    const url = await service.generateAuthUrl("user_101");
    expect(url).toBe("https://google.com/auth");
    expect(mockOAuth2Client.generateAuthUrl).toHaveBeenCalledWith(
      expect.objectContaining({ access_type: "offline", prompt: "consent" }),
    );
  });

  test("handleAuthCallback should verify state tokens and write back credential buffers", async () => {
    const validState = Buffer.from(
      JSON.stringify({ userId: "user_102" }),
    ).toString("base64");
    const userId = await service.handleAuthCallback("auth_code_99", validState);

    expect(userId).toBe("user_102");
    expect(
      mockAvailabilityRepo.updateGoogleCalendarConfig,
    ).toHaveBeenCalledWith(
      "user_102",
      expect.objectContaining({ googleCalendarConnected: true }),
    );
  });

  test("handleAuthCallback should throw an AppError if metadata maps fail parse layers", async () => {
    await expect(
      service.handleAuthCallback("code", "malformed_base64_string"),
    ).rejects.toThrow(AppError);
  });
});
