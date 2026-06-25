const createPrivateNoteController = require("../../../controllers/privateNote.controller");

describe("Private Note Controller Unit Tests", () => {
  let mockService, controller, mockReq, mockRes, mockNext;

  beforeEach(() => {
    mockService = {
      createPrivateNote: jest.fn(),
      getPrivateNotesList: jest.fn(),
      updatePrivateNote: jest.fn(),
      removePrivateNote: jest.fn(),
    };
    controller = createPrivateNoteController(mockService);
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
    expect(mockRes.status).toHaveBeenCalledWith(201);
  });
});
