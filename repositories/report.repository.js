const Report = require("../models/Report");

const countAllReports = () => Report.countDocuments();

const countReportsByFilter = (filter) => Report.countDocuments(filter);

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

const findReportById = (id) => Report.findById(id);

const findReportByIdWithUsers = (id) =>
  Report.findById(id)
    .populate("reportedBy", "name email")
    .populate("reportedUser", "name email");

const findReportByIdWithAll = (id) =>
  Report.findById(id)
    .populate("reportedBy", "name email")
    .populate("reportedUser", "name email")
    .populate("connectRequest");

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

const saveReport = (report) => report.save();

module.exports = {
  countAllReports,
  countReportsByFilter,
  findReports,
  findReportById,
  findReportByIdWithUsers,
  findReportByIdWithAll,
  findReportByIdWithConnectFull,
  saveReport,
};
