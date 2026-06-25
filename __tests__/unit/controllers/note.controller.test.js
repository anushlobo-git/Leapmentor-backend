const createNoteController = require("../../../controllers/note.controller");

describe("Note Controller Unit Tests", () => {
  let mockService, controller, mockReq, mockRes, mockNext;

  beforeEach(() => {
    mockService = {
      processNoteUpload: jest.fn(),
      getSharedNotesList: jest.fn(),
      getPrivateNotesList: jest.fn(),
      removeNoteRecord: jest.fn(),
    };
    controller = createNoteController(mockService);
    mockReq = { user: { _id: "u1" }, body: {}, params: {} };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  test("uploadNote should route parsed form streams delivering 201 parameters status maps", async () => {
    mockReq.body = { connectRequestId: "session_01" };
    mockReq.file = { originalname: "syllabus.pdf" };
    mockService.processNoteUpload.mockResolvedValue({ id: "note_99" });

    await controller.uploadNote(mockReq, mockRes, mockNext);
    expect(mockRes.status).toHaveBeenCalledWith(201);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: true,
      message: "Note uploaded successfully",
      note: { id: "note_99" },
    });
  });
});
