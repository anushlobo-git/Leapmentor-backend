/**
 * @fileoverview OAuth Account Repository
 * @description Inverted direct database access layer for the OAuthAccount model.
 * Receives the Mongoose model dynamically via factory injection.
 */

const createOAuthAccountRepository = (OAuthAccount) => {
  /**
   * Persists a new social login linkage record.
   */
  const createOAuthAccount = (data) => OAuthAccount.create(data);

  /**
   * Locates an external login identity record and eager-loads the master profile user document.
   */
  const findOAuthAccountWithUser = (provider, providerId) =>
    OAuthAccount.findOne({ provider, providerId }).populate("user");

  /**
   * Pinpoints an external provider lookup mapping purely by its provider keys.
   */
  const findOAuthAccount = (provider, providerId) =>
    OAuthAccount.findOne({ provider, providerId });

  return {
    findOAuthAccount,
    createOAuthAccount,
    findOAuthAccountWithUser,
  };
};

module.exports = createOAuthAccountRepository;
