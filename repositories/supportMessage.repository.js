/**
 * @fileoverview Support Message Repository
 * @description Inverted database access layer mapping all operations to the SupportMessage model framework.
 */

const createSupportMessageRepository = (SupportMessage) => {
  /**
   * Creates and persists a new support message ticket.
   */
  const create = (messageData) => {
    return SupportMessage.create(messageData);
  };

  /**
   * Retrieves all support messages sorted by newest first.
   */
  const findAllSortedByNewest = () => {
    return SupportMessage.find().sort({ createdAt: -1 }).lean();
  };

  /**
   * Atomically updates a support ticket status by its unique ID.
   */
  const updateStatusById = (id, status) => {
    return SupportMessage.findByIdAndUpdate(
      id,
      { $set: { status } },
      { new: true },
    ).lean();
  };

  return {
    create,
    findAllSortedByNewest,
    updateStatusById,
  };
};

module.exports = createSupportMessageRepository;
