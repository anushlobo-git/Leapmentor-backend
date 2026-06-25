/**
 * @fileoverview Verification Token Repository
 * @description Inverted database access layer wrapping operations against the VerificationToken schema model.
 */

const createVerificationTokenRepository = (VerificationToken) => {
  const deleteAllForUser = (userId) =>
    VerificationToken.deleteMany({ user: userId });

  const create = ({ userId, otpHash, expiresAt }) =>
    VerificationToken.create({ user: userId, otp: otpHash, expiresAt });

  const findByUser = (userId) => VerificationToken.findOne({ user: userId });

  const extendExpiry = (recordId, newExpiresAt) =>
    VerificationToken.findByIdAndUpdate(recordId, { expiresAt: newExpiresAt });

  const deleteTokensByUserId = (userId) =>
    VerificationToken.deleteMany({ user: userId });

  const createToken = (tokenData) => VerificationToken.create(tokenData);

  const findTokenByUserId = (userId) =>
    VerificationToken.findOne({ user: userId });

  const saveToken = (tokenInstance) => tokenInstance.save();

  return {
    deleteAllForUser,
    create,
    findByUser,
    extendExpiry,
    deleteTokensByUserId,
    createToken,
    findTokenByUserId,
    saveToken,
  };
};

module.exports = createVerificationTokenRepository;
