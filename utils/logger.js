// Leapmentor-backend/utils/logger.js

const { Logtail } = require("@logtail/node");

const logtail = new Logtail(process.env.LOGTAIL_BACKEND_TOKEN);

module.exports = logtail;
