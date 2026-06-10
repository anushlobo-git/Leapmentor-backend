const jwt = require("jsonwebtoken");
const AppError = require("../utils/AppError");
const {
  findAdminByEmail,
  saveAdmin,
} = require("../repositories/admin.repository");

const signAdminToken = (id) =>
  jwt.sign({ id, role: "admin" }, process.env.JWT_SECRET, { expiresIn: "7d" });

const adminLoginService = async ({ email, password }) => {
  if (!email || !password)
    throw new AppError("Email and password are required.", 400);

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
    admin: {
      _id: admin._id,
      name: admin.name,
      email: admin.email,
      isSuperAdmin: admin.isSuperAdmin,
      lastLoginAt: admin.lastLoginAt,
    },
  };
};

module.exports = { adminLoginService };
