/**
 * @fileoverview Leap Request Domain Controller
 * @description Processes incoming HTTP entry requests, routing variables straight down
 * to point grant calculation handlers via injected services.
 */

const catchAsync = require("../utils/catchAsync");

const createLeapRequestController = ({ leapRequestService }) => {
  /**
   * Retrieves the active outstanding request filed by the executing mentee.
   * @route   GET /api/v1/leap-requests/my-request
   * @access  Private (User)
   */
  const getMyRequest = catchAsync(async (req, res) => {
    const request = await leapRequestService.getMyPendingRequest(req.user._id);

    res.status(200).json({
      success: true,
      data: request || null,
    });
  });

  /**
   * Submits a new points provision request context block into processing tracks.
   * @route   POST /api/v1/leap-requests
   * @access  Private (User)
   */
  const createRequest = catchAsync(async (req, res) => {
    const request = await leapRequestService.createLeapRequest(req.user._id);
    res.status(201).json({
      message: "Request submitted successfully.",
      request,
    });
  });

  /**
   * Returns summary application collections matching filtering conditions.
   * @route   GET /api/v1/leap-requests
   * @access  Private (Admin Only)
   */
  const getAllRequests = catchAsync(async (req, res) => {
    const requests = await leapRequestService.getAllLeapRequests(
      req.query.status,
    );
    res.status(200).json({ requests });
  });

  /**
   * Tallies total tracking numbers monitoring outstanding pending requests.
   * @route   GET /api/v1/leap-requests/pending-count
   * @access  Private (Admin Only)
   */
  const getPendingCount = catchAsync(async (req, res) => {
    const count = await leapRequestService.getPendingCount();
    res.status(200).json({ count });
  });

  /**
   * Confirms points awards and updates targeting mentee balances.
   * @route   PATCH /api/v1/leap-requests/:id/approve
   * @access  Private (Admin Only)
   */
  const approveRequest = catchAsync(async (req, res) => {
    const { newBalance, request } = await leapRequestService.approveLeapRequest(
      req.params.id,
      req.admin?._id,
    );
    res.status(200).json({
      message: "500 LP added successfully.",
      newBalance,
      request,
    });
  });

  /**
   * Denies point provisions requests closing out tracking sheets.
   * @route   PATCH /api/v1/leap-requests/:id/reject
   * @access  Private (Admin Only)
   */
  const rejectRequest = catchAsync(async (req, res) => {
    const request = await leapRequestService.rejectLeapRequest(
      req.params.id,
      req.admin?._id,
    );
    res.status(200).json({ message: "Request rejected.", request });
  });

  return {
    getMyRequest,
    createRequest,
    getAllRequests,
    getPendingCount,
    approveRequest,
    rejectRequest,
  };
};

module.exports = createLeapRequestController;
