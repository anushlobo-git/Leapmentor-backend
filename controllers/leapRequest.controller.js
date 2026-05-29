// controllers/leapRequest.controller.js
const {
  getMyRequestService,
  createRequestService,
  getAllRequestsService,
  getPendingCountService,
  approveRequestService,
  rejectRequestService,
} = require("../services/leapRequest.service");

// ── MENTEE ────────────────────────────────────────────────────

const getMyRequest = async (req, res) => {
  try {
    const request = await getMyRequestService(req.user._id);
    return res.json(request);
  } catch (err) {
    if (err.message === "NO_PENDING_REQUEST")
      return res.status(404).json({ message: "No pending request" });
    return res.status(500).json({ message: err.message });
  }
};

const createRequest = async (req, res) => {
  try {
    const request = await createRequestService(req.user._id);
    return res.status(201).json({
      message: "Request submitted successfully.",
      request,
    });
  } catch (err) {
    if (err.message === "PENDING_REQUEST_EXISTS")
      return res
        .status(400)
        .json({ message: "A pending request already exists." });
    if (err.message === "SUFFICIENT_BALANCE")
      return res
        .status(400)
        .json({ message: "You still have Leap Points remaining." });
    return res.status(500).json({ message: err.message });
  }
};

// ── ADMIN ─────────────────────────────────────────────────────

const getAllRequests = async (req, res) => {
  try {
    const requests = await getAllRequestsService();
    return res.json({ requests });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const getPendingCount = async (req, res) => {
  try {
    const count = await getPendingCountService();
    return res.json({ count });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const approveRequest = async (req, res) => {
  try {
    const { newBalance, request } = await approveRequestService(
      req.params.id,
      req.admin?._id,
    );
    return res.json({
      message: "500 LP added successfully.",
      newBalance,
      request,
    });
  } catch (err) {
    if (err.message === "REQUEST_NOT_FOUND")
      return res.status(404).json({ message: "Request not found." });
    if (err.message === "ALREADY_PROCESSED")
      return res.status(400).json({ message: "Request already processed." });
    return res.status(500).json({ message: err.message });
  }
};

const rejectRequest = async (req, res) => {
  try {
    const request = await rejectRequestService(req.params.id, req.admin?._id);
    return res.json({ message: "Request rejected.", request });
  } catch (err) {
    if (err.message === "REQUEST_NOT_FOUND")
      return res.status(404).json({ message: "Request not found." });
    if (err.message === "ALREADY_PROCESSED")
      return res.status(400).json({ message: "Request already processed." });
    return res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getMyRequest,
  createRequest,
  getAllRequests,
  getPendingCount,
  approveRequest,
  rejectRequest,
};
 