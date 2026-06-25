const OAuthAccount = require("../models/OAuthAccount");

const createOAuthAccount = (data) => OAuthAccount.create(data);

const findOAuthAccountWithUser = (provider, providerId) =>
  OAuthAccount.findOne({ provider, providerId }).populate("user");

const findOAuthAccount = (provider, providerId) =>
  OAuthAccount.findOne({ provider, providerId });

module.exports = { findOAuthAccount, createOAuthAccount, findOAuthAccountWithUser };
