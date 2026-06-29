/**
 * @fileoverview Support Controller Unit Tests
 */

const createSupportController = require("../../../controllers/support.controller");

describe("Support Controller Unit Tests", () => {
  let mockService, controller, mockReq, mockRes, mockNext;
  const flushPromises = () => new Promise(setImmediate);

  beforeEach(() => {
    mockService = {
      submitTicket: jest.fn(),
      fetchAllTickets: jest.fn(),
      resolveTicket: jest.fn(),
    };
    controller = createSupportController({ supportService: mockService });
    mockReq = { body: {}, params: {} };
    mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
    mockNext = jest.fn();
  });

  test("createMessage should return 201 with ticket data", async () => {
    mockReq.body = { subject: "Issue", message: "I have a problem" };
    const mockTicket = { _id: "t1", status: "open" };
    mockService.submitTicket.mockResolvedValue(mockTicket);

    await controller.createMessage(mockReq, mockRes, mockNext);
    await flushPromises();

    expect(mockService.submitTicket).toHaveBeenCalledWith(mockReq.body);
    expect(mockRes.status).toHaveBeenCalledWith(201);
    expect(mockRes.json).toHaveBeenCalledWith(mockTicket);
  });

  test("createMessage should route error to next()", async () => {
    mockService.submitTicket.mockRejectedValue(new Error("Submit failed"));
    await controller.createMessage(mockReq, mockRes, mockNext);
    await flushPromises();
    expect(mockNext).toHaveBeenCalled();
  });

  test("getMessages should return 200 with all tickets", async () => {
    const mockTickets = [{ _id: "t1" }, { _id: "t2" }];
    mockService.fetchAllTickets.mockResolvedValue(mockTickets);

    await controller.getMessages(mockReq, mockRes, mockNext);
    await flushPromises();

    expect(mockService.fetchAllTickets).toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(mockTickets);
  });

  test("getMessages should route error to next()", async () => {
    mockService.fetchAllTickets.mockRejectedValue(new Error("Fetch failed"));
    await controller.getMessages(mockReq, mockRes, mockNext);
    await flushPromises();
    expect(mockNext).toHaveBeenCalled();
  });

  test("resolveMessage should return 200 with resolved ticket", async () => {
    mockReq.params.id = "t1";
    const mockResolved = { _id: "t1", status: "resolved" };
    mockService.resolveTicket.mockResolvedValue(mockResolved);

    await controller.resolveMessage(mockReq, mockRes, mockNext);
    await flushPromises();

    expect(mockService.resolveTicket).toHaveBeenCalledWith("t1");
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(mockResolved);
  });

  test("resolveMessage should route error to next()", async () => {
    mockService.resolveTicket.mockRejectedValue(new Error("Resolve failed"));
    await controller.resolveMessage(mockReq, mockRes, mockNext);
    await flushPromises();
    expect(mockNext).toHaveBeenCalled();
  });
});
