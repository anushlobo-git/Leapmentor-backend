const jwt = require("jsonwebtoken");
const AdminUser = require("../models/AdminUser");

const adminAuthenticate = async (req, res, next) => {
  try {
    //  read from cookie, not Authorization header
    const token = req.cookies?.adminToken;
    if (!token) return res.status(401).json({ message: "No token provided" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== "admin") {
      return res
        .status(403)
        .json({ message: "Access denied: not an admin token" });
    }

    const admin = await AdminUser.findById(decoded.id).select("-password");
    if (!admin) return res.status(401).json({ message: "Admin not found" });
    if (!admin.isActive)
      return res.status(403).json({ message: "Admin account is deactivated" });

    req.admin = admin;
    next();
  } catch (err) {
    // token expired or invalid → frontend redirects to login
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

module.exports = { adminAuthenticate };
