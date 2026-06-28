/**
 * @fileoverview Invoice Retrieval Routes
 * @description Handles authorization checks and document dispatch processes matching payment logs via injection.
 */

const express = require("express");

const createInvoiceRoutes = ({ invoiceController, authenticate, validations }) => {
  const router = express.Router();
  const { getInvoicePdfValidation } = validations;

  // All billing statements and accounting sheets require a valid user session signature
  router.use(authenticate);

  // @route   GET /api/v1/invoices/:connectRequestId
  router.get(
    "/:connectRequestId",
    getInvoicePdfValidation,
    invoiceController.downloadInvoice,
  );

  return router;
};

module.exports = createInvoiceRoutes;
