/**
 * @fileoverview Invoice Retrieval Routes
 * @description  Handles authorization checks and document dispatch processes matching payment logs.
 * @prefix       /api/v1/invoices
 * @access       Private (Mentee Only)
 */

const express = require("express");
const router = express.Router();
const { downloadInvoice } = require("../controllers/invoice.controller");
const { authenticate } = require("../middleware/authenticate");

// All billing statements and accounting sheets require a valid user session signature
router.use(authenticate);

// @route   GET /api/v1/invoices/:connectRequestId
router.get("/:connectRequestId", downloadInvoice);

module.exports = router;
