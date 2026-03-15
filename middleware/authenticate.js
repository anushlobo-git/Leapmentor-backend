// src/middleware/authenticate.js
const jwt = require("jsonwebtoken");
const User = require("../models/User");

// ✅ Verifies JWT and attaches fresh user from DB to req.user
const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1]; // Bearer <token>
    if (!token) return res.status(401).json({ message: "No token provided" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ✅ Always fetch fresh from DB — roles are always up to date
    const user = await User.findById(decoded.id).select("-password");
    if (!user) return res.status(401).json({ message: "User not found" });

    req.user = user;

    // ✅ Debug log — remove this once roles issue is confirmed fixed
    console.log(`🔐 authenticate — user: ${user.email} | roles: ${JSON.stringify(user.roles)}`);

    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

// ✅ Role guard — use after authenticate
const requireRole = (...roles) => {
  return (req, res, next) => {
    const userRoles = req.user?.roles || [];

    // ✅ Debug log — shows exactly what role check is happening
    console.log(`🛡️  requireRole — required: [${roles}] | user has: [${userRoles}]`);

    const hasRole = roles.some((role) => userRoles.includes(role));
    if (!hasRole) {
      return res.status(403).json({
        message: "Access denied: insufficient role",
        required: roles,       // ✅ tells frontend exactly what role is needed
        userRoles,             // ✅ tells us what the user actually has
      });
    }
    next();
  };
};

module.exports = { authenticate, requireRole };