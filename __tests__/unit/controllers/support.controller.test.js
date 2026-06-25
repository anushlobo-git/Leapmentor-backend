const createSupportController = require("../../../controllers/support.controller");

describe("Support Controller Unit Tests", () => {
  let mockService, controller, mockReq, mockRes, mockNext;

  beforeEach(() => {
    mockService = {
      submitTicket: jest.fn(),
      fetchAllTickets: jest.fn(),
      resolveTicket: jest.fn(),
    };
    controller = createSupportController(mockService);
    mockReq = { body: {}, params: {} };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  test("createMessage should respond with a 201 Created header on valid payload maps", async () => {
    mockReq.body = {
      email: "user@test.com",
      subject: "Syllabus issue",
      message: "Broken tracking links.",
    };
    mockService.submitTicket.mockResolvedValue({ id: "t1" });

    await controller.createMessage(mockReq, mockRes, mockNext);
    expect(mockRes.status).toHaveBeenCalledWith(201);
  });
});
