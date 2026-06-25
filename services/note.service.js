/**
 * @fileoverview Note Business Logic Service
 * @description Coordinates session permissions authorization firewalls, buffers storage transfers, and document persistence lifecycles.
 */
const streamifier = require("streamifier");
const { cloudinary } = require("../config/cloudinary");
const AppError = require("../utils/AppError");
const logger = require("../config/logger");

// Repositories
const noteRepository = require("../repositories/note.repository");
const connectRequestRepository = require("../repositories/connectRequest.repository");
const { toNoteDTO } = require("../mappers/note.mapper");
// Utilities
const { getFileType } = require("../middleware/upload.middleware");

// Upper-case Domain Constants
const SESSION_STATUS_ONGOING = "ongoing";
const SESSION_STATUS_COMPLETED = "completed";
const ALLOWED_SESSION_STATUSES = new Set([
  SESSION_STATUS_ONGOING,
  SESSION_STATUS_COMPLETED,
]);
const ROLE_MENTOR = "mentor";
const ROLE_MENTEE = "mentee";
const CLOUDINARY_RESOURCE_TYPE_RAW = "raw";

/**
 * Helper: Extracts a meaningful error message from various error types.
 * @private
 * @param {Error|Object|string} error - The error to extract message from.
 * @returns {string} Formatted error message.
 */
const extractErrorMessage = (error) => {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "object") {
    return JSON.stringify(error);
  }
  return String(error);
};

/**
 * Internal Helper: Verifies that the current user belongs to the targeted connection session.
 * @throws {AppError} 400 | 403 | 404
 */
const verifySessionAccess = async (connectRequestId, userId) => {
  const request = await connectRequestRepository.findById(connectRequestId);
  if (!request) {
    throw new AppError("Target connection session request not found", 404);
  }

  if (!ALLOWED_SESSION_STATUSES.has(request.status)) {
    throw new AppError(
      "Cannot manipulate assets for an inactive connection session context",
      400,
    );
  }

  const identityToken = userId.toString();
  const isMentor = request.mentor.toString() === identityToken;
  const isMentee = request.mentee.toString() === identityToken;

  if (!isMentor && !isMentee) {
    throw new AppError(
      "Access denied: You are not a valid participant inside this engagement pool",
      403,
    );
  }

  return {
    uploaderRole: isMentor ? ROLE_MENTOR : ROLE_MENTEE,
    sessionStatus: request.status,
  };
};

/**
 * Internal Helper: Channels binary document file buffers directly down to Cloudinary streams.
 */
const uploadToCloudinaryProvider = (buffer, customOptions) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      customOptions,
      (error, uploadResult) => {
        if (error) {
          const message = extractErrorMessage(error);
          return reject(new Error(message));
        }
        resolve(uploadResult);
      },
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });
};

/**
 * Authenticates participant permissions and streams documents safely to cloud storage instances.
 * @param {string} connectRequestId
 * @param {string} userId
 * @param {Object} filePayload - Memory buffer properties forwarded from middleware.
 * @param {Object} inputFields - Title string values and structural flags parameters.
 * @throws {AppError} 400
 * @returns {Promise<Object>} Cleanly populated and formatted Note payload instance record.
 */
const processNoteUpload = async (
  connectRequestId,
  userId,
  filePayload,
  inputFields,
) => {
  if (!connectRequestId) {
    throw new AppError(
      "connectRequestId query context field parameter is required",
      400,
    );
  }
  if (!filePayload) {
    throw new AppError(
      "No valid processing file structure or object payload uploaded",
      400,
    );
  }

  const sessionAccess = await verifySessionAccess(connectRequestId, userId);

  if (sessionAccess.sessionStatus === SESSION_STATUS_COMPLETED) {
    throw new AppError(
      "Prohibited action: Uploading notes to a completed connection lifecycle is disabled",
      400,
    );
  }

  const isPrivate =
    inputFields.isPrivate === "true" || inputFields.isPrivate === true;

  let uploadResult;
  try {
    uploadResult = await uploadToCloudinaryProvider(filePayload.buffer, {
      folder: `leapmentor/notes/${connectRequestId}`,
      resource_type: CLOUDINARY_RESOURCE_TYPE_RAW,
      use_filename: true,
      unique_filename: true,
    });
  } catch (cloudinaryError) {
    throw new AppError(
      `Cloud asset storage delivery system failure: ${cloudinaryError.message}`,
      400,
    );
  }

  const note = await noteRepository.create({
    connectRequest: connectRequestId,
    uploadedBy: userId,
    uploaderRole: sessionAccess.uploaderRole,
    title: inputFields.title?.trim() || filePayload.originalname,
    fileUrl: uploadResult.secure_url,
    publicId: uploadResult.public_id,
    fileType: getFileType(filePayload.mimetype),
    fileName: filePayload.originalname,
    fileSize: filePayload.size,
    isPrivate,
  });

  //  Wrap the populated record with the DTO serializer layer before returning
  const savedNote = await noteRepository.findByIdWithUploaderLean(note._id);
  return toNoteDTO(savedNote);
};

/**
 * Resolves shared notes collections linked to a specific connect request pool.
 */
const getSharedNotesList = async (connectRequestId, userId) => {
  await verifySessionAccess(connectRequestId, userId);
  const notes =
    await noteRepository.findSharedByConnectRequest(connectRequestId);

  // Enforce data formatting rules down across the entire collection array
  return notes.map(toNoteDTO);
};

/**
 * Resolves user-isolated private documentation blocks matching current session credentials.
 */
const getPrivateNotesList = async (connectRequestId, userId) => {
  await verifySessionAccess(connectRequestId, userId);
  const notes = await noteRepository.findPrivateByConnectRequestAndUser(
    connectRequestId,
    userId,
  );

  // Enforce data formatting rules down across the entire collection array
  return notes.map(toNoteDTO);
};

/**
 * Validates ownership layers and detaches structural elements from storage platforms and metadata engines.
 * @param {string} noteId
 * @param {string} userId
 * @throws {AppError} 403 | 404
 */
const removeNoteRecord = async (noteId, userId) => {
  const note = await noteRepository.findById(noteId);
  if (!note) {
    throw new AppError(
      "Requested note reference point missing or deleted",
      404,
    );
  }

  if (note.uploadedBy.toString() !== userId.toString()) {
    throw new AppError(
      "Authorization restriction: You can only delete your own notes updates records",
      403,
    );
  }

  try {
    await cloudinary.uploader.destroy(note.publicId, {
      resource_type: CLOUDINARY_RESOURCE_TYPE_RAW,
    });
  } catch (error_) {
    logger.warn("Cloudinary file unlinking warning", {
      message: error_.message,
    });
  }

  await noteRepository.deleteById(noteId);
};

module.exports = {
  processNoteUpload,
  getSharedNotesList,
  getPrivateNotesList,
  removeNoteRecord,
};
