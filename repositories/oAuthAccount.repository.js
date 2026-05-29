const OAuthAccount = require("../models/OAuthAccount");

const findOAuthAccount = (provider, providerId) =>
  OAuthAccount.findOne({ provider, providerId });

const createOAuthAccount = (data) => OAuthAccount.create(data);

module.exports = { 
    findOAuthAccount, 
    createOAuthAccount 
};
