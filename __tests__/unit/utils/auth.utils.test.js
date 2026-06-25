/**
 * @fileoverview Authentication Utilities Component Corporate Unit Tests
 * @description Assures precise verification of JWT token metadata parameters,
 * signature validation loops, and role checking gates with zero dependency access.
 */

const createAuthUtils = require("../../../utils/auth.utils");

describe("Authentication Utilities Unit Tests Matrix", () => {
  let mockJwt;
  let mockCrypto;
  let mockGoogleClient;
  let authUtils;

  const mockConfig = {
    jwtSecret: "core_secret_key",
    jwtExpiresIn: "2h",
    jwtAccessSecret: "access_secret_key",
    jwtRefreshSecret: "refresh_secret_key",
    stateSecret: "state_signature_secret_key",
  };

  beforeEach(() => {
    mockJwt = {
      sign: jest.fn(),
    };

    // Construct a fluent chain mock representation structure mirroring node:crypto mechanics
    const mockHmacPipeline = {
      update: jest.fn().mockReturnThis(),
      digest: jest.fn().mockReturnValue("compiled_mock_hex_hash_signature"),
    };

    mockCrypto = {
      createHmac: jest.fn().mockReturnValue(mockHmacPipeline),
    };

    mockGoogleClient = { credentialsWrapper: true };

    authUtils = createAuthUtils(
      mockConfig,
      mockJwt,
      mockCrypto,
      mockGoogleClient,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Token Generation Configuration Pipeline", () => {
    test("signToken should bind standard user context tokens matching specific fallback expirations", () => {
      mockJwt.sign.mockReturnValue("signed_base_jwt_string");
      const result = authUtils.signToken("user_uuid_101");

      expect(mockJwt.sign).toHaveBeenCalledWith(
        { id: "user_uuid_101" },
        "core_secret_key",
        { expiresIn: "2h" },
      );
      expect(result).toBe("signed_base_jwt_string");
    });

    test("signAccessToken should issue tight short-term 15-minute access keys", () => {
      mockJwt.sign.mockReturnValue("signed_access_jwt_string");
      const result = authUtils.signAccessToken("user_uuid_101");

      expect(mockJwt.sign).toHaveBeenCalledWith(
        { id: "user_uuid_101", type: "access" },
        "access_secret_key",
        { expiresIn: "15m" },
      );
      expect(result).toBe("signed_access_jwt_string");
    });

    test("signRefreshToken should map out stable long-term rotation refresh bounds", () => {
      mockJwt.sign.mockReturnValue("signed_refresh_jwt_string");
      const result = authUtils.signRefreshToken("user_uuid_101");

      expect(mockJwt.sign).toHaveBeenCalledWith(
        { id: "user_uuid_101", type: "refresh" },
        "refresh_secret_key",
        { expiresIn: "7d" },
      );
      expect(result).toBe("signed_refresh_jwt_string");
    });
  });

  describe("User Access Roles Validation Engine", () => {
    test("should cleanly confirm matching unique array parameters across authorized categories", () => {
      const response = authUtils.validateRoles(["mentor", "mentee", "mentor"]);
      expect(response.valid).toBe(true);
      expect(response.uniqueRoles).toEqual(["mentor", "mentee"]);
    });

    test("should capture out-of-bounds registration roles returning clear rejection statuses", () => {
      const response = authUtils.validateRoles([
        "root_super_administrator",
        "mentee",
      ]);
      expect(response.valid).toBe(false);
      expect(response.message).toContain("Invalid role");
    });
  });

  describe("OAuth Security Parameter State Management", () => {
    test("signState should execute payload buffer encodings utilizing HMAC signature algorithms", () => {
      const stateString = authUtils.signState({ securityToken: "xsrf_991" });

      expect(mockCrypto.createHmac).toHaveBeenCalledWith(
        "sha256",
        "state_signature_secret_key",
      );
      expect(stateString).toContain("compiled_mock_hex_hash_signature");
    });

    test("verifyState should translate and return complete payload objects if signatures balance cleanly", () => {
      const targetPayload = { pass: true };
      const base64DataSegment = Buffer.from(
        JSON.stringify(targetPayload),
      ).toString("base64");

      const mockVerificationPipeline = {
        update: jest.fn().mockReturnThis(),
        digest: jest
          .fn()
          .mockReturnValue("stable_matching_verification_signature"),
      };
      mockCrypto.createHmac.mockReturnValue(mockVerificationPipeline);

      const resolvedObject = authUtils.verifyState(
        `${base64DataSegment}.stable_matching_verification_signature`,
      );
      expect(resolvedObject).toEqual(targetPayload);
    });

    test("verifyState should trigger unhandled rejections if data payloads undergo modification during transport", () => {
      const base64DataSegment = Buffer.from(
        JSON.stringify({ modify: true }),
      ).toString("base64");

      const mockVerificationPipeline = {
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue("authentic_original_signature"),
      };
      mockCrypto.createHmac.mockReturnValue(mockVerificationPipeline);

      expect(() => {
        authUtils.verifyState(
          `${base64DataSegment}.tampered_malicious_signature`,
        );
      }).toThrow("Invalid state parameter");
    });
  });
});
