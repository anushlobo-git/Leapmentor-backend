/**
 * @fileoverview HelpCenter Ingestion & Administrative Ticket Management Routes Framework
 * @description Decouples Express routes, mapping paths parameters directly onto celebrate shields.
 */

const express = require("express");

const createSupportRoutes = (
  supportController,
  adminAuthenticate,
  validations,
) => {
  const router = express.Router();
  const { createMessageValidation, resolveMessageValidation } = validations;

  // --- PUBLIC INGESTION ENDPOINTS (ACCESSIBLE OUT-OF-BAND FROM HELP CENTER SUBMISSIONS) ---
  // @route   POST /api/v1/support/messages
  router.post(
    "/messages",
    createMessageValidation,
    supportController.createMessage,
  );

  // --- SECURED MANAGEMENT SEGMENTS (RESTRICTED TO VERIFIED ADMINISTRATOR SECURITY REALMS) ---
  router.use("/messages", adminAuthenticate);

  // @route   GET /api/v1/support/messages
  router.get("/messages", supportController.getMessages);

  // @route   PATCH /api/v1/support/messages/:id/resolve
  router.patch(
    "/messages/:id/resolve",
    resolveMessageValidation,
    supportController.resolveMessage,
  );

  return router;
};

module.exports = createSupportRoutes;
