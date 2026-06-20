/**
 * @fileoverview User Personal Workspace Notes Systems Configuration Routing Framework
 * @prefix       /api/v1/private-notes
 * @access       Private (Authenticated Session Participants Only)
 */
const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/authenticate");
const {
  createNote,
  getNotes,
  updateNote,
  deleteNote,
} = require("../controllers/privateNote.controller");

// Mount declarative authentication firewall boundary rules processing across all down-stream paths
router.use(authenticate);

// @route   POST /api/v1/private-notes
router.post("/", createNote);

// @route   GET /api/v1/private-notes/:connectRequestId
router.get("/:connectRequestId", getNotes);

// @route   PATCH /api/v1/private-notes/:id
router.patch("/:id", updateNote);

// @route   DELETE /api/v1/private-notes/:id
router.delete("/:id", deleteNote);

module.exports = router;
