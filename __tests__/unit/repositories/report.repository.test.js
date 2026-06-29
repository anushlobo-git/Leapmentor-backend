/**
 * @fileoverview Report Repository Corporate Unit Tests
 * @description Assures precise verification of metric counters, pagination steps,
 * deep nested populate sub-objects, and entity level mutations with zero network dependency.
 */

const createReportRepository = require("../../../repositories/report.repository");

describe("Report Repository", () => {
  let mockReportModel;
  let reportRepository;

  const mockReportRecord = {
    _id: "rep123",
    reportedBy: "userA",
    reportedUser: "userB",
    connectRequest: "req777",
    reason: "Inappropriate behavior during live session",
    status: "pending",
    createdAt: new Date("2026-06-29"),
  };

  const mockRecordsArray = [mockReportRecord];

  // Safe Factory: Decorates a genuine Promise instance to completely avoid "manual then" linter errors
  const makeChain = (resolvedValue = null) => {
    const promise = Promise.resolve(resolvedValue);

    // Attach Mongoose chain builders directly to the native Promise, returning itself for fluid chaining
    promise.populate = jest.fn().mockReturnValue(promise);
    promise.sort = jest.fn().mockReturnValue(promise);
    promise.skip = jest.fn().mockReturnValue(promise);
    promise.limit = jest.fn().mockReturnValue(promise);
    promise.lean = jest
      .fn()
      .mockImplementation(() => Promise.resolve(resolvedValue));

    return promise;
  };

  beforeEach(() => {
    mockReportModel = {
      countDocuments: jest.fn(),
      find: jest.fn(),
      findById: jest.fn(),
    };
    reportRepository = createReportRepository(mockReportModel);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── COUNTER METRICS ─────────────────────────────────────────────────────
  describe("Counter Metrics", () => {
    test("countAllReports should calculate global collection document limits cleanly", async () => {
      mockReportModel.countDocuments.mockResolvedValue(15);

      const count = await reportRepository.countAllReports();

      expect(mockReportModel.countDocuments).toHaveBeenCalledWith();
      expect(count).toBe(15);
    });

    test("countReportsByFilter should map dynamic filter conditions down onto counter engines", async () => {
      mockReportModel.countDocuments.mockResolvedValue(3);
      const queryFilter = { status: "resolved" };

      const count = await reportRepository.countReportsByFilter(queryFilter);

      expect(mockReportModel.countDocuments).toHaveBeenCalledWith(queryFilter);
      expect(count).toBe(3);
    });
  });

  // ── PAGINATED COLLECTION QUERIES ────────────────────────────────────────
  describe("Paginated Collection Queries", () => {
    test("findReports should coordinate extensive multi-populate parameters alongside chronological pagination rules", async () => {
      const mockChain = makeChain(mockRecordsArray);
      mockReportModel.find.mockReturnValue(mockChain);
      const filter = { status: "pending" };

      const result = await reportRepository.findReports(filter, {
        skip: 10,
        limit: 5,
      });

      expect(mockReportModel.find).toHaveBeenCalledWith(filter);
      expect(mockChain.populate).toHaveBeenCalledWith(
        "reportedBy",
        "name email",
      );
      expect(mockChain.populate).toHaveBeenCalledWith(
        "reportedUser",
        "name email",
      );
      expect(mockChain.populate).toHaveBeenCalledWith(
        "connectRequest",
        "status paymentStatus totalAmount sessionRate sessionCount mentee mentor",
      );
      expect(mockChain.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(mockChain.skip).toHaveBeenCalledWith(10);
      expect(mockChain.limit).toHaveBeenCalledWith(5);
      expect(mockChain.lean).toHaveBeenCalled();
      expect(result).toEqual(mockRecordsArray);
    });
  });

  // ── IDENTIFIER LOOKUPS & RELATIONSHIP SHADOWS ───────────────────────────
  describe("Identifier Lookups & Relationship Shadows", () => {
    test("findReportByIdWithUsers should extend targeted findById lookups to hook core profile identities", async () => {
      const mockChain = makeChain(mockReportRecord);
      mockReportModel.findById.mockReturnValue(mockChain);

      const result = await reportRepository.findReportByIdWithUsers("rep123");

      expect(mockReportModel.findById).toHaveBeenCalledWith("rep123");
      expect(mockChain.populate).toHaveBeenCalledWith(
        "reportedBy",
        "name email",
      );
      expect(mockChain.populate).toHaveBeenCalledWith(
        "reportedUser",
        "name email",
      );
      expect(result).toEqual(mockReportRecord);
    });

    test("findReportByIdWithAll should load basic link reference structures completely", async () => {
      const mockChain = makeChain(mockReportRecord);
      mockReportModel.findById.mockReturnValue(mockChain);

      const result = await reportRepository.findReportByIdWithAll("rep123");

      expect(mockReportModel.findById).toHaveBeenCalledWith("rep123");
      expect(mockChain.populate).toHaveBeenCalledWith(
        "reportedBy",
        "name email",
      );
      expect(mockChain.populate).toHaveBeenCalledWith(
        "reportedUser",
        "name email",
      );
      expect(mockChain.populate).toHaveBeenCalledWith("connectRequest");
      expect(result).toEqual(mockReportRecord);
    });

    test("findReportByIdWithConnectFull should evaluate multi-layered subdocument subpopulation structures accurately", async () => {
      const mockChain = makeChain(mockReportRecord);
      mockReportModel.findById.mockReturnValue(mockChain);

      const result =
        await reportRepository.findReportByIdWithConnectFull("rep123");

      expect(mockReportModel.findById).toHaveBeenCalledWith("rep123");
      expect(mockChain.populate).toHaveBeenCalledWith(
        "reportedBy",
        "name email",
      );
      expect(mockChain.populate).toHaveBeenCalledWith(
        "reportedUser",
        "name email",
      );
      expect(mockChain.populate).toHaveBeenCalledWith({
        path: "connectRequest",
        populate: [
          { path: "mentee", select: "name email" },
          { path: "mentor", select: "name email" },
        ],
      });
      expect(result).toEqual(mockReportRecord);
    });
  });

  // ── INSTANCE LIFECYCLE MUTATIONS ────────────────────────────────────────
  describe("Instance Lifecycle Mutations", () => {
    test("saveReport should invoke inner database persistence methods on tracking document references", async () => {
      const mockInstance = {
        ...mockReportRecord,
        save: jest.fn().mockResolvedValue(mockReportRecord),
      };

      const result = await reportRepository.saveReport(mockInstance);

      expect(mockInstance.save).toHaveBeenCalled();
      expect(result).toEqual(mockReportRecord);
    });
  });
});
