/**
 * @fileoverview Escrow Ledger Routes
 * @description Handles secure mentee token locks, complete settlement releases,
 * transactional refund operations, and wallet metric queries via parameter injection.
 */

const express = require("express");

const createEscrowRoutes = (escrowController, authenticate, validations) => {
  const router = express.Router();

  const {
    payValidation,
    payAdditionalValidation,
    escrowRequestIdParamsValidation,
  } = validations;

  // All escrow endpoints require a verified identity signature
  router.use(authenticate);

  // @route   POST /api/v1/escrow/pay
  router.post("/pay", payValidation, escrowController.pay);

  // @route   POST /api/v1/escrow/pay-additional
  router.post(
    "/pay-additional",
    payAdditionalValidation,
    escrowController.payAdditional,
  );

  // @route   POST /api/v1/escrow/release/:requestId
  router.post(
    "/release/:requestId",
    escrowRequestIdParamsValidation,
    escrowController.release,
  );

  // @route   POST /api/v1/escrow/refund/:requestId
  router.post(
    "/refund/:requestId",
    escrowRequestIdParamsValidation,
    escrowController.refund,
  );

  // @route   GET /api/v1/escrow/status/:requestId
  router.get(
    "/status/:requestId",
    escrowRequestIdParamsValidation,
    escrowController.getStatus,
  );

  // @route   GET /api/v1/escrow/wallet
  router.get("/wallet", escrowController.getMyWallet);

  // @route   GET /api/v1/escrow/commission-rate
  router.get("/commission-rate", escrowController.getCommissionRate);

  return router;
};

module.exports = createEscrowRoutes;
