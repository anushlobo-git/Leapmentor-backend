module.exports = {
  "/auth/register": {
    post: {
      tags: ["Authentication Protocol Matrix"],
      summary: "Provision a brand-new user profile account mapping",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/RegisterRequest" },
          },
        },
      },
      responses: {
        201: {
          description: "User account provisioned successfully",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/AuthResponse" },
            },
          },
        },
        400: { $ref: "#/components/responses/ValidationError" },
      },
      security: [],
    },
  },
  "/auth/login": {
    post: {
      tags: ["Authentication Protocol Matrix"],
      summary: "Verify credentials to authenticate a platform user session key",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/LoginRequest" },
          },
        },
      },
      responses: {
        200: {
          description: "Authentication tokens issued successfully",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/AuthResponse" },
            },
          },
        },
        400: { $ref: "#/components/responses/ValidationError" },
        401: { $ref: "#/components/responses/UnauthorizedError" },
      },
      security: [],
    },
  },
  "/auth/logout": {
    post: {
      tags: ["Authentication Protocol Matrix"],
      summary:
        "Purge active credentials cookies to destroy current session state",
      responses: {
        200: {
          description:
            "Session disconnected cleanly from architecture context lines",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/SuccessMessage" },
            },
          },
        },
      },
      security: [],
    },
  },
  "/auth/refresh": {
    post: {
      tags: ["Authentication Protocol Matrix"],
      summary:
        "Evaluate long-lived token rotation to issue fresh short-term access keys",
      responses: {
        200: {
          description: "New operational token generated successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  accessToken: { type: "string" },
                },
              },
            },
          },
        },
        401: { $ref: "#/components/responses/UnauthorizedError" },
      },
      security: [],
    },
  },
  "/auth/google": {
    post: {
      tags: ["Federated Identity Integrations Layer"],
      summary:
        "Process federated identity token parameters issued by Google accounts",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/GoogleAuthRequest" },
          },
        },
      },
      responses: {
        200: {
          description: "Google social authentication check successful",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/AuthResponse" },
            },
          },
        },
      },
      security: [],
    },
  },
  "/auth/linkedin/token": {
    post: {
      tags: ["Federated Identity Integrations Layer"],
      summary:
        "Exchange external LinkedIn redirection verification codes for platform sessions",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/LinkedinAuthRequest" },
          },
        },
      },
      responses: {
        200: {
          description: "LinkedIn code exchange transaction complete",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/AuthResponse" },
            },
          },
        },
      },
      security: [],
    },
  },
  "/auth/forgot-password": {
    post: {
      tags: ["Account Recovery Operations Pipeline"],
      summary:
        "Transmit recovery access numbers code down target user mail profile",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ForgotPasswordRequest" },
          },
        },
      },
      responses: {
        200: {
          description: "Recovery token communication executed properly",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/SuccessMessage" },
            },
          },
        },
      },
      security: [],
    },
  },
  "/auth/verify-reset-otp": {
    post: {
      tags: ["Account Recovery Operations Pipeline"],
      summary: "Validate temporary profile code against database memory arrays",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/VerifyOtpRequest" },
          },
        },
      },
      responses: {
        200: {
          description: "Numeric state checks verified successfully",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/SuccessMessage" },
            },
          },
        },
      },
      security: [],
    },
  },
  "/auth/reset-password": {
    post: {
      tags: ["Account Recovery Operations Pipeline"],
      summary:
        "Rewrite entry records credentials structures with matching parameters updates",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ResetPasswordRequest" },
          },
        },
      },
      responses: {
        200: {
          description: "Credentials tracking array updated cleanly",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/SuccessMessage" },
            },
          },
        },
      },
      security: [],
    },
  },
  "/verification/send": {
    post: {
      tags: ["Communications Routing Channels Management"],
      summary:
        "Initiate verification communications payload maps distribution structures",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["email"],
              properties: { email: { type: "string", format: "email" } },
            },
          },
        },
      },
      responses: {
        200: {
          description:
            "Verification email and verification tokens pushed successfully",
        },
      },
      security: [],
    },
  },
};
