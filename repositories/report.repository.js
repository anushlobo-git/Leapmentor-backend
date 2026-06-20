/**
 * @fileoverview Report Repository
 * @description Direct database access layer for the Report model.
 */

const Report = require("../models/Report");

/**
 * Counts total reports in the database collection.
 * @returns {Promise<number>}
 */
const countAllReports = () => Report.countDocuments();




/**
 * Finds an isolated report by its unique object identifier string.
 * @param {string} id
 * @returns {Promise<Object|null>}
 */
const findReportById = (id) => Report.findById(id);

/**
 * Finds a report document populated with core user properties.
 * @param {string} id
 * @returns {Promise<Object|null>}
 */
const findReportByIdWithUsers = (id) =>
  Report.findById(id)
    .populate("reportedBy", "name email")
    .populate("reportedUser", "name email");

/**
 * Finds a report document populated with user structures and foundational link references.
 * @param {string} id
 * @returns {Promise<Object|null>}
 */
const findReportByIdWithAll = (id) =>
  Report.findById(id)
    .populate("reportedBy", "name email")
    .populate("reportedUser", "name email")
    .populate("connectRequest");

/**
 * Finds a report document expanding nested participant structures.
 * @param {string} id
 * @returns {Promise<Object|null>}
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
 * Updates a report document directly by its ID.
 * @param {string} id
 * @param {Object} updateData
 * @returns {Promise<Object|null>}
 */
const updateReportById = (id, updateData) =>
  Report.findByIdAndUpdate(id, updateData, { new: true });

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
 * Counts reports that match a given filter object parameters block.
 * @param {Object} filter
 * @returns {Promise<number>} Quantified matching total count.
 */
const countReportsByFilter = (filter) => {
  return Report.countDocuments(filter);
};

/**
 * Finds reports utilizing filters, paginated metrics, and query expansions with user populations.
 * @param {Object} filter - Selection query criteria filters block.
 * @param {Object} paginationOptions - Operational bounds.
 * @param {number} paginationOptions.skip
 * @param {number} paginationOptions.limit
 * @returns {Promise<Array<Object>>} Lean list containing plain report objects.
 */
const findReports = (filter, { skip, limit }) => {
  return Report.find(filter)
    .populate("reportedBy", "name email")
    .populate("reportedUser", "name email")
    .populate(
      "connectRequest",
      "status paymentStatus totalAmount sessionRate sessionCount mentee mentor"
    )
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
};

/**
 * Atomically modifies structural metadata fields tracking report records by primary ID.
 * @param {string} id - Unique document reference key identifier string.
 * @param {Object} updateData - Modifiers block payload.
 * @returns {Promise<Object|null>} Populated updated report document entity or null.
 */
const updateReportWithUsers = (id, updateData) => {
  return Report.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  })
    .populate("reportedBy", "name email")
    .populate("reportedUser", "name email");
};

module.exports = {
  countAllReports,
  countReportsByFilter,
  findReports,
  findReportById,
  findReportByIdWithUsers,
  findReportByIdWithAll,
  findReportByIdWithConnectFull,
  updateReportById,
  create,
  findReportByConnectAndReporter,
  updateReportWithUsers
};
