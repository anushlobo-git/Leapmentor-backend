const jwt = require("jsonwebtoken");
const AppError = require("../utils/AppError");
const {
  findAdminByEmail,
  saveAdmin,
} = require("../repositories/admin.repository");
const { toAdminDTO } = require("../mappers/admin.mapper");

const signAdminToken = (id) =>
  jwt.sign({ id, role: "admin" }, process.env.JWT_SECRET, { expiresIn: "7d" });

const adminLoginService = async ({ email, password }) => {

  const admin = await findAdminByEmail(email);
  if (!admin) throw new AppError("Invalid credentials.", 401);
  if (!admin.isActive) throw new AppError("Admin account is deactivated.", 403);

  const isMatch = await admin.comparePassword(password);
  if (!isMatch) throw new AppError("Invalid credentials.", 401);

  admin.lastLoginAt = new Date();
  await saveAdmin(admin);

  const token = signAdminToken(admin._id);
  return {
    token,
    admin: toAdminDTO(admin),
  };
};

module.exports = { adminLoginService };
