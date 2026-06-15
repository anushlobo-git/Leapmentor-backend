const { v4: uuidv4 } = require("uuid");
const asyncLocalStorage = require("../config/context");

module.exports = (req, res, next) => {
  const correlationId = req.headers["x-correlation-id"] || uuidv4();
  req.correlationId = correlationId;
  res.setHeader("X-Correlation-ID", correlationId);

  asyncLocalStorage.run({ correlationId }, () => next());
};
