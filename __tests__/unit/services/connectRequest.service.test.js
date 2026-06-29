const createConnectRequestService = require("../../../services/connectRequest.service");
const mongoose = require("mongoose");

const toConnectRequestDTO = jest.fn((v) => ({ isRequestDTO: true, ...v }));
const toMentorProfileDTO = jest.fn((v) =>
  v ? { isMentorDTO: true, ...v } : null,
);
const toMenteeProfileDTO = jest.fn((v) =>
  v ? { isMenteeDTO: true, ...v } : null,
);

const oid = () => new mongoose.Types.ObjectId();
const oids = () => oid().toString();

describe("connectRequest.service", () => {
  let repo,
    mentorRepo,
    menteeRepo,
    createNotification,
    fireAndForgetEmail,
    emailUtils,
    socketService,
    logger,
    service;

  const validSlot = {
    day: "Mon",
    date: "2026-06-24",
    startTime: "10:00",
    endTime: "11:00",
  };
  const confirmedSlot = {
    date: "2026-06-24",
    startTime: "10:00",
    endTime: "11:00",
  };

  beforeEach(() => {
    repo = {
      findPendingRequest: jest.fn(),
      findSlotConflict: jest.fn(),
      createConnectRequest: jest.fn(),
      findRequestByIdWithMentor: jest.fn(),
      findMyRequests: jest.fn(),
      findIncomingRequests: jest.fn(),
      findByIdWithParticipants: jest.fn(),
      saveRequest: jest.fn(),
      rejectConflictingSlots: jest.fn(),
      findByIdRaw: jest.fn(),
      deleteRequestById: jest.fn(),
      findOngoingConnects: jest.fn(),
      findByIdWithParticipantsLean: jest.fn(),
    };
    mentorRepo = {
      findMentorProfilesByUserIds: jest.fn(),
      findMentorProfileFull: jest.fn(),
      findMentorProfile: jest.fn(),
    };
    menteeRepo = { findMenteeProfile: jest.fn() };
    createNotification = jest.fn();
    fireAndForgetEmail = jest.fn((fn) => fn());
    emailUtils = {
      sendConnectRequestEmail: jest.fn(),
      sendRequestAcceptedEmail: jest.fn(),
    };
    socketService = { emitToUser: jest.fn() };
    logger = { info: jest.fn() };

    service = createConnectRequestService({
      connectRequestRepository: repo,
      mentorProfileRepository: mentorRepo,
      menteeProfileRepository: menteeRepo,
      createNotification,
      fireAndForgetEmail,
      emailUtils,
      socketService,
      toConnectRequestDTO,
      toMentorProfileDTO,
      toMenteeProfileDTO,
      mongoose,
      logger,
    });
  });

  afterEach(() => jest.clearAllMocks());

  // ── sendConnectRequestService ──────────────────────────────────
  describe("sendConnectRequestService", () => {
    test("throws 400 if no mentorId", async () => {
      await expect(
        service.sendConnectRequestService(
          "u1",
          { selectedSlots: [validSlot] },
          {},
        ),
      ).rejects.toMatchObject({
        statusCode: 400,
        message: "mentorId is required",
      });
    });
    test("throws 400 if slots empty/null", async () => {
      await expect(
        service.sendConnectRequestService(
          "u1",
          { mentorId: "m1", selectedSlots: [] },
          {},
        ),
      ).rejects.toMatchObject({
        statusCode: 400,
        message: "At least one slot must be selected",
      });
    });
    test("throws 400 if >5 slots", async () => {
      await expect(
        service.sendConnectRequestService(
          "u1",
          { mentorId: "m1", selectedSlots: Array(6).fill(validSlot) },
          {},
        ),
      ).rejects.toMatchObject({
        statusCode: 400,
        message: "Maximum 5 slots can be proposed",
      });
    });
    test("throws 400 if slot missing fields", async () => {
      await expect(
        service.sendConnectRequestService(
          "u1",
          { mentorId: "m1", selectedSlots: [{ date: "x" }] },
          {},
        ),
      ).rejects.toMatchObject({
        statusCode: 400,
        message: "Each slot must have day, date, startTime and endTime",
      });
    });
    test("throws 400 if self-request", async () => {
      await expect(
        service.sendConnectRequestService(
          "m1",
          { mentorId: "m1", selectedSlots: [validSlot] },
          {},
        ),
      ).rejects.toMatchObject({
        statusCode: 400,
        message: "You cannot send a request to yourself",
      });
    });
    test("throws 409 if pending request exists", async () => {
      repo.findPendingRequest.mockResolvedValue({ _id: "x" });
      await expect(
        service.sendConnectRequestService(
          "u1",
          { mentorId: "m1", selectedSlots: [validSlot] },
          {},
        ),
      ).rejects.toMatchObject({ statusCode: 409 });
    });
    test("throws 409 if slot conflict", async () => {
      repo.findPendingRequest.mockResolvedValue(null);
      repo.findSlotConflict.mockResolvedValue({ _id: "x" });
      await expect(
        service.sendConnectRequestService(
          "u1",
          { mentorId: "m1", selectedSlots: [validSlot] },
          {},
        ),
      ).rejects.toMatchObject({ statusCode: 409 });
    });
    test("throws 400 if sessionRate unresolvable", async () => {
      repo.findPendingRequest.mockResolvedValue(null);
      repo.findSlotConflict.mockResolvedValue(null);
      mentorRepo.findMentorProfile.mockResolvedValue({ hourlyRate: null });
      await expect(
        service.sendConnectRequestService(
          "u1",
          { mentorId: "m1", selectedSlots: [validSlot] },
          {},
        ),
      ).rejects.toMatchObject({
        statusCode: 400,
        message: "sessionRate must be provided or stored on the mentor profile",
      });
    });
    test("throws 400 if sessionRate < 1", async () => {
      repo.findPendingRequest.mockResolvedValue(null);
      repo.findSlotConflict.mockResolvedValue(null);
      mentorRepo.findMentorProfile.mockResolvedValue({ hourlyRate: 0 });
      await expect(
        service.sendConnectRequestService(
          "u1",
          { mentorId: "m1", selectedSlots: [validSlot] },
          {},
        ),
      ).rejects.toMatchObject({ statusCode: 400 });
    });
    test("creates request and returns DTO on success", async () => {
      const mentorId = oids();
      repo.findPendingRequest.mockResolvedValue(null);
      repo.findSlotConflict.mockResolvedValue(null);
      repo.createConnectRequest.mockResolvedValue({
        _id: "req1",
        sessionRate: 100,
        sessionCount: 1,
        totalAmount: 100,
      });
      repo.findRequestByIdWithMentor.mockResolvedValue({
        _id: "req1",
        mentor: { _id: mentorId, name: "Dr.A", email: "a@b.com" },
      });

      const result = await service.sendConnectRequestService(
        "u1",
        { mentorId, selectedSlots: [validSlot], sessionRate: 100 },
        { name: "Alice" },
      );
      expect(result.isRequestDTO).toBe(true);
      expect(createNotification).toHaveBeenCalledWith(
        expect.objectContaining({ type: "connect_request_received" }),
      );
    });
    test("fetches sessionRate from profile when not in body", async () => {
      const mentorId = oids();
      repo.findPendingRequest.mockResolvedValue(null);
      repo.findSlotConflict.mockResolvedValue(null);
      mentorRepo.findMentorProfile.mockResolvedValue({ hourlyRate: 75 });
      repo.createConnectRequest.mockResolvedValue({
        _id: "req2",
        sessionRate: 75,
        sessionCount: 1,
        totalAmount: 75,
      });
      repo.findRequestByIdWithMentor.mockResolvedValue({
        _id: "req2",
        mentor: { _id: mentorId, name: "Dr.B", email: "b@c.com" },
      });

      const result = await service.sendConnectRequestService(
        "u1",
        { mentorId, selectedSlots: [validSlot] },
        { name: "Bob" },
      );
      expect(result.isRequestDTO).toBe(true);
    });
  });

  // ── getMyRequestsService ───────────────────────────────────────
  describe("getMyRequestsService", () => {
    test("returns [] when no requests", async () => {
      repo.findMyRequests.mockResolvedValue([]);
      expect(await service.getMyRequestsService("u1")).toEqual([]);
    });
    test("stitches mentor and referredTo profiles", async () => {
      const mId = oid();
      const rId = oid();
      repo.findMyRequests.mockResolvedValue([
        { mentor: { _id: mId }, referredTo: { _id: rId } },
      ]);
      mentorRepo.findMentorProfilesByUserIds
        .mockResolvedValueOnce([{ user: mId.toString(), name: "A" }])
        .mockResolvedValueOnce([{ user: rId.toString(), name: "B" }]);
      const result = await service.getMyRequestsService("u1");
      expect(result[0].isRequestDTO).toBe(true);
      expect(result[0].mentorProfile.isMentorDTO).toBe(true);
      expect(result[0].referredToProfile.isMentorDTO).toBe(true);
    });
  });

  // ── getIncomingRequestsService ────────────────────────────────
  describe("getIncomingRequestsService", () => {
    test("returns DTO with null referredByProfile when absent", async () => {
      repo.findIncomingRequests.mockResolvedValue([{ referredBy: null }]);
      const result = await service.getIncomingRequestsService("m1", "pending");
      expect(result[0].referredByProfile).toBeNull();
    });
    test("fetches referredBy profile when present", async () => {
      const refId = oid();
      repo.findIncomingRequests.mockResolvedValue([
        { referredBy: { _id: refId } },
      ]);
      mentorRepo.findMentorProfileFull.mockResolvedValue({
        user: refId.toString(),
      });
      const result = await service.getIncomingRequestsService("m1", "pending");
      expect(result[0].referredByProfile).toBeTruthy();
    });
  });

  // ── respondToRequestService ───────────────────────────────────
  describe("respondToRequestService", () => {
    test("throws 400 for invalid status", async () => {
      await expect(
        service.respondToRequestService("r1", "m1", { status: "maybe" }),
      ).rejects.toMatchObject({ statusCode: 400 });
    });
    test("throws 400 if accepting without confirmedSlot", async () => {
      await expect(
        service.respondToRequestService("r1", "m1", {
          status: "accepted",
          confirmedSlot: null,
        }),
      ).rejects.toMatchObject({
        statusCode: 400,
        message: "confirmedSlot is required when accepting",
      });
    });
    test("throws 404 if request not found", async () => {
      repo.findByIdWithParticipants.mockResolvedValue(null);
      await expect(
        service.respondToRequestService("r1", "m1", { status: "rejected" }),
      ).rejects.toMatchObject({ statusCode: 404 });
    });
    test("throws 403 if wrong mentor", async () => {
      repo.findByIdWithParticipants.mockResolvedValue({
        mentor: { _id: "real" },
      });
      await expect(
        service.respondToRequestService("r1", "fake", { status: "rejected" }),
      ).rejects.toMatchObject({ statusCode: 403 });
    });
    test("throws 400 if not pending", async () => {
      repo.findByIdWithParticipants.mockResolvedValue({
        mentor: { _id: "m1" },
        status: "accepted",
      });
      await expect(
        service.respondToRequestService("r1", "m1", { status: "rejected" }),
      ).rejects.toMatchObject({ statusCode: 400 });
    });
    test("accepts request, notifies and returns DTO", async () => {
      repo.findByIdWithParticipants.mockResolvedValue({
        _id: "r1",
        status: "pending",
        mentor: { _id: "m1", name: "Dr.A" },
        mentee: { _id: "u1", name: "Alice", email: "a@b.com" },
        selectedSlots: [validSlot],
        sessionRate: 100,
        sessionCount: 1,
      });
      const result = await service.respondToRequestService("r1", "m1", {
        status: "accepted",
        confirmedSlot,
      });
      expect(repo.rejectConflictingSlots).toHaveBeenCalled();
      expect(createNotification).toHaveBeenCalledWith(
        expect.objectContaining({ type: "connect_request_accepted" }),
      );
      expect(result.isRequestDTO).toBe(true);
    });
    test("rejects request, notifies mentee", async () => {
      repo.findByIdWithParticipants.mockResolvedValue({
        _id: "r1",
        status: "pending",
        mentor: { _id: "m1", name: "Dr.A" },
        mentee: { _id: "u1" },
        selectedSlots: [],
        sessionRate: 100,
        sessionCount: 1,
      });
      const result = await service.respondToRequestService("r1", "m1", {
        status: "rejected",
      });
      expect(createNotification).toHaveBeenCalledWith(
        expect.objectContaining({ type: "connect_request_declined" }),
      );
      expect(result.isRequestDTO).toBe(true);
    });
    test("backfills sessionRate from profile", async () => {
      repo.findByIdWithParticipants.mockResolvedValue({
        _id: "r1",
        status: "pending",
        mentor: { _id: "m1", name: "Dr.A" },
        mentee: { _id: "u1", name: "Alice", email: "a@b.com" },
        selectedSlots: [validSlot],
        sessionRate: null,
        sessionCount: 1,
      });
      mentorRepo.findMentorProfile.mockResolvedValue({ hourlyRate: 80 });
      const result = await service.respondToRequestService("r1", "m1", {
        status: "accepted",
        confirmedSlot,
      });
      expect(result.isRequestDTO).toBe(true);
    });
    test("throws 400 if backfill sessionRate still null", async () => {
      repo.findByIdWithParticipants.mockResolvedValue({
        _id: "r1",
        status: "pending",
        mentor: { _id: "m1" },
        mentee: { _id: "u1" },
        selectedSlots: [validSlot],
        sessionRate: null,
        sessionCount: 1,
      });
      mentorRepo.findMentorProfile.mockResolvedValue({ hourlyRate: null });
      await expect(
        service.respondToRequestService("r1", "m1", {
          status: "accepted",
          confirmedSlot,
        }),
      ).rejects.toMatchObject({
        statusCode: 400,
        message: expect.stringContaining("session rate"),
      });
    });
    test("throws 400 if backfill sessionCount invalid", async () => {
      repo.findByIdWithParticipants.mockResolvedValue({
        _id: "r1",
        status: "pending",
        mentor: { _id: "m1" },
        mentee: { _id: "u1" },
        selectedSlots: [],
        sessionRate: null,
        sessionCount: null,
      });
      mentorRepo.findMentorProfile.mockResolvedValue({ hourlyRate: 80 });
      await expect(
        service.respondToRequestService("r1", "m1", {
          status: "accepted",
          confirmedSlot,
        }),
      ).rejects.toMatchObject({
        statusCode: 400,
        message: expect.stringContaining("session count"),
      });
    });
  });

  // ── cancelRequestService ──────────────────────────────────────
  describe("cancelRequestService", () => {
    test("throws 404 if not found", async () => {
      repo.findByIdRaw.mockResolvedValue(null);
      await expect(
        service.cancelRequestService("r1", "u1"),
      ).rejects.toMatchObject({ statusCode: 404 });
    });
    test("throws 403 if wrong mentee", async () => {
      repo.findByIdRaw.mockResolvedValue({
        mentee: { _id: "real" },
        status: "pending",
      });
      await expect(
        service.cancelRequestService("r1", "fake"),
      ).rejects.toMatchObject({ statusCode: 403 });
    });
    test("throws 400 if ongoing", async () => {
      repo.findByIdRaw.mockResolvedValue({
        mentee: { _id: "u1" },
        status: "ongoing",
      });
      await expect(
        service.cancelRequestService("r1", "u1"),
      ).rejects.toMatchObject({ statusCode: 400 });
    });
    test("deletes and resolves undefined", async () => {
      repo.findByIdRaw.mockResolvedValue({
        mentee: { _id: "u1" },
        status: "pending",
      });
      expect(await service.cancelRequestService("r1", "u1")).toBeUndefined();
      expect(repo.deleteRequestById).toHaveBeenCalledWith("r1");
    });
  });

  // ── referRequestService ───────────────────────────────────────
  describe("referRequestService", () => {
    test("throws 400 if no referToMentorId", async () => {
      await expect(
        service.referRequestService("r1", "m1", {}),
      ).rejects.toMatchObject({ statusCode: 400 });
    });
    test("throws 404 if request not found", async () => {
      repo.findByIdWithParticipants.mockResolvedValue(null);
      await expect(
        service.referRequestService("r1", "m1", { referToMentorId: "m2" }),
      ).rejects.toMatchObject({ statusCode: 404 });
    });
    test("throws 403 if not owner", async () => {
      repo.findByIdWithParticipants.mockResolvedValue({
        mentor: { _id: "real" },
        status: "pending",
      });
      await expect(
        service.referRequestService("r1", "fake", { referToMentorId: "m2" }),
      ).rejects.toMatchObject({ statusCode: 403 });
    });
    test("throws 400 if not pending", async () => {
      repo.findByIdWithParticipants.mockResolvedValue({
        mentor: { _id: "m1" },
        status: "accepted",
      });
      await expect(
        service.referRequestService("r1", "m1", { referToMentorId: "m2" }),
      ).rejects.toMatchObject({ statusCode: 400 });
    });
    test("throws 400 if referring to self", async () => {
      repo.findByIdWithParticipants.mockResolvedValue({
        mentor: { _id: "m1" },
        status: "pending",
        mentee: { _id: "u1" },
      });
      await expect(
        service.referRequestService("r1", "m1", { referToMentorId: "m1" }),
      ).rejects.toMatchObject({ statusCode: 400 });
    });
    test("throws 409 if mentee already has pending with target", async () => {
      repo.findByIdWithParticipants.mockResolvedValue({
        mentor: { _id: "m1" },
        status: "pending",
        mentee: { _id: "u1" },
      });
      repo.findPendingRequest.mockResolvedValue({ _id: "x" });
      await expect(
        service.referRequestService("r1", "m1", { referToMentorId: "m2" }),
      ).rejects.toMatchObject({ statusCode: 409 });
    });
    test("creates referred request and returns both DTOs", async () => {
      const referToMentorId = oids();
      repo.findByIdWithParticipants.mockResolvedValue({
        _id: "r1",
        status: "pending",
        mentor: { _id: "m1", name: "Dr.A" },
        mentee: { _id: "u1", name: "Alice" },
        message: "",
        selectedSlots: [],
        sessionRate: 100,
        sessionCount: 1,
        totalAmount: 100,
      });
      repo.findPendingRequest.mockResolvedValue(null);
      repo.createConnectRequest.mockResolvedValue({ _id: "r2" });

      const result = await service.referRequestService("r1", "m1", {
        referToMentorId,
      });
      expect(result.originalRequest.isRequestDTO).toBe(true);
      expect(result.newRequest.isRequestDTO).toBe(true);
      expect(createNotification).toHaveBeenCalledTimes(2);
    });
  });

  // ── getOngoingConnectsService ─────────────────────────────────
  describe("getOngoingConnectsService", () => {
    test("returns mentorProfile when viewer is mentee", async () => {
      const menteeId = oid();
      const mentorId = oid();
      repo.findOngoingConnects.mockResolvedValue([
        { mentee: { _id: menteeId }, mentor: { _id: mentorId } },
      ]);
      mentorRepo.findMentorProfile.mockResolvedValue({
        user: mentorId.toString(),
      });
      const result = await service.getOngoingConnectsService(
        menteeId.toString(),
      );
      expect(result[0].mentorProfile.isMentorDTO).toBe(true);
    });
    test("returns menteeProfile when viewer is mentor", async () => {
      const menteeId = oid();
      const mentorId = oid();
      repo.findOngoingConnects.mockResolvedValue([
        { mentee: { _id: menteeId }, mentor: { _id: mentorId } },
      ]);
      menteeRepo.findMenteeProfile.mockResolvedValue({
        user: menteeId.toString(),
      });
      const result = await service.getOngoingConnectsService(
        mentorId.toString(),
      );
      expect(result[0].menteeProfile.isMenteeDTO).toBe(true);
    });
  });

  // ── getConnectDetailService ───────────────────────────────────
  describe("getConnectDetailService", () => {
    test("throws 404 if not found", async () => {
      repo.findByIdWithParticipantsLean.mockResolvedValue(null);
      await expect(
        service.getConnectDetailService("r1", "u1"),
      ).rejects.toMatchObject({ statusCode: 404 });
    });
    test("throws 403 if not participant", async () => {
      repo.findByIdWithParticipantsLean.mockResolvedValue({
        mentee: { _id: "u1" },
        mentor: { _id: "m1" },
      });
      await expect(
        service.getConnectDetailService("r1", "intruder"),
      ).rejects.toMatchObject({ statusCode: 403 });
    });
    test("returns viewerRole=mentee when viewer is mentee", async () => {
      repo.findByIdWithParticipantsLean.mockResolvedValue({
        mentee: { _id: "u1" },
        mentor: { _id: "m1" },
      });
      mentorRepo.findMentorProfile.mockResolvedValue({ user: "m1" });
      menteeRepo.findMenteeProfile.mockResolvedValue({ user: "u1" });
      const result = await service.getConnectDetailService("r1", "u1");
      expect(result.viewerRole).toBe("mentee");
    });
    test("returns viewerRole=mentor when viewer is mentor", async () => {
      repo.findByIdWithParticipantsLean.mockResolvedValue({
        mentee: { _id: "u1" },
        mentor: { _id: "m1" },
      });
      mentorRepo.findMentorProfile.mockResolvedValue({ user: "m1" });
      menteeRepo.findMenteeProfile.mockResolvedValue({ user: "u1" });
      const result = await service.getConnectDetailService("r1", "m1");
      expect(result.viewerRole).toBe("mentor");
    });
  });
});
