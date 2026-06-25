/**
 * @fileoverview Invoice Router Unit Tests
 * @description Assures valid path strings configuration registration alongside celebrate guards.
 */

const createInvoiceRoutes = require("../../../routes/invoice.routes");

const mockRouter = { use: jest.fn(), get: jest.fn() };
jest.mock("express", () => ({ Router: () => mockRouter }));

describe("Invoice Router Unit Tests", () => {
  test("should assert endpoint maps target verification rules safely", () => {
    const mockController = { downloadInvoice: "c_dl" };
    const mockValidations = { getInvoicePdfValidation: "v_pdf" };

    createInvoiceRoutes(mockController, "auth_guard", mockValidations);

    expect(mockRouter.use).toHaveBeenCalledWith("auth_guard");
    expect(mockRouter.get).toHaveBeenCalledWith(
      "/:connectRequestId",
      "v_pdf",
      "c_dl",
    );
  });
});
