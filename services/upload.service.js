/**
 * @fileoverview Cloudinary Asset Upload Service
 * @description Handles the business logic for processing and uploading files to Cloudinary via inverted parameters.
 */

const AppError = require("../utils/AppError");

// Domain Architecture Constants
const CLOUDINARY_RESOURCE_IMAGE = "image";
const CLOUDINARY_RESOURCE_RAW = "raw";
const CLOUDINARY_FOLDER_PROFILES = "leapmentor/profiles";
const CLOUDINARY_FOLDER_RESUMES = "leapmentor/verification-docs/resumes";
const CLOUDINARY_FOLDER_WORK_EXP =
  "leapmentor/verification-docs/work-experience";
const VERIFICATION_STATUS_PENDING = "pending";

const createUploadService = (
  cloudinary,
  streamifier,
  mentorProfileRepository,
  toMentorProfileDTO,
  fireAndForgetEmail,
  sendDocumentsSubmittedEmail,
  logger,
) => {
  /**
   * Helper: Extracts a meaningful error message from various error types.
   * @private
   */
  const _extractErrorMessage = (error) => {
    if (error instanceof Error) return error.message;
    if (typeof error === "object") return JSON.stringify(error);
    return String(error);
  };

  /**
   * Internal Helper: Pipes binary file buffers directly into Cloudinary streaming instances.
   * @private
   */
  const _uploadToCloudinaryProvider = (buffer, options) => {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { ...options },
        (error, result) => {
          if (error) {
            const message = _extractErrorMessage(error);
            return reject(new Error(message));
          }
          resolve(result);
        },
      );
      streamifier.createReadStream(buffer).pipe(uploadStream);
    });
  };

  const processProfilePicture = async (filePayload) => {
    if (!filePayload) {
      throw new AppError("Payload missing: No file uploaded", 400);
    }

    if (!filePayload.mimetype.startsWith("image/")) {
      throw new AppError("Only image files allowed for profile pictures", 400);
    }

    try {
      const uploadResult = await _uploadToCloudinaryProvider(
        filePayload.buffer,
        {
          folder: CLOUDINARY_FOLDER_PROFILES,
          resource_type: CLOUDINARY_RESOURCE_IMAGE,
          use_filename: false,
          unique_filename: true,
          transformation: [
            { width: 400, height: 400, crop: "fill", gravity: "face" },
            { quality: "auto", fetch_format: "auto" },
          ],
        },
      );

      logger.info("Profile picture uploaded successfully", {
        publicId: uploadResult.public_id,
      });
      return { url: uploadResult.secure_url, publicId: uploadResult.public_id };
    } catch (err) {
      logger.error("Cloudinary upload failed", { error: err.message });
      throw new AppError("Failed to upload profile picture", 500);
    }
  };

  const processVerificationDocuments = async (
    currentUser,
    formFields,
    filePayloads,
  ) => {
    const { phoneNumber } = formFields;
    const resumeFile = filePayloads?.resume?.[0];
    const workExperienceFiles = filePayloads?.workExperienceDocs || [];
    const uploadedPublicIds = [];

    if (!resumeFile) throw new AppError("Resume is required", 400);
    if (!phoneNumber?.trim())
      throw new AppError("Phone number is required", 400);

    try {
      // Upload Resume
      const resumeResult = await _uploadToCloudinaryProvider(
        resumeFile.buffer,
        {
          resource_type: CLOUDINARY_RESOURCE_RAW,
          folder: CLOUDINARY_FOLDER_RESUMES,
          unique_filename: true,
        },
      );
      uploadedPublicIds.push(resumeResult.public_id);

      // Upload Work Docs
      const workResults = await Promise.all(
        workExperienceFiles.map((file) =>
          _uploadToCloudinaryProvider(file.buffer, {
            resource_type: CLOUDINARY_RESOURCE_RAW,
            folder: CLOUDINARY_FOLDER_WORK_EXP,
            unique_filename: true,
          }),
        ),
      );
      workResults.forEach((res) => uploadedPublicIds.push(res.public_id));

      // Database Update
      const mentorProfile =
        await mentorProfileRepository.findOneAndUpdateByUserId(
          currentUser._id,
          {
            phoneNumber: phoneNumber.trim(),
            resumeDocument: {
              url: resumeResult.secure_url,
              publicId: resumeResult.public_id,
              uploadedAt: new Date(),
            },
            workExperienceDocuments: workResults.map((r) => ({
              url: r.secure_url,
              publicId: r.public_id,
              uploadedAt: new Date(),
            })),
            verificationStatus: VERIFICATION_STATUS_PENDING,
          },
        );

      if (!mentorProfile) throw new Error("Profile not found");

      logger.info("Verification docs linked to DB", {
        userId: currentUser._id,
      });

      fireAndForgetEmail(
        () =>
          sendDocumentsSubmittedEmail({
            mentorName: currentUser.name,
            mentorEmail: currentUser.email,
          }),
        "Mentor Credentials Verification Documents Submitted",
      );

      return toMentorProfileDTO(mentorProfile);
    } catch (err) {
      logger.error("Verification upload failed, initiating rollback", {
        userId: currentUser._id,
        error: err.message,
      });

      // Rollback: Destroy uploaded files safely
      for (const publicId of uploadedPublicIds) {
        await cloudinary.uploader
          .destroy(publicId, { resource_type: CLOUDINARY_RESOURCE_RAW })
          .catch((e) =>
            logger.warn("Rollback cleanup failed for ID", {
              publicId,
              error: e.message,
            }),
          );
      }

      throw new AppError(
        "System could not process documents. Please try again.",
        500,
      );
    }
  };

  return {
    processProfilePicture,
    processVerificationDocuments,
  };
};

module.exports = createUploadService;
