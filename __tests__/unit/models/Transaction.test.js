/**
 * @fileoverview Transaction Model Schema Tests
 * @description Guards the ledger `type` enum against drift — every transaction
 * type a service actually writes must be a recognized enum value, or
 * Mongoose rejects the write at runtime (with a live DB) while mocked unit
 * tests stay green. Validation runs in-memory, so no database is required.
 */

const Transaction = require("../../../models/Transaction");

describe("Transaction Model", () => {
  const typeError = (type) => {
    const doc = new Transaction({
      user: "507f1f77bcf86cd799439011",
      type,
      amount: 100,
      balanceAfter: 0,
    });
    return doc.validateSync()?.errors?.type;
  };

  // Every type any service passes to createTransaction / createMany must live
  // in the schema enum. "withdrawal" was the one that used to be missing,
  // which crashed withdrawEarningsService after it had already zeroed the
  // wallet balance.
  const SERVICE_USED_TYPES = [
    "credit",
    "escrow_hold",
    "escrow_release",
    "escrow_refund",
    "commission_deduct",
    "mentor_payout",
    "withdrawal",
  ];

  test.each(SERVICE_USED_TYPES)(
    "accepts the '%s' ledger type used by the services",
    (type) => {
      expect(typeError(type)).toBeUndefined();
    },
  );

  test("rejects an unrecognized ledger type", () => {
    expect(typeError("teleportation")).toBeDefined();
  });
});
