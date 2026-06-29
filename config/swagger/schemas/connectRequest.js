module.exports = {
  ConnectRequest: {
    type: "object",
    properties: {
      _id: { $ref: "#/components/schemas/ObjectId" },
      mentee: { $ref: "#/components/schemas/ObjectId" },
      mentor: { $ref: "#/components/schemas/ObjectId" },
      message: {
        type: "string",
        example: "Seeking operational architecture instruction maps.",
      },
      selectedSlots: {
        type: "array",
        items: { $ref: "#/components/schemas/SelectedSlot" },
      },
      confirmedSlot: { $ref: "#/components/schemas/SelectedSlot" },
      status: {
        type: "string",
        enum: [
          "pending",
          "accepted",
          "rejected",
          "referred",
          "ongoing",
          "completed",
        ],
        example: "pending",
      },
      referredTo: { $ref: "#/components/schemas/ObjectId", nullable: true },
      referredBy: { $ref: "#/components/schemas/ObjectId", nullable: true },
      sessionRate: { type: "number", example: 120 },
      sessionCount: { type: "integer", example: 4 },
      totalAmount: { type: "number", example: 480 },
      paymentStatus: {
        type: "string",
        enum: ["unpaid", "paid", "refunded"],
        example: "unpaid",
      },
      paidAt: { type: "string", format: "date-time", nullable: true },
      completedAt: { type: "string", format: "date-time", nullable: true },
      requestedAt: { type: "string", format: "date-time" },
      respondedAt: { type: "string", format: "date-time", nullable: true },
      commissionRate: { type: "number", example: 20 },
      commissionAmount: { type: "number", example: 96 },
      mentorPayout: { type: "number", example: 384 },
      additionalSlots: {
        type: "array",
        items: { $ref: "#/components/schemas/AdditionalSlot" },
      },
      createdAt: { type: "string", format: "date-time" },
      updatedAt: { type: "string", format: "date-time" },
    },
  },

  SendConnectRequestBody: {
    type: "object",
    required: ["mentorId", "selectedSlots"],
    properties: {
      mentorId: { $ref: "#/components/schemas/ObjectId" },
      message: {
        type: "string",
        maxLength: 500,
        example: "I need guidance building secure decoupled backend nodes.",
      },
      selectedSlots: {
        type: "array",
        minItems: 1,
        maxItems: 5,
        items: {
          type: "object",
          required: ["day", "date", "startTime", "endTime"],
          properties: {
            day: { type: "string", example: "Monday" },
            date: { type: "string", example: "2026-07-20" },
            startTime: { type: "string", example: "14:00" },
            endTime: { type: "string", example: "15:00" },
          },
        },
      },
    },
  },

  RespondToRequestBody: {
    type: "object",
    required: ["status"],
    properties: {
      status: {
        type: "string",
        enum: ["accepted", "rejected"],
        example: "accepted",
      },
      sessionRate: {
        type: "number",
        example: 120,
        description: "Rate defined during request review transitions",
      },
    },
  },

  ReferRequestBody: {
    type: "object",
    required: ["referredToMentorId"],
    properties: {
      referredToMentorId: { $ref: "#/components/schemas/ObjectId" },
      reason: {
        type: "string",
        example:
          "Alternative team leader contains direct capacity matches with requested skills framework.",
      },
    },
  },

  Wallet: {
    type: "object",
    properties: {
      _id: { $ref: "#/components/schemas/ObjectId" },
      user: { $ref: "#/components/schemas/ObjectId" },
      role: { type: "string", enum: ["mentor", "mentee"] },
      balance: { type: "number", example: 850 },
      escrow: { type: "number", example: 240 },
    },
  },

  EscrowPayBody: {
    type: "object",
    required: ["connectRequestId", "sessionRate", "sessionCount"],
    properties: {
      connectRequestId: { $ref: "#/components/schemas/ObjectId" },
      sessionRate: { type: "number", example: 100 },
      sessionCount: { type: "integer", example: 3 },
    },
  },

  EscrowPayAdditionalBody: {
    type: "object",
    required: ["connectRequestId", "sessionRate", "slotId"],
    properties: {
      connectRequestId: { $ref: "#/components/schemas/ObjectId" },
      sessionRate: { type: "number", example: 100 },
      slotId: { $ref: "#/components/schemas/ObjectId" },
    },
  },

  Transaction: {
    type: "object",
    properties: {
      _id: { $ref: "#/components/schemas/ObjectId" },
      user: { $ref: "#/components/schemas/ObjectId" },
      type: {
        type: "string",
        enum: [
          "credit",
          "debit",
          "escrow_hold",
          "escrow_release",
          "escrow_refund",
          "commission_deduct",
          "mentor_payout",
        ],
        example: "escrow_hold",
      },
      amount: { type: "number", example: 300 },
      connectRequest: { $ref: "#/components/schemas/ObjectId", nullable: true },
      description: {
        type: "string",
        example:
          "Escrow token lockup initiated for requested sessions ledger block.",
      },
      balanceAfter: { type: "number", example: 550 },
      createdAt: { type: "string", format: "date-time" },
    },
  },

  AdditionalSlot: {
    type: "object",
    properties: {
      _id: { $ref: "#/components/schemas/ObjectId" },
      day: { type: "string", example: "Wednesday" },
      date: { type: "string", example: "2026-08-05" },
      startTime: { type: "string", example: "16:00" },
      endTime: { type: "string", example: "17:00" },
      meetingLink: { type: "string", example: "" },
      menteeMarked: { type: "boolean", example: false },
      mentorMarked: { type: "boolean", example: false },
      paymentStatus: {
        type: "string",
        enum: ["pending", "paid"],
        example: "pending",
      },
      sessionRate: { type: "number", example: 120 },
      totalAmount: { type: "number", example: 120 },
    },
  },
};
