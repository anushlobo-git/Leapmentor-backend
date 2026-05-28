const Wallet = require("../models/Wallet");

const findAllWallets = () => Wallet.find().select("escrow").lean();

const findWalletByUserId = (userId) => Wallet.findOne({ user: userId });

const saveWallet = (wallet) => wallet.save();

const findWalletByUser = (userId) => Wallet.findOne({ user: userId }).lean();

const findWalletByUserMutable = (userId) => Wallet.findOne({ user: userId });



module.exports = { 
    findAllWallets,
    findWalletByUserId,
    saveWallet,
    findWalletByUser,
    findWalletByUserMutable
};
