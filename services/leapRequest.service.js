/**
 * @fileoverview Leap Request Service
 * @description Evaluates allocation rules, grants credits, and manages approval lifecycles for point provisions.
 * Receives required repositories via constructor injection.
 */

const AppError = require("../utils/AppError");
const { toLeapRequestDTO } = require("../mappers/leapRequest.mapper");

// Domain Constants
const STATUS_PENDING = "pending";
const STATUS_APPROVED = "approved";
const STATUS_REJECTED = "rejected";
const LEAP_POINTS_GRANT_AMOUNT = 500;
const LEAP_POINTS_MAX_THRESHOLD = 500;

const createLeapRequestService = ({leapRequestRepository, walletRepository}) => {
  /**
   * Retrieves the latest pending request filed by a specific mentee user.
   * @param {string} menteeId - Unique identifier of the targeting mentee user.
   * @returns {Promise<Object>} The unresolved active request document record mapped to a DTO.
   */
  const getMyPendingRequest = async (menteeId) => {
    const request = await leapRequestRepository.findLatestByMenteeAndStatus(
      menteeId,
      STATUS_PENDING,
    );
    return toLeapRequestDTO(request);
  };

  /**
   * Compiles and records a new points grant processing request.
   * @param {string} menteeId - Requesting account unique user identifier tracker.
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

    const wallet = await walletRepository.findWalletByUser(menteeId);
    const currentBalance = wallet?.balance ?? 0;

    if (currentBalance >= LEAP_POINTS_MAX_THRESHOLD) {
      throw new AppError(
        `Allocation blocked. You still have active points remaining (${currentBalance} LP).`,
        400,
      );
    }

    const request = await leapRequestRepository.create({
      mentee: menteeId,
      currentBalance,
    });

    return toLeapRequestDTO(request);
  };

  /**
   * Pulls all recorded application logs filtered optionally across an operational status field.
   * @param {string} [status] - Operational system tracking state value.
   * @returns {Promise<Array<Object>>} Populated application tracking metrics records array.
   */
  const getAllLeapRequests = async (status) => {
    const filter = status ? { status } : {};
    const requests = await leapRequestRepository.findAllWithMentee(filter);
    return requests.map(toLeapRequestDTO);
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

    const menteeId = request.mentee?._id ?? request.mentee;
    const wallet = await walletRepository.incrementBalance(
      menteeId,
      LEAP_POINTS_GRANT_AMOUNT,
    );

    request.status = STATUS_APPROVED;
    request.reviewedAt = new Date();
    request.reviewedBy = adminId;
    await leapRequestRepository.save(request);

    return {
      newBalance: wallet.balance,
      request: toLeapRequestDTO(request),
    };
  };

  /**
   * Rejects an active outstanding point request, terminating its evaluation pathway.
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

    return toLeapRequestDTO(request);
  };

  return {
    getMyPendingRequest,
    createLeapRequest,
    getAllLeapRequests,
    getPendingCount,
    approveLeapRequest,
    rejectLeapRequest,
  };
};

module.exports = createLeapRequestService;
