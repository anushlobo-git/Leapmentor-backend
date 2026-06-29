//Leapmentor-backend/repositories/report.repository.js
/**
 * @fileoverview Report Repository
 * @description Direct database access layer for the Report model.
 * Receives the Mongoose model as an injected parameter.
 */

const createReportRepository = (Report) => {
  /**
   * Counts total reports in the database collection.
   * @returns {Promise<number>}
   */
  const countAllReports = () => Report.countDocuments();

  /**
   * Counts reports that match a given filter object parameters block.
   * @param {Object} filter
   * @returns {Promise<number>}
   */
  const countReportsByFilter = (filter) => Report.countDocuments(filter);

  /**
   * Finds reports utilizing filters, paginated metrics, and query expansions.
   */
  const findReports = (filter, { skip, limit }) => {
    return Report.find(filter)
      .populate("reportedBy", "name email")
      .populate("reportedUser", "name email")
      .populate(
        "connectRequest",
        "status paymentStatus totalAmount sessionRate sessionCount mentee mentor",
      )
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
  };

  /**
   * Finds a report document populated with core user properties.
   */
  const findReportByIdWithUsers = (id) =>
    Report.findById(id)
      .populate("reportedBy", "name email")
      .populate("reportedUser", "name email");

  /**
   * Finds a report document populated with user structures and foundational link references.
   */
  const findReportByIdWithAll = (id) =>
    Report.findById(id)
      .populate("reportedBy", "name email")
      .populate("reportedUser", "name email")
      .populate("connectRequest");

  /**
   * Finds a report document expanding nested participant structures.
   */
  const findReportByIdWithConnectFull = (id) =>
    Report.findById(id)
      .populate("reportedBy", "name email")
      .populate("reportedUser", "name email")
      .populate({
        path: "connectRequest",
        populate: [
          { path: "mentee", select: "name email" },
          { path: "mentor", select: "name email" },
        ],
      });

  /**
   * Persists a new incident report document entry.
   * @param {Object} reportData - Structural data fields matching the Report schema.
   * @returns {Promise<Object>} The created Mongoose document instance.
   */
  const create = (reportData) => {
    return Report.create(reportData);
  };

  /**
   * Finds a unique report entry submitted by a specific user for a given connection session.
   * @param {string} connectRequestId
   * @param {string} reportedById
   * @returns {Promise<Object|null>} Lean plain old JavaScript report object or null.
   */
  const findReportByConnectAndReporter = (connectRequestId, reportedById) => {
    return Report.findOne({
      connectRequest: connectRequestId,
      reportedBy: reportedById,
    }).lean();
  };

  /**
   * Persists modifications made onto an active Mongoose report document context block.
   * @param {Object} docInstance - Active report document instance.
   * @returns {Promise<Object>}
   */
  const saveReport = (docInstance) => docInstance.save();

  return {
    countAllReports,
    countReportsByFilter,
    findReports,
    findReportByIdWithUsers,
    findReportByIdWithAll,
    findReportByIdWithConnectFull,
    create,
    saveReport,
    findReportByConnectAndReporter,
  };
};;;

module.exports = createReportRepository;
