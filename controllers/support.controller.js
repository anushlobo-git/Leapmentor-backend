/**
 * @fileoverview Customer Support Domain Gateway Controller
 * @description Thin network pipeline interface validating entry queries parameters and processing payload streaming configurations.
 */
const catchAsync = require("../utils/catchAsync");
const supportService = require("../services/supportMessage.service");

/**
 * Registers an outward public user concern report ticket data stream block.
 * @route   POST /api/v1/support/messages
 * @access  Public
 */
const createMessage = catchAsync(async (req, res) => {
  const supportTicket = await supportService.submitTicket(req.body);
  res.status(201).json(supportTicket);
});

/**
 * Compiles a comprehensive list detailing all operational system help tickets metrics.
 * @route   GET /api/v1/support/messages
 * @access  Private (Admin Only)
 */
const getMessages = catchAsync(async (req, res) => {
  const supportTickets = await supportService.fetchAllTickets();
  res.status(200).json(supportTickets);
});

/**
 * Applies mutations moving a targeted support issue tracking index into resolved status parameters.
 * @route   PATCH /api/v1/support/messages/:id/resolve
 * @access  Private (Admin Only)
 */
const resolveMessage = catchAsync(async (req, res) => {
  const resolvedTicket = await supportService.resolveTicket(req.params.id);
  res.status(200).json(resolvedTicket);
});

module.exports = {
  createMessage,
  getMessages,
  resolveMessage,
};
