/**
 * @fileoverview Escrow Domain Controller
 * @description Decoupled request and response interface mapping HTTP gateway triggers straight into active escrow services.
 */

const catchAsync = require("../utils/catchAsync");
const escrowService = require("../services/escrow.service");

/**
 * Executes token commitments into escrow hold locks.
 * @route   POST /api/v1/escrow/pay
 * @access  Private (Mentee Only)
 */
const pay = catchAsync(async (req, res) => {
  const result = await escrowService.pay({
    connectRequestId: req.body.connectRequestId,
    sessionRate: req.body.sessionRate,
    sessionCount: req.body.sessionCount,
    menteeId: req.user._id,
  });

  res.status(200).json({
    message: "Payment successful. Tokens locked in escrow.",
    ...result,
  });
});

/**
 * Allocates distinct structural payments covering customized individual sub-slot unit increments.
 * @route   POST /api/v1/escrow/pay-additional
 * @access  Private (Mentee Only)
 */
const payAdditional = catchAsync(async (req, res) => {
  const result = await escrowService.payAdditional({
    connectRequestId: req.body.connectRequestId,
    sessionRate: req.body.sessionRate,
    slotId: req.body.slotId,
    menteeId: req.user._id,
  });

  res.status(200).json({
    message: "Additional session payment successful. Tokens locked in escrow.",
    ...result,
  });
});

/**
 * Transfers completed escrow token asset structures down onto clear mentor balances.
 * @route   POST /api/v1/escrow/release/:requestId
 * @access  Private (Mentee Only)
 */
const release = catchAsync(async (req, res) => {
  const result = await escrowService.release({
    requestId: req.params.requestId,
    menteeId: req.user._id,
  });

  res.status(200).json({
    message: "Session marked complete. Tokens released to mentor.",
    ...result,
  });
});

/**
 * Reverts whole connection balance mappings directly following unperformed workflow breakdowns.
 * @route   POST /api/v1/escrow/refund/:requestId
 * @access  Private (User)
 */
const refund = catchAsync(async (req, res) => {
  const result = await escrowService.refund({
    requestId: req.params.requestId,
    userId: req.user._id,
  });

  res.status(200).json({
    message: "Escrow refunded successfully. Tokens returned to mentee.",
    ...result,
  });
});

/**
 * Exposes real-time escrow holding statuses and summary metadata details.
 * @route   GET /api/v1/escrow/status/:requestId
 * @access  Private (User)
 */
const getStatus = catchAsync(async (req, res) => {
  const result = await escrowService.getStatus({
    requestId: req.params.requestId,
    userId: req.user._id,
  });

  res.status(200).json(result);
});

/**
 * Returns balance metrics mapped configuration data specific to the requesting user profile.
 * @route   GET /api/v1/escrow/wallet
 * @access  Private (User)
 */
const getMyWallet = catchAsync(async (req, res) => {
  const result = await escrowService.getMyWallet(req.user._id);

  res.status(200).json(result);
});

/**
 * Exposes general baseline system calculation configurations describing the active percentage fees.
 * @route   GET /api/v1/escrow/commission-rate
 * @access  Private (User)
 */
const getCommissionRate = catchAsync(async (req, res) => {
  const rate = await escrowService.getCommissionRate();

  res.status(200).json({ commissionRate: rate });
});

module.exports = {
  pay,
  payAdditional,
  release,
  refund,
  getStatus,
  getMyWallet,
  getCommissionRate,
};
