/**
 * @fileoverview OAuth Account Repository Corporate Unit Tests
 * @description Assures precise verification of provider lookup strategies, subdocument populations,
 * and external account creation mappings with zero network connectivity.
 */

const createOAuthAccountRepository = require("../../../repositories/oAuthAccount.repository");

describe("OAuthAccount Repository", () => {
  let mockOAuthAccountModel;
  let oAuthAccountRepository;

  const mockOAuthRecord = {
    _id: "oauth123",
    user: "user777",
    provider: "google",
    providerId: "google_123456789",
    profileUrl: "https://lh3.googleusercontent.com/a/abc",
  };

  // Safe Factory: Decorates a genuine Promise instance to completely avoid "manual then" linter errors
  const makeChain = (resolvedValue = null) => {
    const promise = Promise.resolve(resolvedValue);

    // Attach Mongoose chain builders directly to the native Promise, returning itself for fluid chaining
    promise.populate = jest.fn().mockReturnValue(promise);

    return promise;
  };

  beforeEach(() => {
    mockOAuthAccountModel = {
      create: jest.fn(),
      findOne: jest.fn(),
    };
    oAuthAccountRepository = createOAuthAccountRepository(
      mockOAuthAccountModel,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── createOAuthAccount ──────────────────────────────────────────────────
  describe("createOAuthAccount", () => {
    test("should immediately persist a brand-new external social identity connection payload", async () => {
      mockOAuthAccountModel.create.mockResolvedValue(mockOAuthRecord);
      const inputData = {
        provider: "google",
        providerId: "google_123456789",
        user: "user777",
      };

      const result = await oAuthAccountRepository.createOAuthAccount(inputData);

      expect(mockOAuthAccountModel.create).toHaveBeenCalledWith(inputData);
      expect(result).toEqual(mockOAuthRecord);
    });
  });

  // ── findOAuthAccountWithUser ────────────────────────────────────────────
  describe("findOAuthAccountWithUser", () => {
    test("should look up identity logs by provider criteria keys and eager-load the master user reference", async () => {
      const mockChain = makeChain(mockOAuthRecord);
      mockOAuthAccountModel.findOne.mockReturnValue(mockChain);

      const result = await oAuthAccountRepository.findOAuthAccountWithUser(
        "google",
        "google_123456789",
      );

      expect(mockOAuthAccountModel.findOne).toHaveBeenCalledWith({
        provider: "google",
        providerId: "google_123456789",
      });
      expect(mockChain.populate).toHaveBeenCalledWith("user");
      expect(result).toEqual(mockOAuthRecord);
    });
  });

  // ── findOAuthAccount ────────────────────────────────────────────────────
  describe("findOAuthAccount", () => {
    test("should pinpoint provider lookups natively without chaining relationship populations", async () => {
      mockOAuthAccountModel.findOne.mockResolvedValue(mockOAuthRecord);

      const result = await oAuthAccountRepository.findOAuthAccount(
        "google",
        "google_123456789",
      );

      expect(mockOAuthAccountModel.findOne).toHaveBeenCalledWith({
        provider: "google",
        providerId: "google_123456789",
      });
      expect(result).toEqual(mockOAuthRecord);
    });
  });
});
