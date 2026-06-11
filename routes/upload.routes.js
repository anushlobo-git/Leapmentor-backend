/**
 * @fileoverview Multi-Part File Streams and Cloud Asset Storage Configuration Routes Framework
 * @prefix       /api/v1/upload
 * @access       Private (Authenticated Accounts Only)
 */
const express = require("express");
const router = express.Router();
const multer = require("multer");

const { authenticate } = require("../middleware/authenticate");
const { upload } = require("../middleware/upload.middleware");
const {
  uploadProfilePicture,
  uploadVerificationDocuments,
} = require("../controllers/upload.controller");

// Isolated baseline image validator config locking capacities down to standard 5MB limits
const uploadImage = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"), false);
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

// Establish global pipeline authentication rules context monitoring parameter boundaries
router.use(authenticate);

// @route   POST /api/v1/upload/profile-picture
router.post(
  "/profile-picture",
  uploadImage.single("profilePicture"),
  uploadProfilePicture,
);

// @route   POST /api/v1/upload/verification-documents
router.post(
  "/verification-documents",
  upload.fields([
    { name: "resume", maxCount: 1 },
    { name: "workExperienceDocs", maxCount: 3 },
  ]),
  uploadVerificationDocuments,
);

module.exports = router;
