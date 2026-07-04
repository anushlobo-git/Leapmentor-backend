/**
 * One-time migration: set isProfilePublished=true on every mentor profile
 * where the field is false, null, or missing.
 *
 * Run: node scripts/backfillMentorProfilePublished.js
 */

const mongoose = require("mongoose");
const MentorProfile = require("../models/MentorProfile");
require("dotenv").config();
const env = require("../config/env");

const migrate = async () => {
  try {
    await mongoose.connect(env.mongoUri);
    console.log("✅ Connected to MongoDB");

    const filter = {
      $or: [
        { isProfilePublished: false },
        { isProfilePublished: null },
        { isProfilePublished: { $exists: false } },
      ],
    };

    const toUpdate = await MentorProfile.countDocuments(filter);
    console.log(`📋 Found ${toUpdate} mentor profile(s) to backfill`);

    if (toUpdate === 0) {
      console.log("✅ Nothing to update — all profiles already published");
      return;
    }

    const result = await MentorProfile.updateMany(filter, {
      $set: { isProfilePublished: true },
    });

    console.log(
      `✅ Backfill complete — ${result.modifiedCount} mentor profile(s) set to isProfilePublished: true`,
    );
  } catch (err) {
    console.error("❌ Backfill failed:", err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
  }
};

migrate();
