// backend/routes/invoice.routes.js
const express = require("express");
const { downloadInvoice } = require("../controllers/invoice.controller");
const {authenticate} = require("../middleware/authenticate"); // adjust path if different

const router = express.Router();

// GET /api/invoices/:connectRequestId  — download invoice PDF
router.get("/:connectRequestId", authenticate, downloadInvoice);

module.exports = router;