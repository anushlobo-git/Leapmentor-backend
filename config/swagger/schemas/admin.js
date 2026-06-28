module.exports = {
  AdminUser: {
    type: "object",
    properties: {
      _id: { $ref: "#/components/schemas/ObjectId" },
      name: { type: "string", example: "Lead Platforms Compliance Director" },
      email: {
        type: "string",
        format: "email",
        example: "compliance@leapmentor.com",
      },
      isSuperAdmin: { type: "boolean", example: true },
      isActive: { type: "boolean", example: true },
      lastLoginAt: { type: "string", format: "date-time", nullable: true },
      commissionRate: { type: "number", example: 20 },
      walletBalance: { type: "number", example: 45200 },
      createdAt: { type: "string", format: "date-time" },
    },
  },

  AdminLoginRequest: {
    type: "object",
    required: ["email", "password"],
    properties: {
      email: {
        type: "string",
        format: "email",
        example: "compliance@leapmentor.com",
      },
      password: { type: "string", example: "CommandSystemPass!2026" },
    },
  },

  AdminLoginResponse: {
    type: "object",
    properties: {
      success: { type: "boolean", example: true },
      admin: { $ref: "#/components/schemas/AdminUser" },
    },
  },

  AdminStats: {
    type: "object",
    properties: {
      totalUsers: { type: "integer", example: 4510 },
      totalMentors: { type: "integer", example: 1120 },
      totalMentees: { type: "integer", example: 3390 },
      totalSessions: { type: "integer", example: 12450 },
      activeConnections: { type: "integer", example: 412 },
    },
  },

  AddAdminRequest: {
    type: "object",
    required: ["name", "email", "password"],
    properties: {
      name: { type: "string", example: "Ops Admin Node Two" },
      email: {
        type: "string",
        format: "email",
        example: "ops2@leapmentor.com",
      },
      password: {
        type: "string",
        minLength: 8,
        example: "NewStructuralSecurityNode2026!",
      },
    },
  },

  UpdateCommissionRequest: {
    type: "object",
    required: ["commissionRate"],
    properties: {
      commissionRate: { type: "number", minimum: 0, maximum: 100, example: 15 },
    },
  },

  LeapRequest: {
    type: "object",
    properties: {
      _id: { $ref: "#/components/schemas/ObjectId" },
      mentee: { $ref: "#/components/schemas/ObjectId" },
      status: {
        type: "string",
        enum: ["pending", "approved", "rejected"],
        example: "pending",
      },
      currentBalance: { type: "number", example: 500 },
      reviewedAt: { type: "string", format: "date-time", nullable: true },
      reviewedBy: { $ref: "#/components/schemas/ObjectId", nullable: true },
      createdAt: { type: "string", format: "date-time" },
    },
  },

  Report: {
    type: "object",
    properties: {
      _id: { $ref: "#/components/schemas/ObjectId" },
      connectRequest: { $ref: "#/components/schemas/ObjectId" },
      reportedBy: { $ref: "#/components/schemas/ObjectId" },
      reportedUser: { $ref: "#/components/schemas/ObjectId" },
      reporterRole: {
        type: "string",
        enum: ["mentor", "mentee"],
        example: "mentee",
      },
      complaintType: {
        type: "string",
        enum: [
          "inappropriate_behavior",
          "session_misconduct",
          "fake_credentials",
          "spam_scam",
          "refund",
          "other",
        ],
        example: "session_misconduct",
      },
      description: {
        type: "string",
        example:
          "Mentor failed to connect to session channels without warning.",
      },
      screenshotUrl: {
        type: "string",
        example: "https://cloudinary.com/evidence.jpg",
      },
      status: {
        type: "string",
        enum: ["open", "under_review", "resolved", "dismissed"],
        example: "open",
      },
      adminNote: {
        type: "string",
        example: "Escalated to communications check log logs.",
      },
      resolvedAt: { type: "string", format: "date-time", nullable: true },
      refundProcessed: { type: "boolean", default: false },
      createdAt: { type: "string", format: "date-time" },
    },
  },
};
