/**
 * @fileoverview Multi-Part File Streams and Cloud Asset Storage Router Unit Tests
 * @description Verifies validation gates alignment, multer interceptor mapping stacks,
 * and base middleware cascading protections across image and document ingest channels.
 */

const createUploadRoutes = require("../../../routes/upload.routes");

// Isolate the global express router layer to monitor entry registration hooks
const mockRouter = {
  use: jest.fn(),
  post: jest.fn(),
};

jest.mock("express", () => ({
  Router: () => mockRouter,
}));

describe("Cloud Asset Storage Router Configuration Matrix", () => {
  let mockUploadController;
  let mockAuthenticate;
  let mockUploadImage;
  let mockUploadFields;
  let mockValidations;

  beforeEach(() => {
    mockUploadController = {
      uploadProfilePicture: jest.fn(),
      uploadVerificationDocuments: jest.fn(),
    };

    mockAuthenticate = jest.fn();

    mockUploadImage = {
      single: jest.fn(() => "multer_single_profile_picture_interceptor"),
    };

    mockUploadFields = "multer_fields_document_interceptor";

    mockValidations = {
      uploadVerificationDocsValidation: "celebrate_documents_payload_shield",
    };

    // Instantiate using destructured named parameters
    createUploadRoutes({
      uploadController: mockUploadController,
      authenticate: mockAuthenticate,
      uploadImage: mockUploadImage,
      uploadFields: mockUploadFields,
      validations: mockValidations,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Security Firewall Gateways", () => {
    test("should establish the global authentication middleware as a base checkpoint for all paths", () => {
      expect(mockRouter.use).toHaveBeenCalledWith(mockAuthenticate);
    });
  });

  describe("Media Ingestion Endpoint Mappings", () => {
    test("should bind profile picture uploads to a single multer key block and POST handlers", () => {
      expect(mockUploadImage.single).toHaveBeenCalledWith("profilePicture");
      expect(mockRouter.post).toHaveBeenCalledWith(
        "/profile-picture",
        "multer_single_profile_picture_interceptor",
        mockUploadController.uploadProfilePicture,
      );
    });

    test("should bind compliance documents to complex field rules and schema validation shields using POST", () => {
      expect(mockRouter.post).toHaveBeenCalledWith(
        "/verification-documents",
        "multer_fields_document_interceptor",
        "celebrate_documents_payload_shield",
        mockUploadController.uploadVerificationDocuments,
      );
    });
  });
});
