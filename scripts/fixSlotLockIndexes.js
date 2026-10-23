// scripts/fixSlotLockIndexes.js
//
// One-time index repair for the backend concurrent slot-booking guard.
//
// The SlotLock schema used to carry a UNIQUE index on
// `{ mentorId, date, startTime, endTime, lockedBy }`. Because it INCLUDED
// `lockedBy`, two different users could hold a lock on the exact same slot —
// the index treated (slot, userA) and (slot, userB) as distinct keys, so it
// never prevented a double-book. The schema now declares a UNIQUE index on the
// slot tuple WITHOUT `lockedBy` (see models/SlotLock.js) so the database itself
// atomically rejects the second user's lock with an E11000 error.
//
// Mongoose's autoIndex CREATES the new index on startup but never DROPS the old
// one. That is harmless for correctness (the new unique index still enforces
// the guard even while the stale one lingers), so running this script is
// OPTIONAL cleanup. Its real value is guaranteeing the new index actually
// builds: if the collection currently holds two ACTIVE locks on the same slot
// (which the old schema permitted), the automatic build would fail with E11000
// and silently leave the guard inactive. This script removes those duplicates
// first, drops the stale index, then re-syncs to exactly what the schema
// declares — scoped to the slotlocks collection only.
//
// Run once:  node scripts/fixSlotLockIndexes.js
const mongoose = require("mongoose");
require("dotenv").config();
const env = require("../config/env");
const SlotLock = require("../models/SlotLock");

// The stale index is the UNIQUE one whose key includes `lockedBy`.
const isStaleLockedByUnique = (idx) =>
  idx.unique === true &&
  Object.prototype.hasOwnProperty.call(idx.key || {}, "lockedBy");

// Remove extra active locks that share an exact slot tuple, keeping the oldest,
// so the new unique index can build without an E11000 collision.
const dedupeConflictingLocks = async (collection) => {
  const groups = await collection
    .aggregate([
      {
        $group: {
          _id: {
            mentorId: "$mentorId",
            date: "$date",
            startTime: "$startTime",
            endTime: "$endTime",
          },
          ids: { $push: "$_id" },
          count: { $sum: 1 },
        },
      },
      { $match: { count: { $gt: 1 } } },
    ])
    .toArray();

  if (groups.length === 0) {
    console.log("✅ No duplicate slot locks found — nothing to dedupe.");
    return;
  }

  let removed = 0;
  for (const group of groups) {
    // Keep the first id, drop the rest.
    const [, ...extras] = group.ids;
    if (extras.length) {
      const res = await collection.deleteMany({ _id: { $in: extras } });
      removed += res.deletedCount || 0;
    }
  }
  console.log(
    `🧹 Removed ${removed} duplicate lock(s) across ${groups.length} conflicting slot(s).`,
  );
};

const run = async () => {
  try {
    await mongoose.connect(env.mongoUri);
    console.log("✅ Connected to MongoDB\n");

    const collection = SlotLock.collection;

    const before = await collection.indexes();
    console.log("Current slotlocks indexes:");
    for (const idx of before) {
      console.log(
        `  • ${idx.name}  key=${JSON.stringify(idx.key)}${idx.unique ? "  (unique)" : ""}`,
      );
    }
    console.log("");

    // 1. Clear duplicate active locks so the new unique index can build.
    await dedupeConflictingLocks(collection);

    // 2. Drop the stale UNIQUE index that still carries `lockedBy`.
    const stale = before.filter(isStaleLockedByUnique);
    if (stale.length === 0) {
      console.log("✅ No stale `lockedBy` unique index found — nothing to drop.");
    } else {
      for (const idx of stale) {
        await collection.dropIndex(idx.name);
        console.log(`🗑️  Dropped stale unique index: ${idx.name}`);
      }
    }

    // 3. Re-create exactly what the schema declares (TTL, 4-field unique slot
    // tuple, and the {mentorId, date} lookup index). Scoped to this model only.
    await SlotLock.syncIndexes();
    console.log("\n🔄 SlotLock indexes synced to match the schema.");

    const after = await collection.indexes();
    console.log("\nslotlocks indexes now:");
    for (const idx of after) {
      console.log(
        `  • ${idx.name}  key=${JSON.stringify(idx.key)}${idx.unique ? "  (unique)" : ""}`,
      );
    }
    console.log(
      "\n✅ Done. Two users can no longer hold a lock on the same slot.",
    );
  } catch (err) {
    console.error("❌ SlotLock index repair failed:", err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
  }
};

run();
