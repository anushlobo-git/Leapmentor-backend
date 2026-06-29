/**
 * @fileoverview Message Domain Routing Blueprint
 * @description Registers parameter validation layers and secures endpoint bindings via structural dependency injection.
 */

const express = require("express");

const createMessageRoutes = ({ messageController, authenticate, validations }) => {
  const router = express.Router();
  const { getMessagesValidation, getUnreadCountValidation } = validations;

  // Enforce mandatory identity validation barrier for all downstream operations
  router.use(authenticate);

  // @route   GET /api/v1/messages/:connectRequestId
  router.get(
    "/:connectRequestId",
    getMessagesValidation,
    messageController.getMessages,
  );

  // @route   GET /api/v1/messages/:connectRequestId/unread
  router.get(
    "/:connectRequestId/unread",
    getUnreadCountValidation,
    messageController.getUnreadCount,
  );

  return router;
};

module.exports = createMessageRoutes;
