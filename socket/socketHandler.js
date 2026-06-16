/**
 * @fileoverview Real-time bidirectional socket event handler.
 * Manages chat room access, socket multiplexing per user, message state synchronization,
 * typing states, and live disconnection cleanup routes.
 * @module socket/socketHandler
 * @requires ../models/Message
 * @requires ../models/ConnectRequest
 * @requires ../config/logger
 */

const Message = require("../models/Message");
const ConnectRequest = require("../models/ConnectRequest");
const logger = require("../config/logger");

/** * Tracks active unique users present inside an active chat channel.
 * @type {Map<string, Set<string>>} - Key: connectRequestId, Value: Set of unique userIds
 */
const onlineUsers = new Map();

/** * Tracks active socket pool connection descriptors per unique authenticated user.
 * Supports multiple concurrent terminal connections (e.g., multiple tabs, mobile apps).
 * @type {Map<string, Set<string>>} - Key: userId, Value: Set of active socket.ids
 */
const userSockets = new Map();

/**
 * Validates whether a specific user maintains access permissions to enter a specific room.
 * @async
 * @function validateRoomAccess
 * @param {string} connectRequestId - The targeting relationship room identifier.
 * @param {string} userId - The unique identifier of the requesting user.
 * @returns {Promise<boolean>} Resolves true if the match relation status is 'ongoing' and user is paired.
 */
const validateRoomAccess = async (connectRequestId, userId) => {
  const request = await ConnectRequest.findById(connectRequestId)
    .select("mentor mentee status")
    .lean();

  if (!request) return false;
  if (request.status !== "ongoing") return false;

  const mentorId = request.mentor.toString();
  const menteeId = request.mentee.toString();
  const uid = userId.toString();

  return uid === mentorId || uid === menteeId;
};

/**
 * Resolves the opposite participant's identifier within a matching connection room.
 * @async
 * @function getOtherUserId
 * @param {string} connectRequestId - Targeted room correlation key.
 * @param {string} userId - Originating user entity identity pointer.
 * @returns {Promise<string|null>} String representation of the peer userId, or null if unresolvable.
 */
const getOtherUserId = async (connectRequestId, userId) => {
  const request = await ConnectRequest.findById(connectRequestId)
    .select("mentor mentee")
    .lean();
  if (!request) return null;
  return request.mentor.toString() === userId.toString()
    ? request.mentee.toString()
    : request.mentor.toString();
};

/**
 * Distributes real-time packets globally across every open descriptor mapping to an individual user.
 * @function emitToUser
 * @param {import('socket.io').Server} io - Master instantiated socket transmission server object reference.
 * @param {string} userId - Recipient platform actor index mapping point.
 * @param {string} event - Unique namespace channel flag context.
 * @param {Object} data - Context body payload object.
 * @returns {boolean} True if payload data successfully cleared local outbound pipeline buffers.
 */
const emitToUser = (io, userId, event, data) => {
  const socketIds = userSockets.get(userId.toString());
  if (socketIds?.size) {
    socketIds.forEach((socketId) => io.to(socketId).emit(event, data));
    return true;
  }
  return false; // The destination recipient entity is flagged offline
};

// Instantiation placeholders exposing hooks safely across global module controller layers
module.exports.emitToUser = null;
module.exports.io = null;

/**
 * Implements state listeners and transaction sequences mapping onto the Socket IO runtime pipeline.
 * @function socketHandler
 * @param {import('socket.io').Server} io - Native instantiated structural Socket engine wrapper.
 */
