const { Logtail } = require("@logtail/node");
const { LogtailTransport } = require("@logtail/winston");
const winston = require("winston");

const transports = [new winston.transports.Console()];

// 👇 only create Logtail if token exists at runtime
if (process.env.LOGTAIL_TOKEN) {
  const logtail = new Logtail(process.env.LOGTAIL_TOKEN);
  transports.push(new LogtailTransport(logtail));
} else {
  console.warn("[Logger] LOGTAIL_TOKEN missing — BetterStack disabled");
}

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
  ),
  transports,
});

module.exports = logger;
