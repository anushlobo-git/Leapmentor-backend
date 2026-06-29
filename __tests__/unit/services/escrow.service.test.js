const createEscrowService = require("../../../services/escrow.service");

describe("escrow.service", () => {
  let mongoose,
    adminRepo,
    connectRepo,
    walletRepo,
    transactionRepo,
    mentorProfileRepo,
    availabilityRepo,
    fireAndForgetEmail,
    emailUtils,
    calendarUtils,
    logger,
    service,
    session;

  beforeEach(() => {
    session = {
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      abortTransaction: jest.fn(),
      endSession: jest.fn(),
    };
    mongoose = { startSession: jest.fn().mockResolvedValue(session) };
    adminRepo = {
      findActiveAdmin: jest.fn(),
      incrementWalletBalance: jest.fn(),
    };
    connectRepo = {
      findByIdWithParticipants: jest.fn(),
      findByIdRaw: jest.fn(),
      save: jest.fn(),
    };
    walletRepo = {
      findByUserIdAndRole: jest.fn(),
      findByUserId: jest.fn(),
      save: jest.fn(),
    };
    transactionRepo = { createMany: jest.fn() };
    mentorProfileRepo = { findMentorProfile: jest.fn() };
    availabilityRepo = {
      findAvailabilityByMentor: jest
        .fn()
        .mockResolvedValue({ timezone: "Asia/Kolkata" }),
    };
    fireAndForgetEmail = jest.fn((fn) => fn());
    emailUtils = {
      sendInvoiceEmail: jest.fn(),
      sendPaymentReceivedEmail: jest.fn(),
    };
    calendarUtils = { sendCalendarInvite: jest.fn().mockResolvedValue(true) };
    logger = { warn: jest.fn(), error: jest.fn() };

    service = createEscrowService({
      mongoose,
      adminUserRepo: adminRepo,
      connectRequestRepo: connectRepo,
      walletRepo,
      transactionRepo,
      mentorProfileRepo,
      availabilityRepo,
      fireAndForgetEmail,
      emailUtils,
      calendarUtils,
      logger,
    });
  });

  afterEach(() => jest.clearAllMocks());

  const acceptedReq = () => ({
    _id: "r1",
    status: "accepted",
    paymentStatus: "unpaid",
    mentee: { _id: "u1", name: "Alice", email: "a@b.com" },
    mentor: { _id: "m1", name: "Bob", email: "b@c.com" },
    selectedSlots: [],
    confirmedSlot: {},
    message: "",
  });

  // ── pay ───────────────────────────────────────────────────────
  describe("pay", () => {
    const call = (o = {}) =>
      service.pay({
        connectRequestId: "r1",
        sessionRate: 100,
        sessionCount: 1,
        menteeId: "u1",
        ...o,
      });

    test("throws 400 if connectRequestId missing", () =>
      expect(
        service.pay({ sessionRate: 100, sessionCount: 1, menteeId: "u1" }),
      ).rejects.toMatchObject({ statusCode: 400 }));
    test("throws 400 if sessionRate < 1", () =>
      expect(call({ sessionRate: 0 })).rejects.toMatchObject({
        statusCode: 400,
      }));
    test("throws 400 if sessionCount < 1", () =>
      expect(call({ sessionCount: 0 })).rejects.toMatchObject({
        statusCode: 400,
      }));
    test("throws 500 if no admin", () => {
      adminRepo.findActiveAdmin.mockResolvedValue(null);
      return expect(call()).rejects.toMatchObject({ statusCode: 500 });
    });
    test("throws 404 if request not found", async () => {
      adminRepo.findActiveAdmin.mockResolvedValue({ commissionRate: 10 });
      connectRepo.findByIdWithParticipants.mockResolvedValue(null);
      await expect(call()).rejects.toMatchObject({ statusCode: 404 });
      expect(session.abortTransaction).toHaveBeenCalled();
    });
    test("throws 403 if mentee mismatch", async () => {
      adminRepo.findActiveAdmin.mockResolvedValue({ commissionRate: 10 });
      connectRepo.findByIdWithParticipants.mockResolvedValue({
        mentee: { _id: "other" },
        status: "accepted",
        paymentStatus: "unpaid",
      });
      await expect(call()).rejects.toMatchObject({ statusCode: 403 });
    });
    test("throws 400 if status not accepted", async () => {
      adminRepo.findActiveAdmin.mockResolvedValue({ commissionRate: 10 });
      connectRepo.findByIdWithParticipants.mockResolvedValue({
        mentee: { _id: "u1" },
        status: "pending",
        paymentStatus: "unpaid",
      });
      await expect(call()).rejects.toMatchObject({ statusCode: 400 });
    });
    test("throws 409 if already paid", async () => {
      adminRepo.findActiveAdmin.mockResolvedValue({ commissionRate: 10 });
      connectRepo.findByIdWithParticipants.mockResolvedValue({
        mentee: { _id: "u1" },
        status: "accepted",
        paymentStatus: "paid",
      });
      await expect(call()).rejects.toMatchObject({ statusCode: 409 });
    });
    test("throws 404 if wallet not found", async () => {
      adminRepo.findActiveAdmin.mockResolvedValue({ commissionRate: 10 });
      connectRepo.findByIdWithParticipants.mockResolvedValue({
        mentee: { _id: "u1" },
        status: "accepted",
        paymentStatus: "unpaid",
      });
      walletRepo.findByUserIdAndRole.mockResolvedValue(null);
      await expect(call()).rejects.toMatchObject({ statusCode: 404 });
    });
    test("throws 400 and aborts if insufficient balance", async () => {
      adminRepo.findActiveAdmin.mockResolvedValue({ commissionRate: 20 });
      connectRepo.findByIdWithParticipants.mockResolvedValue({
        mentee: { _id: "u1" },
        status: "accepted",
        paymentStatus: "unpaid",
      });
      walletRepo.findByUserIdAndRole.mockResolvedValue({
        balance: 10,
        escrow: 0,
      });
      await expect(call()).rejects.toMatchObject({ statusCode: 400 });
      expect(session.abortTransaction).toHaveBeenCalled();
    });
    test("commits and returns paid result", async () => {
      adminRepo.findActiveAdmin.mockResolvedValue({ commissionRate: 10 });
      connectRepo.findByIdWithParticipants.mockResolvedValue(acceptedReq());
      const wallet = { balance: 500, escrow: 0 };
      walletRepo.findByUserIdAndRole.mockResolvedValue(wallet);
      const result = await call({ sessionCount: 2 });
      expect(session.commitTransaction).toHaveBeenCalled();
      expect(result.paymentStatus).toBe("paid");
      expect(wallet.balance).toBe(280);
    });
  });

  // ── payAdditional ─────────────────────────────────────────────
  describe("payAdditional", () => {
    const call = (o = {}) =>
      service.payAdditional({
        connectRequestId: "r1",
        sessionRate: 100,
        slotId: "s1",
        menteeId: "u1",
        ...o,
      });
    const ongoingReq = (slot = { paymentStatus: "unpaid" }) => ({
      _id: "r1",
      mentee: { _id: "u1" },
      status: "ongoing",
      additionalSlots: { id: jest.fn().mockReturnValue(slot) },
    });

    test("throws 400 if fields missing", () =>
      expect(
        service.payAdditional({ sessionRate: 100, menteeId: "u1" }),
      ).rejects.toMatchObject({ statusCode: 400 }));
    test("throws 400 if sessionRate < 1", () =>
      expect(call({ sessionRate: 0 })).rejects.toMatchObject({
        statusCode: 400,
      }));
    test("throws 500 if no admin", () => {
      adminRepo.findActiveAdmin.mockResolvedValue(null);
      return expect(call()).rejects.toMatchObject({ statusCode: 500 });
    });
    test("throws 404 if request not found", async () => {
      adminRepo.findActiveAdmin.mockResolvedValue({ commissionRate: 10 });
      connectRepo.findByIdWithParticipants.mockResolvedValue(null);
      await expect(call()).rejects.toMatchObject({ statusCode: 404 });
    });
    test("throws 403 if mentee mismatch", async () => {
      adminRepo.findActiveAdmin.mockResolvedValue({ commissionRate: 10 });
      connectRepo.findByIdWithParticipants.mockResolvedValue({
        mentee: { _id: "other" },
        status: "ongoing",
      });
      await expect(call()).rejects.toMatchObject({ statusCode: 403 });
    });
    test("throws 400 if not ongoing", async () => {
      adminRepo.findActiveAdmin.mockResolvedValue({ commissionRate: 10 });
      connectRepo.findByIdWithParticipants.mockResolvedValue({
        mentee: { _id: "u1" },
        status: "accepted",
      });
      await expect(call()).rejects.toMatchObject({ statusCode: 400 });
    });
    test("throws 404 if slot not found", async () => {
      adminRepo.findActiveAdmin.mockResolvedValue({ commissionRate: 10 });
      connectRepo.findByIdWithParticipants.mockResolvedValue(ongoingReq(null));
      await expect(call()).rejects.toMatchObject({ statusCode: 404 });
    });
    test("throws 409 if slot already paid", async () => {
      adminRepo.findActiveAdmin.mockResolvedValue({ commissionRate: 10 });
      connectRepo.findByIdWithParticipants.mockResolvedValue(
        ongoingReq({ paymentStatus: "paid" }),
      );
      await expect(call()).rejects.toMatchObject({ statusCode: 409 });
    });
    test("throws 404 if wallet not found", async () => {
      adminRepo.findActiveAdmin.mockResolvedValue({ commissionRate: 10 });
      connectRepo.findByIdWithParticipants.mockResolvedValue(ongoingReq());
      walletRepo.findByUserId.mockResolvedValue(null);
      await expect(call()).rejects.toMatchObject({ statusCode: 404 });
    });
    test("throws 400 if insufficient balance", async () => {
      adminRepo.findActiveAdmin.mockResolvedValue({ commissionRate: 10 });
      connectRepo.findByIdWithParticipants.mockResolvedValue(ongoingReq());
      walletRepo.findByUserId.mockResolvedValue({ balance: 1, escrow: 0 });
      await expect(call()).rejects.toMatchObject({ statusCode: 400 });
    });
    test("commits and returns result", async () => {
      adminRepo.findActiveAdmin.mockResolvedValue({ commissionRate: 10 });
      connectRepo.findByIdWithParticipants.mockResolvedValue(ongoingReq());
      walletRepo.findByUserId.mockResolvedValue({ balance: 500, escrow: 0 });
      const result = await call();
      expect(session.commitTransaction).toHaveBeenCalled();
      expect(result.slotId).toBe("s1");
    });
  });

  // ── release ───────────────────────────────────────────────────
  describe("release", () => {
    const call = () => service.release({ requestId: "r1", menteeId: "u1" });
    const ongoingReq = {
      mentee: "u1",
      mentor: "m1",
      status: "ongoing",
      paymentStatus: "paid",
      totalAmount: 120,
      mentorPayout: 100,
      commissionAmount: 20,
      commissionRate: 20,
    };

    test("throws 500 if no admin", () => {
      adminRepo.findActiveAdmin.mockResolvedValue(null);
      return expect(call()).rejects.toMatchObject({ statusCode: 500 });
    });
    test("throws 404 if request not found", async () => {
      adminRepo.findActiveAdmin.mockResolvedValue({ _id: "a1" });
      connectRepo.findByIdRaw.mockResolvedValue(null);
      await expect(call()).rejects.toMatchObject({ statusCode: 404 });
    });
    test("throws 403 if not mentee", async () => {
      adminRepo.findActiveAdmin.mockResolvedValue({ _id: "a1" });
      connectRepo.findByIdRaw.mockResolvedValue({
        ...ongoingReq,
        mentee: "other",
      });
      await expect(call()).rejects.toMatchObject({ statusCode: 403 });
    });
    test("throws 400 if not ongoing", async () => {
      adminRepo.findActiveAdmin.mockResolvedValue({ _id: "a1" });
      connectRepo.findByIdRaw.mockResolvedValue({
        ...ongoingReq,
        status: "completed",
      });
      await expect(call()).rejects.toMatchObject({ statusCode: 400 });
    });
    test("throws 400 if not paid", async () => {
      adminRepo.findActiveAdmin.mockResolvedValue({ _id: "a1" });
      connectRepo.findByIdRaw.mockResolvedValue({
        ...ongoingReq,
        paymentStatus: "unpaid",
      });
      await expect(call()).rejects.toMatchObject({ statusCode: 400 });
    });
    test("throws 404 if mentee wallet missing", async () => {
      adminRepo.findActiveAdmin.mockResolvedValue({ _id: "a1" });
      connectRepo.findByIdRaw.mockResolvedValue(ongoingReq);
      walletRepo.findByUserIdAndRole.mockResolvedValue(null);
      await expect(call()).rejects.toMatchObject({ statusCode: 404 });
    });
    test("throws 404 if mentor wallet missing", async () => {
      adminRepo.findActiveAdmin.mockResolvedValue({ _id: "a1" });
      connectRepo.findByIdRaw.mockResolvedValue(ongoingReq);
      walletRepo.findByUserIdAndRole
        .mockResolvedValueOnce({ escrow: 120 })
        .mockResolvedValueOnce(null);
      await expect(call()).rejects.toMatchObject({ statusCode: 404 });
    });
    test("throws 400 if escrow mismatch", async () => {
      adminRepo.findActiveAdmin.mockResolvedValue({ _id: "a1" });
      connectRepo.findByIdRaw.mockResolvedValue(ongoingReq);
      walletRepo.findByUserIdAndRole
        .mockResolvedValueOnce({ escrow: 50 })
        .mockResolvedValueOnce({ balance: 0 });
      await expect(call()).rejects.toMatchObject({ statusCode: 400 });
    });
    test("releases funds and returns completed", async () => {
      adminRepo.findActiveAdmin.mockResolvedValue({ _id: "a1" });
      connectRepo.findByIdRaw.mockResolvedValue({ _id: "r1", ...ongoingReq });
      const mw = { escrow: 120 },
        tw = { balance: 0 };
      walletRepo.findByUserIdAndRole
        .mockResolvedValueOnce(mw)
        .mockResolvedValueOnce(tw);
      const result = await call();
      expect(mw.escrow).toBe(0);
      expect(tw.balance).toBe(100);
      expect(adminRepo.incrementWalletBalance).toHaveBeenCalledWith("a1", 20);
      expect(result.status).toBe("completed");
    });
    test("logs warn if abort throws during error", async () => {
      adminRepo.findActiveAdmin.mockResolvedValue({ _id: "a1" });
      connectRepo.findByIdRaw.mockResolvedValue(null);
      session.abortTransaction.mockRejectedValue(new Error("abort fail"));
      await expect(call()).rejects.toMatchObject({ statusCode: 404 });
      expect(logger.warn).toHaveBeenCalled();
    });
  });

  // ── refund ────────────────────────────────────────────────────
  describe("refund", () => {
    const base = {
      _id: "r1",
      mentee: "u1",
      mentor: "m1",
      paymentStatus: "paid",
      status: "ongoing",
      totalAmount: 150,
    };
    const call = (userId = "u1") => service.refund({ requestId: "r1", userId });

    test("throws 404 if not found", () => {
      connectRepo.findByIdRaw.mockResolvedValue(null);
      return expect(call()).rejects.toMatchObject({ statusCode: 404 });
    });
    test("throws 403 if not participant", () => {
      connectRepo.findByIdRaw.mockResolvedValue(base);
      return expect(call("x")).rejects.toMatchObject({ statusCode: 403 });
    });
    test("throws 400 if not paid", () => {
      connectRepo.findByIdRaw.mockResolvedValue({
        ...base,
        paymentStatus: "unpaid",
      });
      return expect(call()).rejects.toMatchObject({ statusCode: 400 });
    });
    test("throws 400 if completed", () => {
      connectRepo.findByIdRaw.mockResolvedValue({
        ...base,
        status: "completed",
      });
      return expect(call()).rejects.toMatchObject({ statusCode: 400 });
    });
    test("throws 404 if wallet not found", () => {
      connectRepo.findByIdRaw.mockResolvedValue(base);
      walletRepo.findByUserId.mockResolvedValue(null);
      return expect(call()).rejects.toMatchObject({ statusCode: 404 });
    });
    test("throws 400 if escrow too low", () => {
      connectRepo.findByIdRaw.mockResolvedValue(base);
      walletRepo.findByUserId.mockResolvedValue({ balance: 0, escrow: 10 });
      return expect(call()).rejects.toMatchObject({ statusCode: 400 });
    });
    test("refunds and returns refunded status", async () => {
      connectRepo.findByIdRaw.mockResolvedValue(base);
      const w = { balance: 50, escrow: 150 };
      walletRepo.findByUserId.mockResolvedValue(w);
      const result = await call();
      expect(w.escrow).toBe(0);
      expect(w.balance).toBe(200);
      expect(result.paymentStatus).toBe("refunded");
    });
    
  });

  // ── refundSlot ────────────────────────────────────────────────
  describe("refundSlot", () => {
    const call = () =>
      service.refundSlot({
        connectRequestId: "r1",
        slotIndex: 0,
        cancelledBy: "u1",
      });

    test("throws 404 if not found", () => {
      connectRepo.findByIdRaw.mockResolvedValue(null);
      return expect(call()).rejects.toMatchObject({ statusCode: 404 });
    });
    test("throws 400 if not paid", () => {
      connectRepo.findByIdRaw.mockResolvedValue({
        paymentStatus: "unpaid",
        selectedSlots: [{}],
      });
      return expect(call()).rejects.toMatchObject({ statusCode: 400 });
    });
    test("throws 400 if no slots", () => {
      connectRepo.findByIdRaw.mockResolvedValue({
        paymentStatus: "paid",
        selectedSlots: [],
        mentee: "u1",
        totalAmount: 100,
      });
      return expect(call()).rejects.toMatchObject({ statusCode: 400 });
    });
    test("throws 400 if perSlotRefund < 1", () => {
      connectRepo.findByIdRaw.mockResolvedValue({
        paymentStatus: "paid",
        selectedSlots: [{}],
        mentee: "u1",
        totalAmount: 0,
      });
      return expect(call()).rejects.toMatchObject({ statusCode: 400 });
    });
    test("throws 404 if wallet not found", () => {
      connectRepo.findByIdRaw.mockResolvedValue({
        paymentStatus: "paid",
        selectedSlots: [{}],
        mentee: "u1",
        totalAmount: 100,
      });
      walletRepo.findByUserId.mockResolvedValue(null);
      return expect(call()).rejects.toMatchObject({ statusCode: 404 });
    });
    test("throws 400 if escrow too low", () => {
      connectRepo.findByIdRaw.mockResolvedValue({
        paymentStatus: "paid",
        selectedSlots: [{}],
        mentee: "u1",
        totalAmount: 100,
      });
      walletRepo.findByUserId.mockResolvedValue({ balance: 0, escrow: 0 });
      return expect(call()).rejects.toMatchObject({ statusCode: 400 });
    });
    test("refunds slot correctly", async () => {
      connectRepo.findByIdRaw.mockResolvedValue({
        _id: "r1",
        paymentStatus: "paid",
        selectedSlots: [{}],
        mentee: "u1",
        totalAmount: 100,
      });
      const w = { balance: 0, escrow: 100 };
      walletRepo.findByUserId.mockResolvedValue(w);
      const result = await call();
      expect(result.refundedAmount).toBe(100);
      expect(w.balance).toBe(100);
    });
  });

  // ── getStatus ─────────────────────────────────────────────────
  describe("getStatus", () => {
    test("throws 404 if not found", () => {
      connectRepo.findByIdRaw.mockResolvedValue(null);
      return expect(
        service.getStatus({ requestId: "r1", userId: "u1" }),
      ).rejects.toMatchObject({ statusCode: 404 });
    });
    test("throws 403 if not participant", () => {
      connectRepo.findByIdRaw.mockResolvedValue({ mentee: "u1", mentor: "m1" });
      return expect(
        service.getStatus({ requestId: "r1", userId: "x" }),
      ).rejects.toMatchObject({ statusCode: 403 });
    });
    test("returns status with sessionRate from mentor profile", async () => {
      connectRepo.findByIdRaw.mockResolvedValue({
        mentee: "u1",
        mentor: "m1",
        status: "accepted",
        paymentStatus: "unpaid",
        sessionRate: null,
        sessionCount: null,
        selectedSlots: [{}],
        confirmedSlot: {},
      });
      adminRepo.findActiveAdmin.mockResolvedValue({ commissionRate: 10 });
      mentorProfileRepo.findMentorProfile.mockResolvedValue({
        hourlyRate: 100,
      });
      walletRepo.findByUserId.mockResolvedValue({ balance: 851, escrow: 15 });
      const result = await service.getStatus({ requestId: "r1", userId: "u1" });
      expect(result.sessionRate).toBe(100);
      expect(result.totalAmount).toBe(100);
    });
  });

  // ── getMyWallet ───────────────────────────────────────────────
  describe("getMyWallet", () => {
    test("throws 404 if wallet not found", () => {
      walletRepo.findByUserId.mockResolvedValue(null);
      return expect(service.getMyWallet("u1")).rejects.toMatchObject({
        statusCode: 404,
      });
    });
    test("returns balance and escrow", async () => {
      walletRepo.findByUserId.mockResolvedValue({ balance: 100, escrow: 20 });
      expect(await service.getMyWallet("u1")).toEqual({
        balance: 100,
        escrow: 20,
      });
    });
  });

  // ── getCommissionRate ─────────────────────────────────────────
  describe("getCommissionRate", () => {
    test("throws 404 if no admin", () => {
      adminRepo.findActiveAdmin.mockResolvedValue(null);
      return expect(service.getCommissionRate()).rejects.toMatchObject({
        statusCode: 404,
      });
    });
    test("throws 404 if rate is 0/falsy", () => {
      adminRepo.findActiveAdmin.mockResolvedValue({ commissionRate: 0 });
      return expect(service.getCommissionRate()).rejects.toMatchObject({
        statusCode: 404,
      });
    });
    test("returns rate", async () => {
      adminRepo.findActiveAdmin.mockResolvedValue({ commissionRate: 15 });
      expect(await service.getCommissionRate()).toBe(15);
    });
  });
});
