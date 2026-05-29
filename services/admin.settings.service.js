const {
  findAdminById,
  findAdminByIdLean,
  findAdminByEmail,
  saveAdmin,
  createAdmin,
  updateAdminById,
} = require("../repositories/admin.repository");
const { countAllUsers } = require("../repositories/user.repository");
const { countByStatus } = require("../repositories/connectRequest.repository");

const getOverviewService = async () => {
  const [totalUsers, activeSessions] = await Promise.all([
    countAllUsers(),
    countByStatus("ongoing"),
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

  const admin = await findAdminById(adminId);
  if (!admin) throw new Error("ADMIN_NOT_FOUND");

  const isMatch = await admin.comparePassword(currentPassword);
  if (!isMatch) throw new Error("WRONG_PASSWORD");

  admin.password = newPassword; // pre-save hook hashes it
  await saveAdmin(admin);
};

const addAdminService = async ({ name, email }) => {
  if (!name?.trim() || !email?.trim())
    throw new Error("Name and email are required.");

  const normalizedEmail = email.toLowerCase().trim();
  const existing = await findAdminByEmail(normalizedEmail);
  if (existing) throw new Error("ADMIN_ALREADY_EXISTS");

  const tempPassword = Math.random().toString(36).slice(-8) + "A1!";

  const newAdmin = await createAdmin({
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
  const admin = await findAdminByIdLean(adminId);
  return admin?.commissionRate ?? 20;
};

const updateCommissionService = async (adminId, commissionRate) => {
  const rate = parseFloat(commissionRate);
  if (isNaN(rate) || rate < 0 || rate > 100)
    throw new Error("Commission rate must be between 0 and 100.");

  await updateAdminById(adminId, { commissionRate: rate });
  return rate;
};

module.exports = {
  getOverviewService,
  changeAdminPasswordService,
  addAdminService,
  getCommissionService,
  updateCommissionService,
};
