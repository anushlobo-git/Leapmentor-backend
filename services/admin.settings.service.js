// services/admin.settings.service.js
const AdminUser = require("../models/AdminUser");
const User = require("../models/User");
const ConnectRequest = require("../models/ConnectRequest");

const getOverviewService = async () => {
  const [totalUsers, activeSessions] = await Promise.all([
    User.countDocuments(),
    ConnectRequest.countDocuments({ status: "ongoing" }),
  ]);
  return { totalUsers, activeSessions };
};

const changeAdminPasswordService = async (
  adminId,
  { currentPassword, newPassword },
) => {
  if (!currentPassword || !newPassword)
    throw new Error("All fields are required.");
  if (newPassword.length < 6)
    throw new Error("New password must be at least 6 characters.");
  if (currentPassword === newPassword)
    throw new Error("New password must be different.");

  const admin = await AdminUser.findById(adminId);
  if (!admin) throw new Error("ADMIN_NOT_FOUND");

  const isMatch = await admin.comparePassword(currentPassword);
  if (!isMatch) throw new Error("WRONG_PASSWORD");

  admin.password = newPassword; // pre-save hook hashes it
  await admin.save();
};

const addAdminService = async ({ name, email }) => {
  if (!name?.trim() || !email?.trim())
    throw new Error("Name and email are required.");

  const normalizedEmail = email.toLowerCase().trim();
  const existing = await AdminUser.findOne({ email: normalizedEmail });
  if (existing) throw new Error("ADMIN_ALREADY_EXISTS");

  const tempPassword = Math.random().toString(36).slice(-8) + "A1!";

  const newAdmin = await AdminUser.create({
    name: name.trim(),
    email: normalizedEmail,
    password: tempPassword,
    isSuperAdmin: false,
    isActive: true,
  });

  return {
    tempPassword,
    admin: {
      _id: newAdmin._id,
      name: newAdmin.name,
      email: newAdmin.email,
    },
  };
};

const getCommissionService = async (adminId) => {
  const admin = await AdminUser.findById(adminId)
    .select("commissionRate")
    .lean();
  return admin?.commissionRate ?? 20;
};

const updateCommissionService = async (adminId, commissionRate) => {
  const rate = parseFloat(commissionRate);
  if (isNaN(rate) || rate < 0 || rate > 100)
    throw new Error("Commission rate must be between 0 and 100.");

  await AdminUser.findByIdAndUpdate(adminId, { commissionRate: rate });
  return rate;
};

module.exports = {
  getOverviewService,
  changeAdminPasswordService,
  addAdminService,
  getCommissionService,
  updateCommissionService,
};
