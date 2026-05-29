// controllers/connectRequest.controller.js
const service = require("../services/connectRequest.service");

const handleError = (res, err) =>
  res.status(err.statusCode || 500).json({ message: err.message });

const sendConnectRequest = async (req, res) => {
  try {
    const request = await service.sendConnectRequestService(
      req.user._id,
      req.body,
      req.user,
    );
    return res
      .status(201)
      .json({ message: "Connect request sent successfully", request });
  } catch (err) {
    if (err.code === 11000)
      return res
        .status(409)
        .json({
          message: "You already have a pending request with this mentor",
        });
    handleError(res, err);
  }
};

const getMyRequests = async (req, res) => {
  try {
    const requests = await service.getMyRequestsService(req.user._id);
    return res.json({ success: true, requests });
  } catch (err) {
    handleError(res, err);
  }
};

const getIncomingRequests = async (req, res) => {
  try {
    const requests = await service.getIncomingRequestsService(
      req.user._id,
      req.query.status,
    );
    return res.json({ success: true, requests });
  } catch (err) {
    handleError(res, err);
  }
};

const respondToRequest = async (req, res) => {
  try {
    const request = await service.respondToRequestService(
      req.params.id,
      req.user._id,
      req.body,
    );
    return res.json({
      message: `Request ${req.body.status} successfully`,
      request,
    });
  } catch (err) {
    handleError(res, err);
  }
};

const cancelRequest = async (req, res) => {
  try {
    await service.cancelRequestService(req.params.id, req.user._id);
    return res.json({ message: "Request cancelled successfully" });
  } catch (err) {
    handleError(res, err);
  }
};

const referRequest = async (req, res) => {
  try {
    const result = await service.referRequestService(
      req.params.id,
      req.user._id,
      req.body,
    );
    return res.json({ message: "Request referred successfully", ...result });
  } catch (err) {
    handleError(res, err);
  }
};

const getOngoingConnects = async (req, res) => {
  try {
    const connects = await service.getOngoingConnectsService(req.user._id);
    return res.json({ success: true, connects });
  } catch (err) {
    handleError(res, err);
  }
};

const getConnectDetail = async (req, res) => {
  try {
    const connect = await service.getConnectDetailService(
      req.params.id,
      req.user._id,
    );
    return res.json({ success: true, connect });
  } catch (err) {
    handleError(res, err);
  }
};

module.exports = {
  sendConnectRequest,
  getMyRequests,
  getIncomingRequests,
  respondToRequest,
  cancelRequest,
  referRequest,
  getOngoingConnects,
  getConnectDetail,
};
