/**
 * @fileoverview Admin Payments Sub-System Routing Matrix
 * @description Mounts secure financial routes to corresponding controller instances.
 */

const express = require("express");
const {
  getTransactionsQueryValidation,
} = require("../validations/admin-payments.validation");

const createAdminPaymentsRoutes = (
  adminPaymentsController,
  adminAuthenticate,
) => {
  const router = express.Router();

  // Secure all downstream nodes under the active admin verification wall
  router.use(adminAuthenticate);

  // @route   GET /api/v1/admin/payments/stats
  router.get("/stats", adminPaymentsController.getPaymentStats);

  // @route   GET /api/v1/admin/payments/revenue-chart
  router.get("/chart", adminPaymentsController.getRevenueChart);

  // @route   GET /api/v1/admin/payments/transactions
  router.get(
    "/transactions",
    getTransactionsQueryValidation,
    adminPaymentsController.getTransactions,
  );

  return router;
};

module.exports = createAdminPaymentsRoutes;
