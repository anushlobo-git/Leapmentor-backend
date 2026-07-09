const jwt = require("jsonwebtoken");
const AdminUser = require("../models/AdminUser");
const AppError = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");
const { toAdminDTO } = require("../mappers/admin.mapper");
const env = require("../config/env");

const adminAuthenticate = catchAsync(async (req, res, next) => {
  const token = req.cookies?.adminToken;
  if (!token) return next(new AppError("No token provided.", 401));

  let decoded;
  try {
    decoded = jwt.verify(token, env.jwtAccessSecret);
  } catch {
    return next(new AppError("Invalid or expired token.", 401));
  }

  if (decoded.role !== "admin" || decoded.type !== "access")
    return next(
      new AppError("Access denied: not a valid admin access token.", 403),
    );

  const admin = await AdminUser.findById(decoded.id);
  if (!admin) return next(new AppError("Admin not found.", 401));
  if (!admin.isActive)
    return next(new AppError("Admin account is deactivated.", 403));
  if (decoded.tokenVersion !== admin.tokenVersion)
    return next(
      new AppError("Session has been revoked. Please log in again.", 401),
    );

  req.admin = toAdminDTO(admin);
  next();
});

module.exports = { adminAuthenticate };
