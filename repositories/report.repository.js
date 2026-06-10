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
 * Counts reports that match a given filter object.
 * @param {Object} filter
 * @returns {Promise<number>}
 */
const countReportsByFilter = (filter) => Report.countDocuments(filter);

/**
 * Finds reports utilizing filters, paginated metrics, and query expansions.
 * @param {Object} filter
 * @param {Object} options
 * @param {number} options.skip
 * @param {number} options.limit
 * @returns {Promise<Array>}
 */
const findReports = (filter, { skip, limit }) =>
  Report.find(filter)
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

module.exports = {
  countAllReports,
  countReportsByFilter,
  findReports,
  findReportById,
  findReportByIdWithUsers,
  findReportByIdWithAll,
  findReportByIdWithConnectFull,
  updateReportById,
};
