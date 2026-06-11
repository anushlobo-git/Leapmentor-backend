/**
 * @fileoverview Escrow Ledger Routes
 * @description  Handles secure mentee token locks, complete settlement releases, and transactional refund operations.
 * @prefix       /api/v1/escrow
 * @access       Private (Authenticated Users)
 */

const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/authenticate");
const {
  pay,
  payAdditional,
  release,
  refund,
  getStatus,
  getMyWallet,
  getCommissionRate,
} = require("../controllers/escrow.controller");

// All escrow endpoints require a verified identity signature
router.use(authenticate);

// @route   POST /api/v1/escrow/pay
router.post("/pay", pay);

// @route   POST /api/v1/escrow/pay-additional
router.post("/pay-additional", payAdditional);

// @route   POST /api/v1/escrow/release/:requestId
router.post("/release/:requestId", release);

// @route   POST /api/v1/escrow/refund/:requestId
router.post("/refund/:requestId", refund);

// @route   GET /api/v1/escrow/status/:requestId
router.get("/status/:requestId", getStatus);

// @route   GET /api/v1/escrow/wallet
router.get("/wallet", getMyWallet);

// @route   GET /api/v1/escrow/commission-rate
router.get("/commission-rate", getCommissionRate);

module.exports = router;
