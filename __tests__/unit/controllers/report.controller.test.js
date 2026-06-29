/**
 * @fileoverview Report Controller Unit Tests
 */

const createReportController = require("../../../controllers/report.controller");

describe("Report Controller Unit Tests", () => {
  let mockService, controller, mockReq, mockRes, mockNext;
  const flushPromises = () => new Promise(setImmediate);

  beforeEach(() => {
    mockService = {
      createIncidentReport: jest.fn(),
      getMySessionReport: jest.fn(),
      getAdminReportsDashboard: jest.fn(),
      processAdminReportUpdate: jest.fn(),
    };
    controller = createReportController({ reportService: mockService });
    mockReq = { user: { _id: "u1" }, body: {}, params: {}, query: {}, file: null };
    mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
    mockNext = jest.fn();
  });

  test("submitReport should deploy payloads returning 201 created status headers", async () => {
    mockService.createIncidentReport.mockResolvedValue({ _id: "r_id" });

    await controller.submitReport(mockReq, mockRes, mockNext);
    await flushPromises();

    expect(mockService.createIncidentReport).toHaveBeenCalledWith(mockReq.user, mockReq.body, mockReq.file);
    expect(mockRes.status).toHaveBeenCalledWith(201);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: true,
      message: "Report submitted successfully. Our team will review it shortly.",
      report: { _id: "r_id" },
    });
  });

  test("submitReport should route error to next()", async () => {
    const error = new Error("Submit failed");
    mockService.createIncidentReport.mockRejectedValue(error);

    await controller.submitReport(mockReq, mockRes, mockNext);
    await flushPromises();
    expect(mockNext).toHaveBeenCalledWith(error);
  });

  test("getMyReport should return 200 with report data", async () => {
    mockReq.params.connectRequestId = "conn_id";
    mockService.getMySessionReport.mockResolvedValue({ report: { _id: "r1" } });

    await controller.getMyReport(mockReq, mockRes, mockNext);
    await flushPromises();

    expect(mockService.getMySessionReport).toHaveBeenCalledWith("conn_id", "u1");
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({ report: { _id: "r1" } });
  });

  test("getMyReport should route error to next()", async () => {
    const error = new Error("Fetch failed");
    mockService.getMySessionReport.mockRejectedValue(error);

    await controller.getMyReport(mockReq, mockRes, mockNext);
    await flushPromises();
    expect(mockNext).toHaveBeenCalledWith(error);
  });

  test("getAllReports should return 200 with all reports", async () => {
    mockReq.query = { status: "pending" };
    mockService.getAdminReportsDashboard.mockResolvedValue({ reports: [] });

    await controller.getAllReports(mockReq, mockRes, mockNext);
    await flushPromises();

    expect(mockService.getAdminReportsDashboard).toHaveBeenCalledWith({ status: "pending" });
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({ reports: [] });
  });

  test("getAllReports should route error to next()", async () => {
    const error = new Error("Fetch failed");
    mockService.getAdminReportsDashboard.mockRejectedValue(error);

    await controller.getAllReports(mockReq, mockRes, mockNext);
    await flushPromises();
    expect(mockNext).toHaveBeenCalledWith(error);
  });

  test("updateReportStatus should return 200 with updated report", async () => {
    mockReq.params.reportId = "r1";
    mockReq.body = { status: "resolved" };
    mockService.processAdminReportUpdate.mockResolvedValue({ _id: "r1", status: "resolved" });

    await controller.updateReportStatus(mockReq, mockRes, mockNext);
    await flushPromises();

    expect(mockService.processAdminReportUpdate).toHaveBeenCalledWith("r1", "u1", { status: "resolved" });
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({ success: true, report: { _id: "r1", status: "resolved" } });
  });

  test("updateReportStatus should route error to next()", async () => {
    const error = new Error("Update failed");
    mockService.processAdminReportUpdate.mockRejectedValue(error);

    await controller.updateReportStatus(mockReq, mockRes, mockNext);
    await flushPromises();
    expect(mockNext).toHaveBeenCalledWith(error);
  });
});
