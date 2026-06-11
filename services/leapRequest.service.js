/**
 * @fileoverview Leap Request Service
 * @description Evaluates allocation rules, grants grants, and manages approval lifecycles for point provisions.
 */
const AppError = require("../utils/AppError");

// Repositories
const leapRequestRepository = require("../repositories/leapRequest.repository");
const walletRepository = require("../repositories/wallet.repository");

// Upper-case Domain Constants
const STATUS_PENDING = "pending";
const STATUS_APPROVED = "approved";
const STATUS_REJECTED = "rejected";
const LEAP_POINTS_GRANT_AMOUNT = 500;
const LEAP_POINTS_MAX_THRESHOLD = 500;

/**
 * Retrieves the latest pending request filed by a specific mentee user.
 * @param {string} menteeId - Unique identifier of the targeting mentee user.
 * @throws {AppError} 404 - If no active pending request matches the tracking ID.
 * @returns {Promise<Object>} The unresolved active request document record.
 */
const getMyPendingRequest = async (menteeId) => {
  const request = await leapRequestRepository.findLatestByMenteeAndStatus(
    menteeId,
    STATUS_PENDING,
  );
  if (!request) {
    throw new AppError("No pending points allocation request found.", 404);
  }
  return request;
};

/**
 * Compiles and records a new points grant processing request.
 * @description Implements guard criteria blocking sequential duplicate applications
 * and leverages a lean data lookup to screen current balances.
 * @param {string} menteeId - Requesting account unique user identifier tracker.
 * @throws {AppError} 400 - If the current wallet contains sufficient points holdings.
 * @throws {AppError} 409 - If an outstanding unresolved application is already registered.
 * @returns {Promise<Object>} Created request tracking entity configuration properties.
 */
const createLeapRequest = async (menteeId) => {
  const existing = await leapRequestRepository.findLatestByMenteeAndStatus(
    menteeId,
    STATUS_PENDING,
  );
  if (existing) {
    throw new AppError(
      "A pending points allocation request already exists for this user profile.",
      409,
    );
  }

  // Uses the performance-optimized lean view from your wallet repository
  const wallet = await walletRepository.findWalletByUser(menteeId);
  const currentBalance = wallet?.balance ?? 0;

  if (currentBalance >= LEAP_POINTS_MAX_THRESHOLD) {
    throw new AppError(
      `Allocation blocked. You still have active points remaining (${currentBalance} LP).`,
      400,
    );
  }

  return await leapRequestRepository.create({
    mentee: menteeId,
    currentBalance,
  });
};

/**
 * Pulls all recorded application logs filtered optionally across an operational status field.
 * @param {string} [status] - Operational system tracking state value.
 * @returns {Promise<Array<Object>>} Populated application tracking metrics records array.
 */
const getAllLeapRequests = async (status) => {
  const filter = status ? { status } : {};
  return await leapRequestRepository.findAllWithMentee(filter);
};

/**
 * Tallies up the raw sum count tracking outstanding requests marked pending.
 * @returns {Promise<number>} Sequential volume integer tracking open tickets.
 */
const getPendingCount = async () => {
  return await leapRequestRepository.countByStatus(STATUS_PENDING);
};

/**
 * Validates, settles, and deposits specified tokens into a targeting mentee wallet pool.
 * @param {string} requestId - Targeted core tracking request asset document lookup key.
 * @param {string} adminId - Reviewing administrator security credential trace pointer.
 * @throws {AppError} 400 - If the document state points to a processed workflow ledger block.
 * @throws {AppError} 404 - If the targeting transaction identifier cannot be located.
 * @returns {Promise<Object>} Object container returning updated wallet numbers and updated request metrics.
 */
const approveLeapRequest = async (requestId, adminId) => {
  const request = await leapRequestRepository.findById(requestId);
  if (!request) {
    throw new AppError(
      "Points processing target context request not found.",
      404,
    );
  }
  if (request.status !== STATUS_PENDING) {
    throw new AppError(
      "This request workflow has already been closed and processed.",
      400,
    );
  }

  // Uses your precise automated wallet mutation helper function
  const wallet = await walletRepository.incrementBalance(
    request.mentee,
    LEAP_POINTS_GRANT_AMOUNT,
  );

  request.status = STATUS_APPROVED;
  request.reviewedAt = new Date();
  request.reviewedBy = adminId;
  await leapRequestRepository.save(request);

  return { newBalance: wallet.balance, request };
};

/**
 * Rejects an active outstanding point request, terminating its evaluation pathway.
 * @param {string} requestId - Target asset tracking record.
 * @param {string} adminId - Processing moderator credentials validation key tracking pointer.
 * @throws {AppError} 400 - If the targeting context track maps to an already verified workflow block.
 * @throws {AppError} 404 - If the resource identifier is missing from storage data logs.
 * @returns {Promise<Object>} Modified updated configuration properties documentation details block.
 */
const rejectLeapRequest = async (requestId, adminId) => {
  const request = await leapRequestRepository.findById(requestId);
  if (!request) {
    throw new AppError(
      "Points processing target context request not found.",
      404,
    );
  }
  if (request.status !== STATUS_PENDING) {
    throw new AppError(
      "This request workflow has already been closed and processed.",
      400,
    );
  }

  request.status = STATUS_REJECTED;
  request.reviewedAt = new Date();
  request.reviewedBy = adminId;
  await leapRequestRepository.save(request);

  return request;
};

module.exports = {
  getMyPendingRequest,
  createLeapRequest,
  getAllLeapRequests,
  getPendingCount,
  approveLeapRequest,
  rejectLeapRequest,
};
