const createAdminPaymentsRoutes = require("../../../routes/admin-payments.routes");
const {
  getTransactionsQueryValidation,
} = require("../../../validations/admin-payments.validation");

const mockRouter = { get: jest.fn(), use: jest.fn() };
jest.mock("express", () => ({ Router: () => mockRouter }));

describe("Admin Payments Routes Configuration Matrix", () => {
  let mockAdminPaymentsController, mockAdminAuthenticate;

  beforeEach(() => {
    mockAdminPaymentsController = {
      getPaymentStats: jest.fn(),
      getRevenueChart: jest.fn(),
      getTransactions: jest.fn(),
    };
    mockAdminAuthenticate = jest.fn();

    createAdminPaymentsRoutes({
      adminPaymentsController: mockAdminPaymentsController,
      adminAuthenticate: mockAdminAuthenticate,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("should mount the administrative firewall gateway at the base entry threshold", () => {
    expect(mockRouter.use).toHaveBeenCalledWith(mockAdminAuthenticate);
  });

  test("should bind stats accounting to the /stats GET endpoint", () => {
    expect(mockRouter.get).toHaveBeenCalledWith(
      "/stats",
      mockAdminPaymentsController.getPaymentStats,
    );
  });

  test("should bind chronological analytical summaries to the /chart path", () => {
    expect(mockRouter.get).toHaveBeenCalledWith(
      "/chart",
      mockAdminPaymentsController.getRevenueChart,
    );
  });

  test("should enforce structured query parameter check rules across the live transaction ledger path", () => {
    expect(mockRouter.get).toHaveBeenCalledWith(
      "/transactions",
      getTransactionsQueryValidation,
      mockAdminPaymentsController.getTransactions,
    );
  });
});
