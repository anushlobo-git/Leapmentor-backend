/**
 * @fileoverview Asset Upload Gateway Controller
 * @description Thin network transmission layer validating multi-part streams and formatting outward JSON schemas.
 */

const catchAsync = require("../utils/catchAsync");
const { sendSuccess } = require("../utils/apiResponse");

const createUploadController = ({ uploadService }) => {
  /**
   * Handles incoming multipart payloads processing avatar image upgrades.
   * @route   POST /api/v1/upload/profile-picture
   * @access  Private
   */
  const uploadProfilePicture = catchAsync(async (req, res, next) => {
    const result = await uploadService.processProfilePicture(
      req.file,
      req.body?.imageName,
    );
    return sendSuccess(res, result, "Profile picture uploaded");
  });

  /**
   * Intercepts explicit document field arrays processing candidate registrations profiles.
   * @route   POST /api/v1/upload/verification-documents
   * @access  Private (Mentor Only)
   */
  const uploadVerificationDocuments = catchAsync(async (req, res, next) => {
    const result = await uploadService.processVerificationDocuments(
      { ...req.user, _id: req.user._id.toString() },
      req.body,
      req.files,
    );
    return sendSuccess(res, result, "Verification documents uploaded");
  });

  return {
    uploadProfilePicture,
    uploadVerificationDocuments,
  };
};

module.exports = createUploadController;
