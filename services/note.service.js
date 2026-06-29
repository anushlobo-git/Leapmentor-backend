/**
 * @fileoverview Note Business Logic Service
 * @description Coordinates session permissions authorization firewalls, buffers storage transfers,
 * and document persistence lifecycles via parameter dependency injection.
 */

const AppError = require("../utils/AppError");
const { toNoteDTO } = require("../mappers/note.mapper");

const SESSION_STATUS_ONGOING = "ongoing";
const SESSION_STATUS_COMPLETED = "completed";
const ALLOWED_SESSION_STATUSES = new Set([
  SESSION_STATUS_ONGOING,
  SESSION_STATUS_COMPLETED,
]);
const ROLE_MENTOR = "mentor";
const ROLE_MENTEE = "mentee";
const CLOUDINARY_RESOURCE_TYPE_RAW = "raw";

const createNoteService = ({
  noteRepository,
  connectRequestRepository,
  cloudinary,
  streamifier,
  getFileType,
  logger,
}) => {
  const _extractErrorMessage = (error) => {
    if (error instanceof Error) return error.message;
    if (typeof error === "object") return JSON.stringify(error);
    return String(error);
  };

  const _verifySessionAccess = async (connectRequestId, userId) => {
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

  const _uploadToCloudinaryProvider = (buffer, customOptions) => {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        customOptions,
        (error, uploadResult) => {
          if (error) {
            const message = _extractErrorMessage(error);
            return reject(new Error(message));
          }
          return resolve(uploadResult);
        },
      );
      streamifier.createReadStream(buffer).pipe(stream);
    });
  };

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

    const sessionAccess = await _verifySessionAccess(connectRequestId, userId);

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
      uploadResult = await _uploadToCloudinaryProvider(filePayload.buffer, {
        folder: `leapmentor/notes/${connectRequestId}`,
        resource_type: CLOUDINARY_RESOURCE_TYPE_RAW,
        use_filename: true,
        unique_filename: true,
        timeout: 120000,
        chunk_size: 6000000,
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

    const savedNote = await noteRepository.findByIdWithUploaderLean(note._id);
    return toNoteDTO(savedNote);
  };

  const getSharedNotesList = async (connectRequestId, userId) => {
    await _verifySessionAccess(connectRequestId, userId);
    const notes =
      await noteRepository.findSharedByConnectRequest(connectRequestId);
    return notes.map(toNoteDTO);
  };

  const getPrivateNotesList = async (connectRequestId, userId) => {
    await _verifySessionAccess(connectRequestId, userId);
    const notes = await noteRepository.findPrivateByConnectRequestAndUser(
      connectRequestId,
      userId,
    );
    return notes.map(toNoteDTO);
  };

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

  return {
    processNoteUpload,
    getSharedNotesList,
    getPrivateNotesList,
    removeNoteRecord,
  };
};

module.exports = createNoteService;
