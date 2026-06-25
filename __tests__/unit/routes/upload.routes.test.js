const createUploadRoutes = require("../../../routes/upload.routes");

const mockRouter = { use: jest.fn(), post: jest.fn() };
jest.mock("express", () => ({ Router: () => mockRouter }));

describe("Asset Upload Router Unit Tests", () => {
  test("should assert endpoint pathways apply correct celebrate fields validation parameters", () => {
    const mockController = {
      uploadProfilePicture: "c1",
      uploadVerificationDocuments: "c2",
    };
    const mockValidations = { uploadVerificationDocsValidation: "v_fields" };

    createUploadRoutes(
      mockController,
      "auth_guard",
      { single: jest.fn() },
      "fields_intercept",
      mockValidations,
    );
    expect(mockRouter.use).toHaveBeenCalledWith("auth_guard");
    expect(mockRouter.post).toHaveBeenCalledWith(
      "/verification-documents",
      "fields_intercept",
      "v_fields",
      "c2",
    );
  });
});
