/**
 * @fileoverview User Personal Workspace Notes Systems Configuration Routing Framework
 * @description Decouples Express routes, mapping paths parameters directly onto celebrate shields.
 */

const express = require("express");

const createPrivateNoteRoutes = (
  privateNoteController,
  authenticate,
  validations,
) => {
  const router = express.Router();
  const {
    createNoteValidation,
    connectRequestIdParamValidation,
    noteIdParamValidation,
  } = validations;

  // Mount declarative authentication firewall boundary rules processing across paths
  router.use(authenticate);

  // @route   POST /api/v1/private-notes
  router.post("/", createNoteValidation, privateNoteController.createNote);

  // @route   GET /api/v1/private-notes/:connectRequestId
  router.get(
    "/:connectRequestId",
    connectRequestIdParamValidation,
    privateNoteController.getNotes,
  );

  // @route   PATCH /api/v1/private-notes/:id
  router.patch("/:id", noteIdParamValidation, privateNoteController.updateNote);

  // @route   DELETE /api/v1/private-notes/:id
  router.delete(
    "/:id",
    noteIdParamValidation,
    privateNoteController.deleteNote,
  );

  return router;
};

module.exports = createPrivateNoteRoutes;