const socketHandler = (io) => {
  // Bind global application bindings to the established network runtime context instance
  module.exports.emitToUser = (userId, event, data) =>
    emitToUser(io, userId, event, data);
  module.exports.io = io;

  io.on("connection", (socket) => {
    const userId = socket.user._id.toString();

    logger.info(
      `🔌 Socket connected | User: ${socket.user.email} | SocketID: ${socket.id}`,
    );

    // Register active device connection vectors dynamically inside our map index
    if (!userSockets.has(userId)) {
      userSockets.set(userId, new Set());
    }
    userSockets.get(userId).add(socket.id);

    // ── room_joining sequence ───────────────────────────────────────────
    socket.on("join_room", async ({ connectRequestId }) => {
      try {
        const allowed = await validateRoomAccess(connectRequestId, userId);
        if (!allowed) {
          logger.warn(
            `⚠️ Unauthorized channel access blocked | User: ${socket.user.email} -> Room: ${connectRequestId}`,
          );
          socket.emit("error", { message: "Not authorized to join this room" });
          return;
        }

        socket.join(connectRequestId);
        socket.currentRoom = connectRequestId;

        if (!onlineUsers.has(connectRequestId)) {
          onlineUsers.set(connectRequestId, new Set());
        }
        onlineUsers.get(connectRequestId).add(userId);

        // Broadcast presence context adjustments outward to other online observers
        socket.to(connectRequestId).emit("user_online", { userId });

        const otherId = await getOtherUserId(connectRequestId, userId);
        if (otherId && onlineUsers.get(connectRequestId)?.has(otherId)) {
          socket.emit("user_online", { userId: otherId });
        }

        // Catch up read-receipt attributes automatically for incoming participant sessions
        await Message.updateMany(
          {
            connectRequest: connectRequestId,
            sender: { $ne: userId },
            readAt: null,
          },
          { $set: { readAt: new Date() } },
        );

        socket.to(connectRequestId).emit("messages_read", {
          connectRequestId,
          readBy: userId,
          readAt: new Date(),
        });

        logger.info(
          `🏠 User room attachment achieved | User: ${socket.user.email} | Room: ${connectRequestId}`,
        );
      } catch (err) {
        logger.error(
          `❌ Socket handler join_room operational crash: ${err.message}`,
          { errorStack: err.stack },
        );
        socket.emit("error", { message: "Failed to join room" });
      }
    });

    // ── communication_dispatch sequence ────────────────────────────────
    socket.on("send_message", async ({ connectRequestId, content }) => {
      try {
        if (!content?.trim()) return;

        const allowed = await validateRoomAccess(connectRequestId, userId);
        if (!allowed) {
          logger.warn(
            `⚠️ Message dropping triggered by unauthorized pipeline dispatch attempt | User: ${socket.user.email}`,
          );
          socket.emit("error", {
            message: "Not authorized to send messages here",
          });
          return;
        }

        const message = await Message.create({
          connectRequest: connectRequestId,
          sender: userId,
          content: content.trim(),
        });

        const populated = await Message.findById(message._id)
          .populate("sender", "name email")
          .lean();

        const roomOnline = onlineUsers.get(connectRequestId) || new Set();
        const otherId = await getOtherUserId(connectRequestId, userId);
        const otherOnline = otherId && roomOnline.has(otherId);

        // If peer is actively tracking inside the chat grid, declare real-time read validations instantly
        if (otherOnline) {
          await Message.findByIdAndUpdate(message._id, { readAt: new Date() });
          populated.readAt = new Date();
        }

        io.to(connectRequestId).emit("new_message", populated);
        logger.info(
          `💬 Conversation message synchronized | Room: ${connectRequestId} | Sender: ${socket.user.email}`,
        );
      } catch (err) {
        logger.error(
          `❌ Socket handler send_message operational crash: ${err.message}`,
          { errorStack: err.stack },
        );
        socket.emit("error", { message: "Failed to send message" });
      }
    });

    // ── active telemetry triggers ──────────────────────────────────────
    socket.on("typing_start", ({ connectRequestId }) => {
      socket.to(connectRequestId).emit("typing_start", { userId });
    });

    socket.on("typing_stop", ({ connectRequestId }) => {
      socket.to(connectRequestId).emit("typing_stop", { userId });
    });

    // ── document explicit reading confirmations ───────────────────────
    socket.on("mark_read", async ({ connectRequestId }) => {
      try {
        await Message.updateMany(
          {
            connectRequest: connectRequestId,
            sender: { $ne: userId },
            readAt: null,
          },
          { $set: { readAt: new Date() } },
        );

        socket.to(connectRequestId).emit("messages_read", {
          connectRequestId,
          readBy: userId,
          readAt: new Date(),
        });
      } catch (err) {
        logger.error(
          `❌ Socket handler mark_read operational failure: ${err.message}`,
        );
      }
    });

    // ── lifecycle connection severation ────────────────────────────────
    socket.on("disconnect", () => {
      const ids = userSockets.get(userId);
      if (ids) {
        ids.delete(socket.id);
        if (ids.size === 0) userSockets.delete(userId);
      }

      const room = socket.currentRoom;
      if (room && onlineUsers.has(room)) {
        onlineUsers.get(room).delete(userId);
        if (onlineUsers.get(room).size === 0) {
          onlineUsers.delete(room);
        }
        socket.to(room).emit("user_offline", { userId });
      }

      logger.info(
        `🔌 Socket closed gracefully | User: ${socket.user?.email} | SocketID: ${socket.id}`,
      );
    });
  });
};

module.exports = socketHandler;
