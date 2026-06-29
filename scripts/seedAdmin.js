require("dotenv").config();
const mongoose = require("mongoose");
const AdminUser = require("../models/AdminUser");
const env = require("../config/env");

// Validate required environment variables
if (!env.admin.email || !env.admin.password) {
  console.error(
    "❌ Error: ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env file",
  );
  process.exit(1);
}

const ADMIN = {
  name: env.admin.name,
  email: env.admin.email,
  password: env.admin.password,
  isSuperAdmin: true,
};

(async () => {
  try {
    await mongoose.connect(env.mongoUri);
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
