// backend/scripts/seedAdmin.js
// ── Run once to create the first admin ───────────────────────
// Usage: node backend/scripts/seedAdmin.js

require("dotenv").config();
const mongoose = require("mongoose");
const AdminUser = require("../models/AdminUser");

// Validate required environment variables
if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
  console.error(
    "❌ Error: ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env file",
  );
  process.exit(1);
}

const ADMIN = {
  name: process.env.ADMIN_NAME || "Super Admin",
  email: process.env.ADMIN_EMAIL,
  password: process.env.ADMIN_PASSWORD,
  isSuperAdmin: true,
};

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected");

    const exists = await AdminUser.findOne({ email: ADMIN.email });
    if (exists) {
      console.log("⚠️  Admin already exists:", ADMIN.email);
      process.exit(0);
    }

    await AdminUser.create(ADMIN);
    console.log("✅ Admin created:", ADMIN.email);
    process.exit(0);
  } catch (err) {
    console.error("❌ Seed error:", err.message);
    process.exit(1);
  }
})();
