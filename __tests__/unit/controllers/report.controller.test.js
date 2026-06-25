const createReportController = require("../../../controllers/report.controller");

describe("Report Controller Unit Tests", () => {
  let mockService, controller, mockReq, mockRes, mockNext;

  beforeEach(() => {
    mockService = {
      createIncidentReport: jest.fn(),
      getMySessionReport: jest.fn(),
      getAdminReportsDashboard: jest.fn(),
      processAdminReportUpdate: jest.fn(),
    };
    controller = createReportController(mockService);
    mockReq = { user: { _id: "u1" }, body: {}, params: {}, query: {} };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  test("submitReport should deploy payloads returning 201 created status headers", async () => {
    mockService.createIncidentReport.mockResolvedValue({ _id: "r_id" });
    await controller.submitReport(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(201);
  });
});
