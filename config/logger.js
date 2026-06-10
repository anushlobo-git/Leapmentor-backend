const { Logtail } = require("@logtail/node");
const { LogtailTransport } = require("@logtail/winston");
const winston = require("winston");

const logtail = new Logtail(process.env.LOGTAIL_TOKEN);

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
  ),
  transports: [
    new winston.transports.Console(), // local dev
    new LogtailTransport(logtail), // Better Stack
  ],
});

module.exports = logger;
