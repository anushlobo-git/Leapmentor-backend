const Wallet = require("../models/Wallet");

const findAllWallets = () => Wallet.find().select("escrow").lean();

const findWalletByUserId = (userId) => Wallet.findOne({ user: userId });

const saveWallet = (wallet) => wallet.save();

module.exports = { 
    findAllWallets,
    findWalletByUserId,
    saveWallet,
};
