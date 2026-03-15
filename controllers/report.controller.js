// backend/controllers/report.controller.js
const Report          = require("../models/Report");
const ConnectRequest  = require("../models/ConnectRequest");
const { cloudinary }  = require("../config/cloudinary");

// ── Helper: stream buffer to Cloudinary ──────────────────────
const uploadToCloudinary = (buffer, mimetype) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder:           "leapmentor/reports",
        resource_type:    "image",
        allowed_formats:  ["jpg", "jpeg", "png", "webp"],
        transformation:   [{ quality: "auto", fetch_format: "auto" }],
      },
      (error, result) => (error ? reject(error) : resolve(result))
    );
    stream.end(buffer);
  });

// ─────────────────────────────────────────────────────────────
// POST /api/reports
// Auth: mentor | mentee
// Body (multipart/form-data):
//   connectRequestId, complaintType, description
// File (optional): screenshot
// ─────────────────────────────────────────────────────────────
const submitReport = async (req, res) => {
  try {
    const { connectRequestId, complaintType, description } = req.body;
    const reportedById = req.user._id;

    // ── 1. Validate required fields ───────────────────────────
    if (!connectRequestId || !complaintType || !description) {
      return res.status(400).json({
        message: "connectRequestId, complaintType, and description are required.",
      });
    }

    if (description.trim().length < 10) {
      return res.status(400).json({
        message: "Description must be at least 10 characters.",
      });
    }

    // ── 2. Fetch the connect request ──────────────────────────
    const connect = await ConnectRequest.findById(connectRequestId);
    if (!connect) {
      return res.status(404).json({ message: "Connect request not found." });
    }

    // ── 3. Ensure requester is part of this connect request ───
    const isMentee = connect.mentee.toString() === reportedById.toString();
    const isMentor = connect.mentor.toString() === reportedById.toString();

    if (!isMentee && !isMentor) {
      return res.status(403).json({
        message: "You are not part of this connect request.",
      });
    }

    const reporterRole  = isMentee ? "mentee" : "mentor";
    const reportedUserId = isMentee ? connect.mentor : connect.mentee;

    // ── 4. Check for duplicate report ────────────────────────
    const existing = await Report.findOne({
      connectRequest: connectRequestId,
      reportedBy:     reportedById,
    });

    if (existing) {
      return res.status(409).json({
        message: "You have already submitted a report for this session.",
      });
    }

    // ── 5. Upload screenshot if provided ─────────────────────
    let screenshotUrl      = "";
    let screenshotPublicId = "";

    if (req.file) {
      const uploaded = await uploadToCloudinary(
        req.file.buffer,
        req.file.mimetype
      );
      screenshotUrl      = uploaded.secure_url;
      screenshotPublicId = uploaded.public_id;
    }

    // ── 6. Create report ──────────────────────────────────────
    const report = await Report.create({
      connectRequest:    connectRequestId,
      reportedBy:        reportedById,
      reportedUser:      reportedUserId,
      reporterRole,
      complaintType,
      description:       description.trim(),
      screenshotUrl,
      screenshotPublicId,
    });

    return res.status(201).json({
      success: true,
      message: "Report submitted successfully. Our team will review it shortly.",
      report,
    });
  } catch (err) {
    console.error("❌ submitReport error:", err);
    return res.status(500).json({ message: "Server error. Please try again." });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/reports/my/:connectRequestId
// Auth: mentor | mentee
// Returns: the current user's report for this connect request (if any)
// ─────────────────────────────────────────────────────────────
const getMyReport = async (req, res) => {
  try {
    const { connectRequestId } = req.params;

    const report = await Report.findOne({
      connectRequest: connectRequestId,
      reportedBy:     req.user._id,
    }).lean();

    return res.status(200).json({ report: report || null });
  } catch (err) {
    console.error("❌ getMyReport error:", err);
    return res.status(500).json({ message: "Server error." });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/reports/admin
// Auth: admin only (wire up requireRole("admin") in route)
// Query: status, page, limit
// ─────────────────────────────────────────────────────────────
const getAllReports = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (status) filter.status = status;

    const skip  = (Number(page) - 1) * Number(limit);
    const total = await Report.countDocuments(filter);

    const reports = await Report.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate("reportedBy",   "name email")
      .populate("reportedUser", "name email")
      .populate("connectRequest", "status totalAmount")
      .lean();

    return res.status(200).json({
      reports,
      pagination: {
        total,
        page:       Number(page),
        limit:      Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    console.error("❌ getAllReports error:", err);
    return res.status(500).json({ message: "Server error." });
  }
};

// ─────────────────────────────────────────────────────────────
// PATCH /api/reports/admin/:reportId
// Auth: admin only
// Body: { status, adminNote }
// ─────────────────────────────────────────────────────────────
const updateReportStatus = async (req, res) => {
  try {
    const { reportId } = req.params;
    const { status, adminNote } = req.body;

    const VALID_STATUSES = ["open", "under_review", "resolved", "dismissed"];
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ message: "Invalid status value." });
    }

    const update = { status };
    if (adminNote !== undefined) update.adminNote = adminNote.trim();
    if (status === "resolved" || status === "dismissed") {
      update.resolvedAt = new Date();
      update.resolvedBy = req.user._id;
    }

    const report = await Report.findByIdAndUpdate(reportId, update, {
      new:              true,
      runValidators:    true,
    })
      .populate("reportedBy",   "name email")
      .populate("reportedUser", "name email");

    if (!report) {
      return res.status(404).json({ message: "Report not found." });
    }

    return res.status(200).json({ success: true, report });
  } catch (err) {
    console.error("❌ updateReportStatus error:", err);
    return res.status(500).json({ message: "Server error." });
  }
};

module.exports = {
  submitReport,
  getMyReport,
  getAllReports,
  updateReportStatus,
};