/**
 * @fileoverview Asset Upload Business Logic Service
 * @description Processes multi-part document streams, transforms profile imagery profiles,
 * and coordinates verification uploads to secure Cloudinary storage buckets.
 */
const streamifier = require("streamifier");
const { cloudinary } = require("../config/cloudinary");
const AppError = require("../utils/AppError");

// Repositories
const mentorProfileRepository = require("../repositories/mentor.repository");

// Out-of-band Notification Helpers
const {
  sendDocumentsSubmittedEmail,
} = require("../utils/sendNotificationEmail");

// Upper-case Domain Architecture Constants
const CLOUDINARY_RESOURCE_IMAGE = "image";
const CLOUDINARY_RESOURCE_RAW = "raw";
const CLOUDINARY_FOLDER_PROFILES = "leapmentor/profiles";
const CLOUDINARY_FOLDER_RESUMES = "leapmentor/verification-docs/resumes";
const CLOUDINARY_FOLDER_WORK_EXP =
  "leapmentor/verification-docs/work-experience";
const VERIFICATION_STATUS_PENDING = "pending";

/**
 * Internal Helper: Pipes binary file buffers directly into Cloudinary streaming instances.
 * @private
 */
const uploadToCloudinaryProvider = (buffer, options) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { ...options },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      },
    );
    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
};

/**
 * Validates, crops, and updates user profile picture avatars on cloud storage.
 * @param {Object} filePayload - Multipart file object extracted from transport middleware.
 * @throws {AppError} 400
 * @returns {Promise<Object>} Secure storage locations mapping URLs and public tracking IDs.
 */
const processProfilePicture = async (filePayload) => {
  if (!filePayload) {
    throw new AppError("Payload missing: No file uploaded for processing", 400);
  }

  if (!filePayload.mimetype.startsWith("image/")) {
    throw new AppError(
      "Validation failure: Only image files are allowed for profile picture slots",
      400,
    );
  }

  const uploadResult = await uploadToCloudinaryProvider(filePayload.buffer, {
    folder: CLOUDINARY_FOLDER_PROFILES,
    resource_type: CLOUDINARY_RESOURCE_IMAGE,
    use_filename: false,
    unique_filename: true,
    transformation: [
      { width: 400, height: 400, crop: "fill", gravity: "face" },
      { quality: "auto", fetch_format: "auto" },
    ],
  });

  return {
    url: uploadResult.secure_url,
    publicId: uploadResult.public_id,
  };
};

/**
 * Uploads onboarding credentials and attaches background metrics to a mentor profile document.
 * @param {Object} currentUser - Active authenticated passport identity record.
 * @param {Object} formFields - Express body elements matching phone strings.
 * @param {Object} filePayloads - Object array maps processing text document structures.
 * @throws {AppError} 400 | 404
 * @returns {Promise<Object>} Processed storage metadata references data maps.
 */
const processVerificationDocuments = async (
  currentUser,
  formFields,
  filePayloads,
) => {
  const { phoneNumber } = formFields;
  const resumeFile = filePayloads?.resume?.[0];
  const workExperienceFiles = filePayloads?.workExperienceDocs || [];

  if (!resumeFile) {
    throw new AppError(
      "Missing document: Resume file attachment is required to initiate registration",
      400,
    );
  }

  if (!phoneNumber || phoneNumber.trim() === "") {
    throw new AppError(
      "Missing parameter: Phone number string value is required",
      400,
    );
  }

  const resumeResult = await uploadToCloudinaryProvider(resumeFile.buffer, {
    resource_type: CLOUDINARY_RESOURCE_RAW,
    folder: CLOUDINARY_FOLDER_RESUMES,
    use_filename: true,
    unique_filename: true,
  });

  const resumeDocument = {
    url: resumeResult.secure_url,
    publicId: resumeResult.public_id,
    uploadedAt: new Date(),
  };

  let workExperienceDocuments = [];

  if (workExperienceFiles.length > 0) {
    const workUploadPromises = workExperienceFiles.map((file) =>
      uploadToCloudinaryProvider(file.buffer, {
        resource_type: CLOUDINARY_RESOURCE_RAW,
        folder: CLOUDINARY_FOLDER_WORK_EXP,
        use_filename: true,
        unique_filename: true,
      }),
    );

    const workResults = await Promise.all(workUploadPromises);

    workExperienceDocuments = workResults.map((result) => ({
      url: result.secure_url,
      publicId: result.public_id,
      uploadedAt: new Date(),
    }));
  }

  // Atomic lookup-and-modify wrapper executed through your pre-existing mentorProfile repository
  const mentorProfile = await mentorProfileRepository.findOneAndUpdateByUserId(
    currentUser._id,
    {
      phoneNumber: phoneNumber.trim(),
      resumeDocument,
      workExperienceDocuments,
      verificationStatus: VERIFICATION_STATUS_PENDING,
    },
  );

  if (!mentorProfile) {
    throw new AppError(
      "Mentor profile background document not found matching identity references",
      404,
    );
  }

  // Decoupled fire-and-forget background notification delivery keeps primary API context loop snappy
  sendDocumentsSubmittedEmail({
    mentorName: currentUser.name,
    mentorEmail: currentUser.email,
  }).catch((emailError) => {
    console.error(
      "❌ sendDocumentsSubmittedEmail async operation failed:",
      emailError.message,
    );
  });

  return {
    resumeDocument,
    workExperienceDocuments,
  };
};

module.exports = {
  processProfilePicture,
  processVerificationDocuments,
};
