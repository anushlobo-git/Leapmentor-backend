/**
 * @fileoverview Private Note Data Transfer Object (DTO) Mapper
 * @description Decouples internal user-authored note document states from API payload objects.
 */

const toPrivateNoteDTO = (note) => {
  if (!note) return null;

  return {
    // Dual-ID Support: Complete frontend backward compatibility
    _id: note._id,
    id: note._id?.toString(),
    connectRequest:
      note.connectRequest?._id?.toString() ?? note.connectRequest?.toString(),
    author: note.author?._id?.toString() ?? note.author?.toString(),
    title: note.title || "Untitled Note",
    content: note.content || "",
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
  };
};

module.exports = { toPrivateNoteDTO };
