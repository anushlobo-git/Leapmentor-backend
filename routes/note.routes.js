/**
 * @fileoverview Shared and Isolated Documents Files Management Routes Documentation Blueprint
 * @prefix       /api/v1/notes
 * @access       Private (Authenticated Session Participants Only)
 */
const express = require("express");
const router = express.Router();

const { authenticate } = require("../middleware/authenticate");
const { upload } = require("../middleware/upload.middleware");
const {
  uploadNote,
  getNotes,
  getPrivateNotes,
  deleteNote,
} = require("../controllers/note.controller");

// Global pipeline protection firewall across all communication parameters channels endpoints
router.use(authenticate);

// @route   POST /api/v1/notes/upload
router.post("/upload", upload.single("file"), uploadNote);

// @route   GET /api/v1/notes/:connectRequestId/private
router.get("/:connectRequestId/private", getPrivateNotes);

// @route   GET /api/v1/notes/:connectRequestId
router.get("/:connectRequestId", getNotes);

// @route   DELETE /api/v1/notes/:id
router.delete("/:id", deleteNote);

module.exports = router;
