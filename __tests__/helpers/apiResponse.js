/**
 * Expected response envelopes matching utils/apiResponse.js
 */
const successEnvelope = (data, message = "Success") => ({
  success: true,
  data,
  message,
});

const errorEnvelope = (message, error = null) => ({
  success: false,
  data: null,
  message,
  error,
});

module.exports = { successEnvelope, errorEnvelope };
