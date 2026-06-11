/**
 * @fileoverview Asset Upload Gateway Controller
 * @description Thin network transmission layer validating multi-part streams and formatting outward JSON schemas.
 */
const catchAsync = require("../utils/catchAsync");
const uploadService = require("../services/upload.service");

/**
 * Handles incoming multipart payloads processing avatar image upgrades.
 * @route   POST /api/v1/upload/profile-picture
 * @access  Private
 */
const uploadProfilePicture = catchAsync(async (req, res) => {
  const result = await uploadService.processProfilePicture(req.file);

  res.status(200).json({
    success: true,
    ...result,
  });
});

/**
 * Intercepts explicit document field arrays processing candidate registrations profiles.
 * @route   POST /api/v1/upload/verification-documents
 * @access  Private (Mentor Only)
 */
const uploadVerificationDocuments = catchAsync(async (req, res) => {
  const result = await uploadService.processVerificationDocuments(
    req.user,
    req.body,
    req.files,
  );

  res.status(200).json({
    success: true,
    ...result,
  });
});

module.exports = {
  uploadProfilePicture,
  uploadVerificationDocuments,
};
