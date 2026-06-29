// --- Helper functions to eliminate OpenAPI boilerplate duplication ---
const jsonContent = (schema) => ({ "application/json": { schema } });
const schemaRef = (name) => ({ $ref: `#/components/schemas/${name}` });
const responseRef = (name) => ({ $ref: `#/components/responses/${name}` });

const successResponse = (description, schemaName) => ({
  description,
  content: jsonContent(schemaRef(schemaName)),
});

const validationError = responseRef("ValidationError");
const unauthorizedError = responseRef("UnauthorizedError");

// Centralized builder for all POST endpoints
const postRoute = ({ tags, summary, requestSchema, responses }) => ({
  post: {
    tags,
    summary,
    ...(requestSchema
      ? {
          requestBody: {
            required: true,
            content: jsonContent(
              typeof requestSchema === "string"
                ? schemaRef(requestSchema)
                : requestSchema,
            ),
          },
        }
      : {}),
    responses,
    security: [],
  },
});

// --- Exported Routes ---
module.exports = {
  "/auth/register": postRoute({
    tags: ["Authentication"],
    summary: "Register a new user account",
    requestSchema: "RegisterRequest",
    responses: {
      201: successResponse("User registered successfully", "AuthResponse"),
      400: validationError,
    },
  }),

  "/auth/login": postRoute({
    tags: ["Authentication"],
    summary: "Login with email and password",
    requestSchema: "LoginRequest",
    responses: {
      200: successResponse("Login successful", "AuthResponse"),
      400: validationError,
      401: unauthorizedError,
    },
  }),

  "/auth/logout": postRoute({
    tags: ["Authentication"],
    summary: "Logout and clear session cookies",
    responses: {
      200: successResponse("Logged out successfully", "SuccessMessage"),
    },
  }),

  "/auth/refresh": postRoute({
    tags: ["Authentication"],
    summary: "Refresh access token using refresh token",
    responses: {
      200: {
        description: "New access token issued",
        content: jsonContent({
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            accessToken: { type: "string" },
          },
        }),
      },
      401: unauthorizedError,
    },
  }),

  "/auth/google": postRoute({
    tags: ["Social Authentication"],
    summary: "Authenticate using a Google OAuth token",
    requestSchema: "GoogleAuthRequest",
    responses: {
      200: successResponse("Google authentication successful", "AuthResponse"),
    },
  }),

  "/auth/linkedin/token": postRoute({
    tags: ["Social Authentication"],
    summary: "Authenticate using a LinkedIn authorization code",
    requestSchema: "LinkedinAuthRequest",
    responses: {
      200: successResponse(
        "LinkedIn authentication successful",
        "AuthResponse",
      ),
    },
  }),

  "/auth/forgot-password": postRoute({
    tags: ["Password Recovery"],
    summary: "Send a password reset OTP to the user's email",
    requestSchema: "ForgotPasswordRequest",
    responses: {
      200: successResponse("Reset OTP sent successfully", "SuccessMessage"),
    },
  }),

  "/auth/verify-reset-otp": postRoute({
    tags: ["Password Recovery"],
    summary: "Verify the OTP sent for password reset",
    requestSchema: "VerifyOtpRequest",
    responses: {
      200: successResponse("OTP verified successfully", "SuccessMessage"),
    },
  }),

  "/auth/reset-password": postRoute({
    tags: ["Password Recovery"],
    summary: "Reset user password using verified OTP",
    requestSchema: "ResetPasswordRequest",
    responses: {
      200: successResponse("Password reset successfully", "SuccessMessage"),
    },
  }),

  "/verification/send": postRoute({
    tags: ["Email Verification"],
    summary: "Send an email verification link to the user",
    requestSchema: {
      type: "object",
      required: ["email"],
      properties: {
        email: { type: "string", format: "email" },
      },
    },
    responses: {
      200: {
        description: "Verification email sent successfully",
      },
    },
  }),
};
