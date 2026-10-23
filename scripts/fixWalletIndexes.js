// scripts/fixWalletIndexes.js
//
// One-time repair for the "adding a second role fails with 'Something went
// wrong'" bug.
//
// The Wallet schema used to be one-wallet-per-user with a UNIQUE index on
// `{ user: 1 }`. It was later changed to one-wallet-per-(user, role) with a
// UNIQUE `{ user: 1, role: 1 }` index (see models/Wallet.js). Mongoose's
// autoIndex CREATES the new index but never DROPS the old one, so any database
// that ever ran the old schema still carries the stale UNIQUE `user_1` index.
//
// That stale index rejects the SECOND wallet for a user (e.g. a mentee who
// adds the mentor role) with an E11000 duplicate-key error, which surfaces to
// the client as a 500 "Something went wrong". This script drops the stale
// index and re-syncs the collection to exactly the indexes the schema declares.
//
// Run once:  node scripts/fixWalletIndexes.js
const mongoose = require("mongoose");
require("dotenv").config();
const env = require("../config/env");
const Wallet = require("../models/Wallet");

const isUserOnlyUnique = (idx) => {
  const keys = Object.keys(idx.key || {});
  return idx.unique === true && keys.length === 1 && keys[0] === "user";
};

const run = async () => {
  try {
    await mongoose.connect(env.mongoUri);
    console.log("✅ Connected to MongoDB\n");

    const collection = Wallet.collection;

    const before = await collection.indexes();
    console.log("Current wallet indexes:");
    for (const idx of before) {
      console.log(
        `  • ${idx.name}  key=${JSON.stringify(idx.key)}${idx.unique ? "  (unique)" : ""}`,
      );
    }
    console.log("");

    // Drop any stale UNIQUE index on `user` alone — that's the one blocking a
    // user's second (per-role) wallet.
    const stale = before.filter(isUserOnlyUnique);
    if (stale.length === 0) {
      console.log("✅ No stale unique `user` index found — nothing to drop.");
    } else {
      for (const idx of stale) {
        await collection.dropIndex(idx.name);
        console.log(`🗑️  Dropped stale unique index: ${idx.name}`);
      }
    }

    // Re-create exactly what the schema declares (compound {user, role} unique,
    // plus the non-unique {user} and {role} indexes). syncIndexes is scoped to
    // this model only, so no other collection is touched.
    await Wallet.syncIndexes();
    console.log("\n🔄 Wallet indexes synced to match the schema.");

    const after = await collection.indexes();
    console.log("\nWallet indexes now:");
    for (const idx of after) {
      console.log(
        `  • ${idx.name}  key=${JSON.stringify(idx.key)}${idx.unique ? "  (unique)" : ""}`,
      );
    }
    console.log("\n✅ Done. Adding a second role should now work.");
  } catch (err) {
    console.error("❌ Wallet index repair failed:", err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
  }
};

run();
