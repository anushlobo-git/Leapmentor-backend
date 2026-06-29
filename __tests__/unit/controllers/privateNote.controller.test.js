const createPrivateNoteController = require("../../../controllers/privateNote.controller");

describe("Private Note Controller Unit Tests", () => {
  let mockService, controller, mockReq, mockRes, mockNext;

  const flushPromises = () => new Promise(setImmediate);

  beforeEach(() => {
    mockService = {
      createPrivateNote: jest.fn(),
      getPrivateNotesList: jest.fn(),
      updatePrivateNote: jest.fn(),
      removePrivateNote: jest.fn(),
    };
    controller = createPrivateNoteController({ privateNoteService: mockService });
    mockReq = { user: { _id: "u_1" }, body: {}, params: {} };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  test("createNote should respond with a 201 created code status", async () => {
    mockReq.body = { connectRequestId: "s_1", title: "Rich Text Diary" };
    mockService.createPrivateNote.mockResolvedValue({ id: "note_1" });

    await controller.createNote(mockReq, mockRes, mockNext);
    await flushPromises();

    expect(mockService.createPrivateNote).toHaveBeenCalledWith("u_1", mockReq.body);
    expect(mockRes.status).toHaveBeenCalledWith(201);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: true,
      note: { id: "note_1" },
    });
  });

  test("createNote should route error to next()", async () => {
    const error = new Error("Db failed");
    mockService.createPrivateNote.mockRejectedValue(error);

    await controller.createNote(mockReq, mockRes, mockNext);
    await flushPromises();
    expect(mockNext).toHaveBeenCalledWith(error);
  });

  test("getNotes should return 200 and notes list", async () => {
    mockReq.params.connectRequestId = "s_1";
    mockService.getPrivateNotesList.mockResolvedValue([{ id: "note_1" }]);

    await controller.getNotes(mockReq, mockRes, mockNext);
    await flushPromises();

    expect(mockService.getPrivateNotesList).toHaveBeenCalledWith("s_1", "u_1");
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: true,
      notes: [{ id: "note_1" }],
    });
  });

  test("getNotes should route error to next()", async () => {
    const error = new Error("Db failed");
    mockService.getPrivateNotesList.mockRejectedValue(error);

    await controller.getNotes(mockReq, mockRes, mockNext);
    await flushPromises();
    expect(mockNext).toHaveBeenCalledWith(error);
  });

  test("updateNote should return 200 and updated note", async () => {
    mockReq.params.id = "note_1";
    mockReq.body = { title: "Updated Title" };
    mockService.updatePrivateNote.mockResolvedValue({ id: "note_1", title: "Updated Title" });

    await controller.updateNote(mockReq, mockRes, mockNext);
    await flushPromises();

    expect(mockService.updatePrivateNote).toHaveBeenCalledWith("note_1", "u_1", mockReq.body);
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: true,
      note: { id: "note_1", title: "Updated Title" },
    });
  });

  test("updateNote should route error to next()", async () => {
    const error = new Error("Db failed");
    mockService.updatePrivateNote.mockRejectedValue(error);

    await controller.updateNote(mockReq, mockRes, mockNext);
    await flushPromises();
    expect(mockNext).toHaveBeenCalledWith(error);
  });

  test("deleteNote should return 200 status", async () => {
    mockReq.params.id = "note_1";
    mockService.removePrivateNote.mockResolvedValue();

    await controller.deleteNote(mockReq, mockRes, mockNext);
    await flushPromises();

    expect(mockService.removePrivateNote).toHaveBeenCalledWith("note_1", "u_1");
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: true,
      message: "Note deleted successfully",
    });
  });

  test("deleteNote should route error to next()", async () => {
    const error = new Error("Db failed");
    mockService.removePrivateNote.mockRejectedValue(error);

    await controller.deleteNote(mockReq, mockRes, mockNext);
    await flushPromises();
    expect(mockNext).toHaveBeenCalledWith(error);
  });
});
