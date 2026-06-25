/**
 * @fileoverview Shared and Isolated Documents Files Management Routes Documentation Blueprint
 * @description Mounts declarative schema checks onto endpoints handling multi-format artifacts.
 */

const express = require("express");

const createNoteRoutes = (noteController, middlewares, validations) => {
  const router = express.Router();
  const { authenticate, upload } = middlewares;
  const {
    uploadNoteValidation,
    connectRequestIdParamValidation,
    noteIdParamValidation,
  } = validations;

  // Global protection layer across endpoints
  router.use(authenticate);

  // @route   POST /api/v1/notes/upload
  router.post(
    "/upload",
    upload.single("file"),
    uploadNoteValidation,
    noteController.uploadNote,
  );

  // @route   GET /api/v1/notes/:connectRequestId/private
  router.get(
    "/:connectRequestId/private",
    connectRequestIdParamValidation,
    noteController.getPrivateNotes,
  );

  // @route   GET /api/v1/notes/:connectRequestId
  router.get(
    "/:connectRequestId",
    connectRequestIdParamValidation,
    noteController.getNotes,
  );

  // @route   DELETE /api/v1/notes/:id
  router.delete("/:id", noteIdParamValidation, noteController.deleteNote);

  return router;
};

module.exports = createNoteRoutes;
