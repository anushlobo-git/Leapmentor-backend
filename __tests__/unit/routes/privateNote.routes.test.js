/**
 * @fileoverview Private Workspace Notes Routes Unit Tests
 * @description Confirms HTTP verb mapping configurations, path parameters,
 * celebrate validation injection points, and global authentication firewalls.
 */

const createPrivateNoteRoutes = require("../../../routes/privateNote.routes");

// Isolate the global express router layer to spy on registration pipelines
const mockRouter = {
  use: jest.fn(),
  post: jest.fn(),
  get: jest.fn(),
  patch: jest.fn(),
  delete: jest.fn(),
};

jest.mock("express", () => ({
  Router: () => mockRouter,
}));

describe("Private Note Router Configuration Matrix", () => {
  let mockPrivateNoteController;
  let mockAuthenticate;
  let mockValidations;

  beforeEach(() => {
    mockPrivateNoteController = {
      createNote: jest.fn(),
      getNotes: jest.fn(),
      updateNote: jest.fn(),
      deleteNote: jest.fn(),
    };

    mockAuthenticate = jest.fn();

    mockValidations = {
      createNoteValidation: "celebrate_create_note_shield",
      connectRequestIdParamValidation: "celebrate_connect_request_id_shield",
      noteIdParamValidation: "celebrate_note_id_shield",
    };

    // Instantiate using the destructured Named Parameter config object
    createPrivateNoteRoutes({
      privateNoteController: mockPrivateNoteController,
      authenticate: mockAuthenticate,
      validations: mockValidations,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Security Firewall Gateways", () => {
    test("should mount declarative token verification at the base entry threshold", () => {
      expect(mockRouter.use).toHaveBeenCalledWith(mockAuthenticate);
    });
  });

  describe("Workspace Note Resource Endpoint Mappings", () => {
    test("should link note creation payload guards to the base path using POST", () => {
      expect(mockRouter.post).toHaveBeenCalledWith(
        "/",
        "celebrate_create_note_shield",
        mockPrivateNoteController.createNote,
      );
    });

    test("should link connection request lookups to specific path params using GET", () => {
      expect(mockRouter.get).toHaveBeenCalledWith(
        "/:connectRequestId",
        "celebrate_connect_request_id_shield",
        mockPrivateNoteController.getNotes,
      );
    });

    test("should link document updates to note verification parameter shields using PATCH", () => {
      expect(mockRouter.patch).toHaveBeenCalledWith(
        "/:id",
        "celebrate_note_id_shield",
        mockPrivateNoteController.updateNote,
      );
    });

    test("should link deletion cycles to note verification parameter shields using DELETE", () => {
      expect(mockRouter.delete).toHaveBeenCalledWith(
        "/:id",
        "celebrate_note_id_shield",
        mockPrivateNoteController.deleteNote,
      );
    });
  });
});
