/**
 * @fileoverview Invoice Transport Controller Unit Tests
 * @description Assures valid stream buffer extraction, headers allocations, and catchAsync exception cascades.
 */

const createInvoiceController = require("../../../controllers/invoice.controller");

describe("Invoice Controller Unit Tests", () => {
  let mockInvoiceService, controller, mockReq, mockRes, mockNext;

  const flushPromises = () => new Promise(setImmediate);

  beforeEach(() => {
    mockInvoiceService = {
      generateInvoicePdfBuffer: jest.fn(),
    };

    controller = createInvoiceController({ invoiceService: mockInvoiceService });

    mockReq = {
      user: { _id: "user_111" },
      params: { connectRequestId: "507f1f78c24a82117184851a" },
    };
    mockRes = {
      set: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  test("downloadInvoice should attach header attributes and transmit file content streams safely", async () => {
    const fakeBuffer = Buffer.from("pdf-content");
    mockInvoiceService.generateInvoicePdfBuffer.mockResolvedValue({
      pdfBuffer: fakeBuffer,
      invoiceNumber: "84851A",
    });

    await controller.downloadInvoice(mockReq, mockRes, mockNext);
    await flushPromises();

    expect(mockInvoiceService.generateInvoicePdfBuffer).toHaveBeenCalledWith({
      connectRequestId: "507f1f78c24a82117184851a",
      userId: "user_111",
    });
    expect(mockRes.set).toHaveBeenCalledWith(
      expect.objectContaining({
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="Invoice-84851A.pdf"',
      }),
    );
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.send).toHaveBeenCalledWith(fakeBuffer);
  });

  test("downloadInvoice should route exceptions to next()", async () => {
    const mockError = new Error("Generation failed");
    mockInvoiceService.generateInvoicePdfBuffer.mockRejectedValue(mockError);

    await controller.downloadInvoice(mockReq, mockRes, mockNext);
    await flushPromises();

    expect(mockNext).toHaveBeenCalledWith(mockError);
  });
});
