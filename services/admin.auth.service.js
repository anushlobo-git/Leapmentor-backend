const jwt = require("jsonwebtoken");
const {
  findAdminByEmail,
  saveAdmin,
} = require("../repositories/admin.repository");

const signAdminToken = (id) =>
  jwt.sign({ id, role: "admin" }, process.env.JWT_SECRET, { expiresIn: "7d" });

const adminLoginService = async ({ email, password }) => {
  if (!email || !password) throw new Error("Email and password are required.");

  const admin = await findAdminByEmail(email);
  if (!admin) throw new Error("INVALID_CREDENTIALS");
  if (!admin.isActive) throw new Error("ACCOUNT_DEACTIVATED");

  const isMatch = await admin.comparePassword(password);
  if (!isMatch) throw new Error("INVALID_CREDENTIALS");

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
