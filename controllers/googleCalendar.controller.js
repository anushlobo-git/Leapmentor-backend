/**
 * @fileoverview Google Calendar Controller
 * @description Formats parameters, proxies data directly downstream, and emits presentation window runtime scripts.
 */

const catchAsync = require("../utils/catchAsync");

const createGoogleCalendarController = ({ googleCalendarService }) => {
  /**
   * Returns the explicit federated access URL path allocated to target profile synchronization locks.
   * @route   GET /api/v1/google-calendar/auth-url
   * @access  Private (User)
   */
  const getAuthUrl = catchAsync(async (req, res, next) => {
    const url = await googleCalendarService.generateAuthUrl(req.user._id);
    return res.status(200).json({ url });
  });

  /**
   * Handles out-of-band federated redirects issued downstream directly from Google credential structures.
   * @route   GET /api/v1/google-calendar/callback
   * @access  Public
   */
  const handleCallback = catchAsync(async (req, res, next) => {
    const { code, state, error } = req.query;

    if (error) {
      return res.status(200).send(`
        <script>
          window.opener?.postMessage({ type: "GOOGLE_CALENDAR_ERROR", error: "${error}" }, "*");
          window.close();
        </script>
      `);
    }

    try {
      await googleCalendarService.handleAuthCallback(code, state);
      return res.status(200).send(`
        <script>
          window.opener?.postMessage({ type: "GOOGLE_CALENDAR_CONNECTED" }, "*");
          window.close();
        </script>
      `);
    } catch (err) {
      const safeError = encodeURIComponent(err.message);
      return res.status(200).send(`
        <script>
          window.opener?.postMessage({ type: "GOOGLE_CALENDAR_ERROR", error: decodeURIComponent("${safeError}") }, "*");
          window.close();
        </script>
      `);
    }
  });

  /**
   * Clears third-party integration synchronization properties stored within active data frameworks.
   * @route   POST /api/v1/google-calendar/disconnect
   * @access  Private (User)
   */
  const disconnect = catchAsync(async (req, res, next) => {
    await googleCalendarService.disconnectCalendar(req.user._id);
    return res.status(200).json({ message: "Google Calendar disconnected" });
  });

  /**
   * Exposes explicit real-time baseline system block values describing busy slot time coordinates.
   * @route   GET /api/v1/google-calendar/busy
   * @access  Private (User)
   */
  const getBusySlots = catchAsync(async (req, res, next) => {
    const busy = await googleCalendarService.getBusySlots({
      mentorId: req.user._id,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    });
    return res.status(200).json({ busy });
  });

  /**
   * Pulls detailed label strings describing item names scheduled across cross-referenced timelines.
   * @route   GET /api/v1/google-calendar/events
   * @access  Private (User)
   */
  const getEvents = catchAsync(async (req, res, next) => {
    const events = await googleCalendarService.getCalendarEvents({
      mentorId: req.user._id,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    });
    return res.status(200).json({ events });
  });

  return {
    getAuthUrl,
    handleCallback,
    disconnect,
    getBusySlots,
    getEvents,
  };
};

module.exports = createGoogleCalendarController;
