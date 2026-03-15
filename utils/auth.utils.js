const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const { createClerkClient } = require("@clerk/backend");

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
});

const signToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

const sanitizeUser = (user) => {
  const obj = user.toObject ? user.toObject() : user;
  delete obj.password;
  return obj;
};

const validateRoles = (roles) => {
  const validRoles = ["mentor", "mentee"];
  const uniqueRoles = [...new Set(roles)];
  for (const r of uniqueRoles) {
    if (!validRoles.includes(r)) {
      return { valid: false, message: "Invalid role. Use mentor and/or mentee." };
    }
  }
  return { valid: true, uniqueRoles };
};

module.exports = {
  googleClient,
  clerkClient,
  signToken,
  sanitizeUser,
  validateRoles,
};