/**
 * @fileoverview OAuth Account Repository Unit Tests
 * @description Validates structural identity mapping queries and fluent
 * population chain bindings with zero live database overhead.
 */

const createOAuthAccountRepository = require("../../../repositories/oAuthAccount.repository");

describe("OAuth Account Repository Unit Tests", () => {
  let mockModel;
  let repository;

  const mockOAuthRecord = {
    _id: "auth_id_999",
    user: "user_id_123",
    provider: "google",
    providerId: "google_identity_string",
  };

  // Helper factory to emulate Mongoose chainable query executions (.populate, .lean, etc.)
  const makeQueryChainMock = (resolvedValue) => ({
    populate: jest.fn().mockReturnThis(),
    then: jest.fn((callback) => Promise.resolve(callback(resolvedValue))),
  });

  beforeEach(() => {
    mockModel = {
      create: jest.fn(),
      findOne: jest.fn(),
    };
    repository = createOAuthAccountRepository(mockModel);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("createOAuthAccount should pass structural payloads directly to the underlying driver model", async () => {
    mockModel.create.mockResolvedValue(mockOAuthRecord);

    const result = await repository.createOAuthAccount({
      provider: "google",
      providerId: "123",
    });

    expect(mockModel.create).toHaveBeenCalledWith({
      provider: "google",
      providerId: "123",
    });
    expect(result).toEqual(mockOAuthRecord);
  });

  test("findOAuthAccount should pinpoint an unpopulated identity mapping using query filters", async () => {
    mockModel.findOne.mockReturnValue(makeQueryChainMock(mockOAuthRecord));

    const result = await repository.findOAuthAccount("linkedin", "lnk_id_777");

    expect(mockModel.findOne).toHaveBeenCalledWith({
      provider: "linkedin",
      providerId: "lnk_id_777",
    });
    expect(result).toEqual(mockOAuthRecord);
  });

  test("findOAuthAccountWithUser should append a user population step onto the query execution cascade", async () => {
    const chainMock = makeQueryChainMock(mockOAuthRecord);
    mockModel.findOne.mockReturnValue(chainMock);

    const result = await repository.findOAuthAccountWithUser(
      "apple",
      "apple_id_888",
    );

    expect(mockModel.findOne).toHaveBeenCalledWith({
      provider: "apple",
      providerId: "apple_id_888",
    });
    expect(chainMock.populate).toHaveBeenCalledWith("user");
    expect(result).toEqual(mockOAuthRecord);
  });
});
