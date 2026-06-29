const jwt = require("jsonwebtoken");
const AdminUser = require("../models/AdminUser");
const AppError = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");
const { toAdminDTO } = require("../mappers/admin.mapper");
const env = require("../config/env");

const adminAuthenticate = catchAsync(async (req, res, next) => {
  const token = req.cookies?.adminToken;
  if (!token) return next(new AppError("No token provided.", 401));

  const decoded = jwt.verify(token, env.jwtSecret);
  if (decoded.role !== "admin")
    return next(new AppError("Access denied: not an admin token.", 403));

  const admin = await AdminUser.findById(decoded.id);
  if (!admin) return next(new AppError("Admin not found.", 401));
  if (!admin.isActive)
    return next(new AppError("Admin account is deactivated.", 403));

  req.admin = toAdminDTO(admin);
  next();
});

module.exports = { adminAuthenticate };
