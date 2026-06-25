/**
 * @fileoverview Report Repository Unit Tests
 * @description Validates model method mapping arrays, population chains,
 * and model saving execution traps with zero live database overhead.
 */

const createReportRepository = require("../../../repositories/report.repository");

describe("Report Repository Unit Tests", () => {
  let mockModel;
  let repository;

  const mockReportDoc = {
    _id: "rep111",
    status: "open",
    complaintType: "refund",
    reporterRole: "mentee",
  };

  const makeQueryChain = (value = null) => ({
    populate: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(value),
    then: jest.fn((callback) => Promise.resolve(callback(value))),
  });

  beforeEach(() => {
    mockModel = {
      countDocuments: jest.fn(),
      find: jest.fn(),
      findById: jest.fn(),
    };
    repository = createReportRepository(mockModel);
  });

  test("countAllReports should execute base document counts natively", async () => {
    mockModel.countDocuments.mockResolvedValue(45);
    const result = await repository.countAllReports();
    expect(mockModel.countDocuments).toHaveBeenCalled();
    expect(result).toBe(45);
  });

  test("findReports should assemble a comprehensive populate and sort query pipeline", async () => {
    const chain = makeQueryChain([mockReportDoc]);
    mockModel.find.mockReturnValue(chain);

    const result = await repository.findReports(
      { status: "open" },
      { skip: 10, limit: 5 },
    );

    expect(mockModel.find).toHaveBeenCalledWith({ status: "open" });
    expect(chain.populate).toHaveBeenCalledTimes(3);
    expect(chain.sort).toHaveBeenCalledWith({ createdAt: -1 });
    expect(chain.skip).toHaveBeenCalledWith(10);
    expect(chain.limit).toHaveBeenCalledWith(5);
    expect(result).toEqual([mockReportDoc]);
  });

  test("saveReport should invoke the Mongoose prototype save method directly on instances", async () => {
    const mockDocInstance = {
      save: jest.fn().mockResolvedValue(mockReportDoc),
    };
    const result = await repository.saveReport(mockDocInstance);
    expect(mockDocInstance.save).toHaveBeenCalled();
    expect(result).toEqual(mockReportDoc);
  });
});
