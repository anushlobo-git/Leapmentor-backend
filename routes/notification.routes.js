/**
 * @fileoverview User Real-time Alerts and Notifications Systems Configuration Routing Framework
 * @description Decouples endpoints mapping path declarations onto validation shields via factory injection.
 */

const express = require("express");

const createNotificationRoutes = (
  notificationController,
  authenticate,
  validations,
) => {
  const router = express.Router();
  const { notificationIdParamValidation } = validations;

  // Establish identity token security wall across endpoints
  router.use(authenticate);

  // @route   GET /api/v1/notifications
  router.get("/", notificationController.getNotifications);

  // @route   PATCH /api/v1/notifications/mark-all-read
  router.patch("/mark-all-read", notificationController.markAllRead);

  // @route   PATCH /api/v1/notifications/:id/read
  router.patch(
    "/:id/read",
    notificationIdParamValidation,
    notificationController.markOneRead,
  );

  // @route   DELETE /api/v1/notifications/clear-all
  router.delete("/clear-all", notificationController.clearAll);

  // @route   DELETE /api/v1/notifications/:id
  router.delete(
    "/:id",
    notificationIdParamValidation,
    notificationController.deleteNotification,
  );

  return router;
};

module.exports = createNotificationRoutes;
