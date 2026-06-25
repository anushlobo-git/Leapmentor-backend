/**
 * @fileoverview Leap Request Repository
 * @description Direct database access layer for managing Leap Request model transactions.
 * Receives the Mongoose model as an injected parameter. Contains no business constraints.
 */

const createLeapRequestRepository = (LeapRequest) => {
  /**
   * Finds a single leap request matching a mentee and status, sorted by creation date.
   * @param {string} menteeId
   * @param {string} status
   * @returns {Promise<Object|null>}
   */
  const findLatestByMenteeAndStatus = (menteeId, status) => {
    return LeapRequest.findOne({ mentee: menteeId, status }).sort({
      createdAt: -1,
    });
  };

  /**
   * Creates and persists a new leap request document.
   * @param {Object} data
   * @returns {Promise<Object>}
   */
  const create = (data) => {
    return LeapRequest.create(data);
  };

  /**
   * Finds all leap requests matching an optional status filter with populated mentee data.
   * @param {Object} filter
   * @returns {Promise<Array<Object>>}
   */
  const findAllWithMentee = (filter) => {
    return LeapRequest.find(filter)
      .populate("mentee", "name email profilePicture")
      .sort({ createdAt: -1 });
  };

  /**
   * Counts the total number of documents matching a specific status.
   * @param {string} status
   * @returns {Promise<number>}
   */
  const countByStatus = (status) => {
    return LeapRequest.countDocuments({ status });
  };

  /**
   * Finds a single leap request document by its unique ID.
   * @param {string} id
   * @returns {Promise<Object|null>}
   */
  const findById = (id) => {
    return LeapRequest.findById(id);
  };

  /**
   * Persists changes made onto an active leap request document instance.
   * @param {Object} docInstance
   * @returns {Promise<Object>}
   */
  const save = (docInstance) => {
    return docInstance.save();
  };

  return {
    findLatestByMenteeAndStatus,
    create,
    findAllWithMentee,
    countByStatus,
    findById,
    save,
  };
};

module.exports = createLeapRequestRepository;
