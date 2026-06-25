const createMenteeProfileService = require("../../../services/menteeProfile.service");
const AppError = require("../../../utils/AppError");

jest.mock("../../../mappers/menteeProfile.mapper", () => ({
  toMenteeProfileDTO: jest.fn((val) => val),
}));

describe("Mentee Profile Service Unit Tests", () => {
  let mockRepo, service;

  beforeEach(() => {
    mockRepo = {
      findByUserId: jest.fn(),
      create: jest.fn(),
      findByUserIdWithAccountInfo: jest.fn(),
      findOneAndUpdateByUserId: jest.fn(),
      findPublishedByUserId: jest.fn(),
    };
    service = createMenteeProfileService(mockRepo);
  });

  test("createProfile should throw a 409 exception if profile already exists", async () => {
    mockRepo.findByUserId.mockResolvedValue({ _id: "existing_profile_id" });

    await expect(
      service.createProfile("u1", { currentRole: "Dev" }),
    ).rejects.toThrow(
      new AppError("Profile already exists. Use update instead.", 409),
    );
  });

  test("getMyProfile should throw a 404 if repository lookups evaluate to null", async () => {
    mockRepo.findByUserIdWithAccountInfo.mockResolvedValue(null);

    await expect(service.getMyProfile("u_absent")).rejects.toThrow(
      new AppError("Profile not found", 404),
    );
  });
});
