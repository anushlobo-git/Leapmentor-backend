/**
 * @fileoverview Wallet Data Transfer Object (DTO) Mapper
 * @description Decouples internal wallet documents from client response structures.
 */

const toWalletDTO = (wallet) => {
  if (!wallet) return null;

  return {
    _id: wallet._id,
    id: wallet._id?.toString(),
    role: wallet.role || null,
    balance: wallet.balance ?? 0,
    escrow: wallet.escrow ?? 0,
    createdAt: wallet.createdAt,
    updatedAt: wallet.updatedAt,
  };
};

module.exports = { toWalletDTO };
