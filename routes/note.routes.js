// backend/routes/note.routes.js
const express    = require("express");
const router     = express.Router();
const { authenticate }             = require("../middleware/authenticate");
const { upload }                   = require("../middleware/upload.middleware");
const { uploadNote, getNotes, deleteNote } = require("../controllers/note.controller");

// ✅ upload.single("file") — expects field name "file" in multipart form
// Multer runs BEFORE the controller — validates type + size before hitting DB

// POST   /api/notes/upload          — upload a file
router.post(
  "/upload",
  authenticate,
  upload.single("file"),
  uploadNote
);

// GET    /api/notes/:connectRequestId  — get all notes for a session
router.get(
  "/:connectRequestId",
  authenticate,
  getNotes
);

// DELETE /api/notes/:id              — delete a note (uploader only)
router.delete(
  "/:id",
  authenticate,
  deleteNote
);

module.exports = router;