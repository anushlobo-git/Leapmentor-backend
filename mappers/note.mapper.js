/**
 * @fileoverview Note Data Transfer Object (DTO) Mapper
 * @description Decouples internal binary attachment document metrics from client response streams.
 */

const toNoteDTO = (note) => {
  if (!note) return null;

  return {
    // ✅ Dual-ID Support: Complete frontend backward compatibility
    _id: note._id,
    
    connectRequest:
      note.connectRequest?._id?.toString() ?? note.connectRequest?.toString(),

    // Safe extraction fallback paths handle raw user IDs or populated structures completely uniformly
    uploadedBy: note.uploadedBy?._id
      ? {
          id: note.uploadedBy._id.toString(),
          name: note.uploadedBy.name,
          email: note.uploadedBy.email,
        }
      : note.uploadedBy?.toString(),

    uploaderRole: note.uploaderRole || "",
    title: note.title || "",
    fileUrl: note.fileUrl || "",
    publicId: note.publicId || "",
    fileType: note.fileType || "other",
    fileName: note.fileName || "",
    fileSize: note.fileSize ?? 0,
    isPrivate: note.isPrivate || false,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
  };
};

module.exports = { toNoteDTO };
