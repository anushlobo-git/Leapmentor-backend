/**
 * @fileoverview Customer Support Domain Gateway Controller
 * @description Thin network pipeline interface validating entry parameters and processing configurations.
 */

const catchAsync = require("../utils/catchAsync");
const { sendSuccess, STATUS } = require("../utils/apiResponse");

const createSupportController = ({ supportService }) => {
  /**
   * Registers an outward public user concern report ticket data stream block.
   * @route   POST /api/v1/support/messages
   * @access  Public
   */
  const createMessage = catchAsync(async (req, res, next) => {
    const supportTicket = await supportService.submitTicket(req.body);
    return sendSuccess(res, supportTicket, "Support ticket submitted", STATUS.CREATED);
  });

  /**
   * Compiles a comprehensive list detailing all operational system help tickets metrics.
   * @route   GET /api/v1/support/messages
   * @access  Private (Admin Only)
   */
  const getMessages = catchAsync(async (req, res, next) => {
    const supportTickets = await supportService.fetchAllTickets();
    return sendSuccess(res, supportTickets, "Support tickets retrieved");
  });

  /**
   * Applies mutations moving a targeted support issue tracking index into resolved status parameters.
   * @route   PATCH /api/v1/support/messages/:id/resolve
   * @access  Private (Admin Only)
   */
  const resolveMessage = catchAsync(async (req, res, next) => {
    const resolvedTicket = await supportService.resolveTicket(req.params.id);
    return sendSuccess(res, resolvedTicket, "Support ticket resolved");
  });

  return {
    createMessage,
    getMessages,
    resolveMessage,
  };
};

module.exports = createSupportController;
