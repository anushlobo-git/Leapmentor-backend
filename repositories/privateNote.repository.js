/**
 * @fileoverview Private Note Repository
 * @description Inverted database access layer mapping all operations to the PrivateNote model framework.
 */

const createPrivateNoteRepository = (PrivateNote) => {
  const create = (noteData) => PrivateNote.create(noteData);

  const findBySessionAndAuthor = (connectRequestId, authorId) => {
    return PrivateNote.find({
      connectRequest: connectRequestId,
      author: authorId,
    })
      .sort({ updatedAt: -1 })
      .lean();
  };

  const findById = (id) => PrivateNote.findById(id);

  const save = (noteDocument) => noteDocument.save();

  const deleteById = (id) => PrivateNote.findByIdAndDelete(id);

  return {
    create,
    findBySessionAndAuthor,
    findById,
    save,
    deleteById,
  };
};

module.exports = createPrivateNoteRepository;
