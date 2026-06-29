module.exports = {
  Error: {
    type: "object",
    properties: {
      success: { type: "boolean", example: false },
      message: { type: "string", example: "Something went wrong" },
      status: { type: "string", example: "error" },
    },
  },

  SuccessMessage: {
    type: "object",
    properties: {
      success: { type: "boolean", example: true },
      message: { type: "string", example: "Operation executed successfully" },
    },
  },

  PaginationMeta: {
    type: "object",
    properties: {
      total: { type: "integer", example: 100 },
      page: { type: "integer", example: 1 },
      limit: { type: "integer", example: 10 },
      totalPages: { type: "integer", example: 10 },
    },
  },

  ObjectId: {
    type: "string",
    pattern: "^[a-fA-F0-9]{24}$",
    example: "64f1a2b3c4d5e6f7a8b9c0d1",
  },

  TimeSlot: {
    type: "object",
    properties: {
      startTime: {
        type: "string",
        example: "09:00",
        description: "HH:MM 24-hour notation format",
      },
      endTime: {
        type: "string",
        example: "10:00",
        description: "HH:MM 24-hour notation format",
      },
    },
  },

  SelectedSlot: {
    type: "object",
    properties: {
      day: { type: "string", example: "Monday" },
      date: {
        type: "string",
        example: "2026-07-15",
        description: "YYYY-MM-DD continuous text parameter",
      },
      startTime: { type: "string", example: "09:00" },
      endTime: { type: "string", example: "10:00" },
      meetingLink: {
        type: "string",
        example: "https://meet.google.com/abc-defg-hij",
      },
      menteeMarked: { type: "boolean", default: false },
      mentorMarked: { type: "boolean", default: false },
      completedAt: { type: "string", format: "date-time", nullable: true },
      status: {
        type: "string",
        enum: ["booked", "cancelled"],
        default: "booked",
      },
      cancelledBy: {
        type: "string",
        enum: ["mentor", "mentee"],
        nullable: true,
      },
      cancelledAt: { type: "string", format: "date-time", nullable: true },
      cancellationReason: { type: "string", example: "Scheduling conflict" },
      isRescheduled: { type: "boolean", default: false },
      rescheduledFromIndex: { type: "integer", nullable: true },
    },
  },
};
