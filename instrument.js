// instrument.js
const Sentry = require("@sentry/node");

Sentry.init({
  dsn: "https://d802b029beeadf32bba5c64566fbd4fe@o4511471540240384.ingest.de.sentry.io/4511471617835088",
  sendDefaultPii: false, // keep false to protect user privacy
  tracesSampleRate: 1.0,
});
