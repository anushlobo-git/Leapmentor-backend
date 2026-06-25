/**
 * @fileoverview Multi-Part File Streams and Cloud Asset Storage Configuration Routes Framework
 * @description Mounts declarative request verification checkpoints onto media ingestion routes.
 */

const express = require("express");

const createUploadRoutes = (
  uploadController,
  authenticate,
  uploadImage,
  uploadFields,
  validations,
) => {
  const router = express.Router();
  const { uploadVerificationDocsValidation } = validations;

  // Establish identity token security wall across endpoints
  router.use(authenticate);

  // @route   POST /api/v1/upload/profile-picture
  router.post(
    "/profile-picture",
    uploadImage.single("profilePicture"),
    uploadController.uploadProfilePicture,
  );

  // @route   POST /api/v1/upload/verification-documents
  router.post(
    "/verification-documents",
    uploadFields,
    uploadVerificationDocsValidation,
    uploadController.uploadVerificationDocuments,
  );

  return router;
};

module.exports = createUploadRoutes;
