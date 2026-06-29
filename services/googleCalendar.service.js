/**
 * @fileoverview Google Calendar Service
 * @description Pure business logic managing OAuth2 resource exchanges, token refresh states,
 * and Google Calendar API aggregations via inverted parameters injection.
 */

const AppError = require("../utils/AppError");
const env = require("../config/env");
// Upper-case Domain Constants
const SCOPES = ["https://www.googleapis.com/auth/calendar.readonly"];
const CALENDAR_VERSION = "v3";
const DEFAULT_TIMEZONE_SUFFIX = "Z";
const MAX_EVENT_RESULTS = 250;

const createGoogleCalendarService = ({
  google,
  availabilityRepository,
  logger,
  googleConfig,
}) => {
  /**
   * Instantiates a fresh Google API OAuth2 client mapping configurations dynamically.
   * @private
   */
  const _getOAuth2Client = () => {
    return new google.auth.OAuth2(
      googleConfig.clientId,
      googleConfig.clientSecret,
      googleConfig.redirectUri,
    );
  };

  /**
   * Registers an autonomous operational callback handling downstream token updates securely.
   * @private
   */
  const _bindTokenRefreshListener = (client, currentTokens, mentorId) => {
    client.on("tokens", (newTokens) => {
      const mergedTokens = { ...currentTokens, ...newTokens };
      availabilityRepository
        .updateGoogleCalendarConfig(mentorId, {
          googleCalendarToken: JSON.stringify(mergedTokens),
        })
        .catch((refreshErr) =>
          logger.error("Token refresh storage update failed", {
            message: refreshErr.message,
          }),
        );
    });
  };

  /**
   * Generates an encrypted Google OAuth authorization entry URL.
   */
  const generateAuthUrl = async (userId) => {
    const oauth2Client = _getOAuth2Client();
    const state = Buffer.from(JSON.stringify({ userId })).toString("base64");

    return oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: SCOPES,
      prompt: "consent",
      state,
    });
  };

  /**
   * Exchanges single-use authentication codes for persistent authorization tokens.
   */
  const handleAuthCallback = async (code, state) => {
    if (!code || !state) {
      throw new AppError(
        "Authorization code and state are required parameters",
        400,
      );
    }

    let userId;
    try {
      const decoded = JSON.parse(Buffer.from(state, "base64").toString());
      userId = decoded.userId;
    } catch (parseError) {
      logger.error("Failed to parse state payload", parseError);
      throw new AppError("Invalid state payload context configuration", 400);
    }

    const oauth2Client = _getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);
    const tokenJson = JSON.stringify(tokens);

    await availabilityRepository.updateGoogleCalendarConfig(userId, {
      googleCalendarConnected: true,
      googleCalendarToken: tokenJson,
    });

    return userId;
  };

  /**
   * Severs third-party Google synchronization mappings from active records.
   */
  const disconnectCalendar = async (mentorId) => {
    await availabilityRepository.updateGoogleCalendarConfig(mentorId, {
      googleCalendarConnected: false,
      googleCalendarToken: "",
    });
  };

  /**
   * Aggregates all recorded unavailable periods directly across structural Google index fields.
   */
  const getBusySlots = async ({ mentorId, startDate, endDate }) => {
    const availability =
      await availabilityRepository.findWithCalendarToken(mentorId);
    if (!availability?.googleCalendarToken) {
      return [];
    }

    const tokens = JSON.parse(availability.googleCalendarToken);
    const client = _getOAuth2Client();
    client.setCredentials(tokens);

    _bindTokenRefreshListener(client, tokens, mentorId);

    const calendar = google.calendar({
      version: CALENDAR_VERSION,
      auth: client,
    });
    const timeMin = new Date(
      `${startDate}T00:00:00${DEFAULT_TIMEZONE_SUFFIX}`,
    ).toISOString();
    const timeMax = new Date(
      `${endDate}T23:59:59${DEFAULT_TIMEZONE_SUFFIX}`,
    ).toISOString();

    const freeBusy = await calendar.freebusy.query({
      requestBody: {
        timeMin,
        timeMax,
        items: [{ id: "primary" }],
      },
    });

    return freeBusy.data.calendars.primary.busy || [];
  };

  /**
   * Aggregates comprehensive tracking summary objects detailing calendar item labels.
   */
  const getCalendarEvents = async ({ mentorId, startDate, endDate }) => {
    const availability =
      await availabilityRepository.findWithCalendarToken(mentorId);
    if (!availability?.googleCalendarToken) {
      return [];
    }

    const tokens = JSON.parse(availability.googleCalendarToken);
    const client = _getOAuth2Client();
    client.setCredentials(tokens);

    _bindTokenRefreshListener(client, tokens, mentorId);

    const calendar = google.calendar({
      version: CALENDAR_VERSION,
      auth: client,
    });
    const timeMin = new Date(
      `${startDate}T00:00:00${DEFAULT_TIMEZONE_SUFFIX}`,
    ).toISOString();
    const timeMax = new Date(
      `${endDate}T23:59:59${DEFAULT_TIMEZONE_SUFFIX}`,
    ).toISOString();

    const calList = await calendar.calendarList.list();
    const calendarIds = (calList.data.items || [])
      .filter((c) => c.selected !== false)
      .map((c) => c.id);

    const allEvents = [];
    for (const calId of calendarIds) {
      try {
        const response = await calendar.events.list({
          calendarId: calId,
          timeMin,
          timeMax,
          singleEvents: true,
          orderBy: "startTime",
          maxResults: MAX_EVENT_RESULTS,
        });

        const items = (response.data.items || []).map((e) => ({
          id: e.id,
          summary: e.summary || "Busy",
          start: e.start?.dateTime || e.start?.date,
          end: e.end?.dateTime || e.end?.date,
          allDay: !e.start?.dateTime,
        }));
        allEvents.push(...items);
      } catch (ignoreError) {
        logger.warn("Failed to fetch calendar items, continuing", ignoreError);
      }
    }

    const seenIds = new Set();
    return allEvents.filter((e) => {
      if (seenIds.has(e.id)) return false;
      seenIds.add(e.id);
      return true;
    });
  };

  return {
    generateAuthUrl,
    handleAuthCallback,
    disconnectCalendar,
    getBusySlots,
    getCalendarEvents,
  };
};

module.exports = createGoogleCalendarService;
