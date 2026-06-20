// config/logger.js
const { Logtail } = require("@logtail/node");
const { LogtailTransport } = require("@logtail/winston");
const winston = require("winston");
const asyncLocalStorage = require("./context");

const transports = [new winston.transports.Console()];

if (process.env.LOGTAIL_TOKEN) {
  const logtail = new Logtail(process.env.LOGTAIL_TOKEN);
  transports.push(new LogtailTransport(logtail));
} else {
  console.warn("[Logger] LOGTAIL_TOKEN missing — BetterStack disabled");
}

const correlationFormat = winston.format((info) => {
  const store = asyncLocalStorage.getStore();
  if (store?.correlationId) {
    info.correlationId = store.correlationId;
  }
  return info;
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    correlationFormat(),
    winston.format.timestamp(),
    winston.format.json(),
  ),
  transports,
});

module.exports = logger;
