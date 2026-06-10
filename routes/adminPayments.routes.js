/**
 * @fileoverview Admin Payments and Financial Ledger Routes
 * @description  Handles high-level payment metrics tracking, financial revenue data charts,
 * and detailed platform transactional history streams.
 * @prefix       /api/v1/admin/payments
 * @access       Private (Admin Only)
 */

const express = require("express");
const router = express.Router();
const { adminAuthenticate } = require("../middleware/adminAuth");
const {
  getPaymentStats,
  getRevenueChart,
  getTransactions,
} = require("../controllers/adminPayments.controller");

// Apply administrative session verification to all payment gateways
router.use(adminAuthenticate);

// @route   GET /api/v1/admin/payments/stats
router.get("/stats", getPaymentStats);

// @route   GET /api/v1/admin/payments/chart
router.get("/chart", getRevenueChart);

// @route   GET /api/v1/admin/payments/transactions
router.get("/transactions", getTransactions);

module.exports = router;
