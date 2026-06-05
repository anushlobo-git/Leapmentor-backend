// services/auth.service.js
const bcrypt = require("bcryptjs");
const userRepository = require("../repositories/user.repository");
const {
  signToken,
  sanitizeUser,
  validateRoles,
  signAccessToken,
  signRefreshToken,
} = require("../utils/auth.utils");
const {
  createWalletsForRoles,
  createWalletForRole,
} = require("./wallet.service");


// ── REGISTER ──────────────────────────────────────────────────
const registerUser = async ({
  name,
  email,
  password,
  roles,
  termsAccepted,
}) => {
  if (!name || !email || !password)
    throw new Error("name, email, password are required");
  if (!Array.isArray(roles) || roles.length === 0)
    throw new Error("roles must be an array with at least one role");
  if (termsAccepted !== true)
    throw new Error("You must accept terms to continue");

  const normalizedEmail = String(email).toLowerCase().trim();
  const { valid, message, uniqueRoles } = validateRoles(roles);
  if (!valid) throw new Error(message);

  const existing = await userRepository.findUserByEmail(normalizedEmail);
  
  if (existing) throw new Error("ALREADY_REGISTERED");
  
  //in future if we want to allow one email with multiple roles these codes can be used to merge the roles
    /*const newRoles = [...new Set([...existing.roles, ...uniqueRoles])];
    const rolesChanged = newRoles.length !== existing.roles.length;

    if (rolesChanged) {
      const addedRoles = uniqueRoles.filter((r) => !existing.roles.includes(r));
      existing.roles = newRoles;
      await userRepository.saveUser(existing);
      for (const role of addedRoles) {
        await createWalletForRole(existing._id, role);
      }
    } */
   

  const hashed = await bcrypt.hash(password, 10);
  const user = await userRepository.createUser({
    name: String(name).trim(),
    email: normalizedEmail,
    password: hashed,
    roles: uniqueRoles,
    isEmailVerified: false,
    termsAccepted: true,
    termsAcceptedAt: new Date(),
  });

  await createWalletsForRoles(user._id, uniqueRoles);
  const token = signToken(user._id); //not using it for the access and refresh token flow,
  const accessToken = signAccessToken(user._id);
  const refreshToken = signRefreshToken(user._id);
  return {
    accessToken,
    refreshToken,
    user: sanitizeUser(user),
    isNewUser: true,
  };
};

// ── LOGIN ─────────────────────────────────────────────────────
const loginUser = async ({ email, password }) => {
  if (!email || !password) throw new Error("email and password are required");

  const normalizedEmail = String(email).toLowerCase().trim();

  const user =
    await userRepository.findUserByEmailWithPassword(normalizedEmail);
  if (!user || !user.password) throw new Error("INVALID_CREDENTIALS");

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) throw new Error("INVALID_CREDENTIALS");

  if (!user.isEmailVerified) throw new Error("EMAIL_NOT_VERIFIED");

  const token = signToken(user._id);  //not using and can delete just look into it 
  const accessToken = signAccessToken(user._id);
  const refreshToken = signRefreshToken(user._id);
  return {
    accessToken,
    refreshToken,
    user: sanitizeUser(user),
    isNewUser: true,
  };

};

// ── CHANGE PASSWORD ───────────────────────────────────────────
const changeUserPassword = async (userId, { currentPassword, newPassword }) => {
  if (!currentPassword || !newPassword)
    throw new Error("All fields are required.");
  if (newPassword.length < 6)
    throw new Error("New password must be at least 6 characters.");

  const user = await userRepository.findUserByIdWithPassword(userId);
  if (!user) throw new Error("USER_NOT_FOUND");

  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) throw new Error("WRONG_PASSWORD");

  user.password = await bcrypt.hash(newPassword, 12);
  user.passwordChangedAt = new Date();
  await userRepository.saveUser(user);
};

module.exports = { registerUser, loginUser, changeUserPassword };
