const path = require("node:path");
const dotenv = require("dotenv");

const envPath = path.resolve(process.cwd(), ".env");
dotenv.config({ path: envPath });

const getEnv = (key, fallback) => {
  const value = process.env[key];
  if (value === undefined && fallback === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value === undefined ? fallback : value;
};

module.exports = {
  // Server
  port: getEnv("PORT", "5000"),
  nodeEnv: getEnv("NODE_ENV", "development"),

  // Database
  mongoUri: getEnv("MONGO_URI", ""),

  // JWT
  jwtSecret: getEnv("JWT_SECRET", "development-secret"),
  jwtAccessSecret: getEnv("JWT_ACCESS_SECRET", "development-access-secret"),
  jwtRefreshSecret: getEnv("JWT_REFRESH_SECRET", "development-refresh-secret"),
  jwtExpiresIn: getEnv("JWT_EXPIRES_IN", "7d"),

  // URLs
  clientUrl: getEnv("CLIENT_URL", "http://localhost:5173"),
  appBaseUrl: getEnv("APP_BASE_URL", "http://localhost:5173"),

  // Redis
  redisUrl: getEnv("REDIS_URL", "redis://localhost:6379"),

  // Logging
  logtailToken: getEnv("LOGTAIL_TOKEN", ""),
  logLevel: getEnv("LOG_LEVEL", "info"),

  // SMTP (Gmail)
  smtp: {
    host: getEnv("SMTP_HOST", "smtp.gmail.com"),
    port: getEnv("SMTP_PORT", "587"),
    user: getEnv("SMTP_USER", ""),
    pass: getEnv("SMTP_PASS", ""),
    fromEmail: getEnv("FROM_EMAIL", ""),
  },

  // Google OAuth & Calendar
  google: {
    clientId: getEnv("GOOGLE_CLIENT_ID", ""),
    clientSecret: getEnv("GOOGLE_CLIENT_SECRET", ""),
    redirectUri: getEnv("GOOGLE_REDIRECT_URI", ""),
  },

  // Cloudinary
  cloudinary: {
    cloudName: getEnv("CLOUDINARY_CLOUD_NAME", ""),
    apiKey: getEnv("CLOUDINARY_API_KEY", ""),
    apiSecret: getEnv("CLOUDINARY_API_SECRET", ""),
  },

  // Admin seed
  admin: {
    email: getEnv("ADMIN_EMAIL", ""),
    password: getEnv("ADMIN_PASSWORD", ""),
    name: getEnv("ADMIN_NAME", "Super Admin"),
  },

  // Groq AI
  groqApiKey: getEnv("GROQ_API_KEY", ""),

  // Resend
  resend: {
    apiKey: getEnv("RESEND_API_KEY", ""),
    fromEmail: getEnv("FROM_EMAIL_RESEND", ""),
  },

  // Postmark
  postmark: {
    apiKey: getEnv("POSTMARK_API_KEY", ""),
    fromEmail: getEnv("FROM_EMAIL_POSTMARK", ""),
  },

  // Brevo (Sendinblue)
  brevo: {
    smtpHost: getEnv("BREVO_SMTP_HOST", ""),
    smtpPort: getEnv("BREVO_SMTP_PORT", "587"),
    smtpUser: getEnv("BREVO_SMTP_USER", ""),
    smtpPass: getEnv("BREVO_SMTP_PASS", ""),
    fromEmail: getEnv("BREVO_FROM_EMAIL", ""),
  },

  // LinkedIn OAuth
  linkedin: {
    clientId: getEnv("LINKEDIN_CLIENT_ID", ""),
    clientSecret: getEnv("LINKEDIN_CLIENT_SECRET", ""),
    callbackUrl: getEnv("LINKEDIN_CALLBACK_URL", ""),
  },

  // Web Push (VAPID)
  vapid: {
    publicKey: getEnv("VAPID_PUBLIC_KEY", ""),
    privateKey: getEnv("VAPID_PRIVATE_KEY", ""),
    mailto: getEnv("VAPID_MAILTO", ""),
  },
};
