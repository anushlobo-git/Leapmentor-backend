module.exports = {
  User: {
    type: "object",
    properties: {
      _id: { $ref: "#/components/schemas/ObjectId" },
      name: { type: "string", example: "Alex Smith" },
      email: {
        type: "string",
        format: "email",
        example: "alex@leapmentor.com",
      },
      roles: {
        type: "array",
        items: { type: "string", enum: ["mentor", "mentee"] },
        example: ["mentee"],
      },
      isEmailVerified: { type: "boolean", example: true },
      termsAccepted: { type: "boolean", example: true },
      termsAcceptedAt: { type: "string", format: "date-time" },
      createdAt: { type: "string", format: "date-time" },
      updatedAt: { type: "string", format: "date-time" },
    },
  },

  RegisterRequest: {
    type: "object",
    required: ["name", "email", "password", "roles", "termsAccepted"],
    properties: {
      name: { type: "string", example: "Alex Smith" },
      email: {
        type: "string",
        format: "email",
        example: "alex@leapmentor.com",
      },
      password: { type: "string", minLength: 8, example: "SecurePassword123!" },
      roles: {
        type: "array",
        items: { type: "string", enum: ["mentor", "mentee"] },
        example: ["mentee"],
      },
      termsAccepted: { type: "boolean", example: true },
    },
  },

  LoginRequest: {
    type: "object",
    required: ["email", "password"],
    properties: {
      email: {
        type: "string",
        format: "email",
        example: "alex@leapmentor.com",
      },
      password: { type: "string", example: "SecurePassword123!" },
    },
  },

  AuthResponse: {
    type: "object",
    properties: {
      success: { type: "boolean", example: true },
      message: { type: "string", example: "Session verified successfully" },
      user: { $ref: "#/components/schemas/User" },
      accessToken: {
        type: "string",
        example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      },
      isNewUser: { type: "boolean", example: false },
    },
  },

  GoogleAuthRequest: {
    type: "object",
    required: ["credential"],
    properties: {
      credential: {
        type: "string",
        description: "Google federated token payload string",
      },
      roles: {
        type: "array",
        items: { type: "string", enum: ["mentor", "mentee"] },
      },
      termsAccepted: { type: "boolean" },
    },
  },

  LinkedinAuthRequest: {
    type: "object",
    required: ["code"],
    properties: {
      code: {
        type: "string",
        description: "LinkedIn standard response code token",
      },
      roles: {
        type: "array",
        items: { type: "string", enum: ["mentor", "mentee"] },
      },
      termsAccepted: { type: "boolean" },
    },
  },

  ForgotPasswordRequest: {
    type: "object",
    required: ["email"],
    properties: {
      email: {
        type: "string",
        format: "email",
        example: "alex@leapmentor.com",
      },
    },
  },

  VerifyOtpRequest: {
    type: "object",
    required: ["email", "otp"],
    properties: {
      email: {
        type: "string",
        format: "email",
        example: "alex@leapmentor.com",
      },
      otp: { type: "string", example: "123456", minLength: 6, maxLength: 6 },
    },
  },

  ResetPasswordRequest: {
    type: "object",
    required: ["email", "otp", "newPassword"],
    properties: {
      email: {
        type: "string",
        format: "email",
        example: "alex@leapmentor.com",
      },
      otp: { type: "string", example: "123456" },
      newPassword: {
        type: "string",
        minLength: 8,
        example: "BrandNewSecurePassword123!",
      },
    },
  },
};
