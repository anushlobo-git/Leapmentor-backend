// controllers/availability.controller.js
const service = require("../services/availability.service");

const respond = (res, data, status = 200) => res.status(status).json(data);

const handleError = (res, err) =>
  respond(res, { message: err.message }, err.statusCode || 500);

// GET /api/availability/me
const getMyAvailability = async (req, res) => {
  try {
    const data = await service.getMyAvailability(req.user._id);
    respond(res, data);
  } catch (err) {
    handleError(res, err);
  }
};

// POST /api/availability
const createAvailability = async (req, res) => {
  try {
    const availability = await service.createAvailability(
      req.user._id,
      req.body,
    );
    respond(
      res,
      { message: "Availability created successfully", availability },
      201,
    );
  } catch (err) {
    handleError(res, err);
  }
};

// PATCH /api/availability/me
const updateAvailability = async (req, res) => {
  try {
    const availability = await service.updateAvailability(
      req.user._id,
      req.body,
    );
    respond(res, {
      message: "Availability updated successfully",
      availability,
    });
  } catch (err) {
    handleError(res, err);
  }
};

// GET /api/availability/:mentorId  (public)
const getMentorAvailability = async (req, res) => {
  try {
    const data = await service.getMentorAvailability(req.params.mentorId);
    respond(res, data);
  } catch (err) {
    handleError(res, err);
  }
};

// DELETE /api/availability/me
const deleteAvailability = async (req, res) => {
  try {
    await service.deleteAvailability(req.user._id);
    respond(res, { message: "Availability cleared successfully" });
  } catch (err) {
    handleError(res, err);
  }
};

// GET /api/availability/:mentorId/slots?duration=60
const getAvailableSlots = async (req, res) => {
  try {
    const duration = parseInt(req.query.duration) || 60;
    const data = await service.getAvailableSlots(
      req.params.mentorId,
      duration,
      req.user._id,
    );
    respond(res, data);
  } catch (err) {
    handleError(res, err);
  }
};

module.exports = {
  getMyAvailability,
  createAvailability,
  updateAvailability,
  getMentorAvailability,
  deleteAvailability,
  getAvailableSlots,
};
