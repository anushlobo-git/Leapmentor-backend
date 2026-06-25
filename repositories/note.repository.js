/**
 * @fileoverview Note Repository
 * @description Inverted database access layer managing lifecycle queries for the Note schema module.
 */

const createNoteRepository = (Note) => {
  const create = (noteData) => Note.create(noteData);

  const findById = (id) => Note.findById(id);

  const findByIdWithUploaderLean = (id) =>
    Note.findById(id).populate("uploadedBy", "name email").lean();

  const findSharedByConnectRequest = (connectRequestId) =>
    Note.find({
      connectRequest: connectRequestId,
      isPrivate: { $ne: true },
    })
      .populate("uploadedBy", "name email")
      .sort({ createdAt: -1 })
      .lean();

  const findPrivateByConnectRequestAndUser = (connectRequestId, userId) =>
    Note.find({
      connectRequest: connectRequestId,
      uploadedBy: userId,
      isPrivate: true,
    })
      .populate("uploadedBy", "name email")
      .sort({ createdAt: -1 })
      .lean();

  const deleteById = (id) => Note.findByIdAndDelete(id);

  return {
    create,
    findById,
    findByIdWithUploaderLean,
    findSharedByConnectRequest,
    findPrivateByConnectRequestAndUser,
    deleteById,
  };
};

module.exports = createNoteRepository;
