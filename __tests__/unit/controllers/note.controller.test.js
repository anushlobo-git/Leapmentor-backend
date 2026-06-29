const createNoteController = require("../../../controllers/note.controller");

describe("Note Controller Unit Tests", () => {
  let mockService, controller, mockReq, mockRes, mockNext;

  const flushPromises = () => new Promise(setImmediate);

  beforeEach(() => {
    mockService = {
      processNoteUpload: jest.fn(),
      getSharedNotesList: jest.fn(),
      getPrivateNotesList: jest.fn(),
      removeNoteRecord: jest.fn(),
    };
    controller = createNoteController({ noteService: mockService });
    mockReq = { user: { _id: "u1" }, body: {}, params: {}, file: {} };
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
    await flushPromises();

    expect(mockService.processNoteUpload).toHaveBeenCalledWith("session_01", "u1", mockReq.file, mockReq.body);
    expect(mockRes.status).toHaveBeenCalledWith(201);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: true,
      message: "Note uploaded successfully",
      note: { id: "note_99" },
    });
  });

  test("uploadNote should route error to next()", async () => {
    const mockError = new Error("Upload failed");
    mockService.processNoteUpload.mockRejectedValue(mockError);

    await controller.uploadNote(mockReq, mockRes, mockNext);
    await flushPromises();
    expect(mockNext).toHaveBeenCalledWith(mockError);
  });

  test("getNotes should return 200 with shared notes list", async () => {
    mockReq.params.connectRequestId = "session_01";
    mockService.getSharedNotesList.mockResolvedValue([{ id: "note_99" }]);

    await controller.getNotes(mockReq, mockRes, mockNext);
    await flushPromises();

    expect(mockService.getSharedNotesList).toHaveBeenCalledWith("session_01", "u1");
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: true,
      notes: [{ id: "note_99" }],
    });
  });

  test("getNotes should route error to next()", async () => {
    const mockError = new Error("Fetch failed");
    mockService.getSharedNotesList.mockRejectedValue(mockError);

    await controller.getNotes(mockReq, mockRes, mockNext);
    await flushPromises();
    expect(mockNext).toHaveBeenCalledWith(mockError);
  });

  test("getPrivateNotes should return 200 with private notes list", async () => {
    mockReq.params.connectRequestId = "session_01";
    mockService.getPrivateNotesList.mockResolvedValue([{ id: "note_priv" }]);

    await controller.getPrivateNotes(mockReq, mockRes, mockNext);
    await flushPromises();

    expect(mockService.getPrivateNotesList).toHaveBeenCalledWith("session_01", "u1");
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: true,
      notes: [{ id: "note_priv" }],
    });
  });

  test("getPrivateNotes should route error to next()", async () => {
    const mockError = new Error("Fetch failed");
    mockService.getPrivateNotesList.mockRejectedValue(mockError);

    await controller.getPrivateNotes(mockReq, mockRes, mockNext);
    await flushPromises();
    expect(mockNext).toHaveBeenCalledWith(mockError);
  });

  test("deleteNote should return 200 on successful deletion", async () => {
    mockReq.params.id = "note_99";
    mockService.removeNoteRecord.mockResolvedValue();

    await controller.deleteNote(mockReq, mockRes, mockNext);
    await flushPromises();

    expect(mockService.removeNoteRecord).toHaveBeenCalledWith("note_99", "u1");
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: true,
      message: "Note deleted successfully",
    });
  });

  test("deleteNote should route error to next()", async () => {
    const mockError = new Error("Delete failed");
    mockService.removeNoteRecord.mockRejectedValue(mockError);

    await controller.deleteNote(mockReq, mockRes, mockNext);
    await flushPromises();
    expect(mockNext).toHaveBeenCalledWith(mockError);
  });
});
