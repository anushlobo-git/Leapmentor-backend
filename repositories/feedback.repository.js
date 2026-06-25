/**
 * @fileoverview Feedback Repository
 * @description Inverted database access layer managing lifecycle methods for the Feedback collection model.
 */

const createFeedbackRepository = (Feedback) => {
  /**
   * Finds a single feedback document matching a specific query.
   */
  const findOne = (query) => {
    return Feedback.findOne(query);
  };

  /**
   * Creates a new feedback document.
   */
  const create = (data) => {
    return Feedback.create(data);
  };

  /**
   * Finds a feedback document by ID and populates standard participant information.
   */
  const findByIdAndPopulateParticipants = (id) => {
    return Feedback.findById(id)
      .populate("from", "name email")
      .populate("to", "name email")
      .lean();
  };

  /**
   * Finds all feedback entries recorded for a specific connection request.
   */
  const findAllByConnectRequest = (connectRequestId) => {
    return Feedback.find({ connectRequest: connectRequestId })
      .populate("from", "name email")
      .lean();
  };

  /**
   * Finds all feedback entries targeted toward a specific user ID.
   */
  const findAllByTargetUser = (targetUserId) => {
    return Feedback.find({ to: targetUserId }).lean();
  };

  return {
    findOne,
    create,
    findByIdAndPopulateParticipants,
    findAllByConnectRequest,
    findAllByTargetUser,
  };
};

module.exports = createFeedbackRepository;
