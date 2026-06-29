module.exports = {
  Feedback: {
    type: "object",
    properties: {
      _id: { $ref: "#/components/schemas/ObjectId" },
      connectRequest: { $ref: "#/components/schemas/ObjectId" },
      from: { $ref: "#/components/schemas/ObjectId" },
      to: { $ref: "#/components/schemas/ObjectId" },
      fromRole: { type: "string", enum: ["mentor", "mentee"] },
      rating: { type: "number", minimum: 1, maximum: 5, example: 5 },
      comment: {
        type: "string",
        example: "Exceptional architecture review breakdown!",
      },
      createdAt: { type: "string", format: "date-time" },
    },
  },

  CreateFeedbackRequest: {
    type: "object",
    required: ["connectRequestId", "rating"],
    properties: {
      connectRequestId: { $ref: "#/components/schemas/ObjectId" },
      rating: { type: "number", minimum: 1, maximum: 5, example: 5 },
      comment: {
        type: "string",
        maxLength: 1000,
        example: "Excellent structural systems instruction loop.",
      },
      slotIndex: { type: "integer", example: 0 },
    },
  },

  Goal: {
    type: "object",
    properties: {
      _id: { $ref: "#/components/schemas/ObjectId" },
      connectRequest: { $ref: "#/components/schemas/ObjectId" },
      mentor: { $ref: "#/components/schemas/ObjectId" },
      mentee: { $ref: "#/components/schemas/ObjectId" },
      title: {
        type: "string",
        example: "Build Secure Factory Injection Pipelines",
      },
      description: {
        type: "string",
        example:
          "Implement decoupling abstractions across application components cleanly.",
      },
      startDate: { type: "string", example: "2026-07-01" },
      endDate: { type: "string", example: "2026-09-01" },
      status: {
        type: "string",
        enum: ["active", "completed", "abandoned"],
        example: "active",
      },
      createdAt: { type: "string", format: "date-time" },
    },
  },

  CreateGoalRequest: {
    type: "object",
    required: ["connectRequestId", "title"],
    properties: {
      connectRequestId: { $ref: "#/components/schemas/ObjectId" },
      title: {
        type: "string",
        maxLength: 200,
        example: "Master Backend Core Design Patterns",
      },
      description: { type: "string", maxLength: 1000 },
      startDate: { type: "string", example: "2026-07-01" },
      endDate: { type: "string", example: "2026-08-01" },
    },
  },

  Milestone: {
    type: "object",
    properties: {
      _id: { $ref: "#/components/schemas/ObjectId" },
      goal: { $ref: "#/components/schemas/ObjectId" },
      connectRequest: { $ref: "#/components/schemas/ObjectId" },
      title: { type: "string", example: "Complete Schema Matrix Decoupling" },
      description: {
        type: "string",
        example:
          "Separate path structures out from central application route initializations.",
      },
      dueDate: { type: "string", example: "2026-07-15" },
      isCompleted: { type: "boolean", default: false },
      completedAt: { type: "string", format: "date-time", nullable: true },
      order: { type: "integer", example: 0 },
      slotIndex: { type: "integer", nullable: true },
    },
  },

  Message: {
    type: "object",
    properties: {
      _id: { $ref: "#/components/schemas/ObjectId" },
      connectRequest: { $ref: "#/components/schemas/ObjectId" },
      sender: { $ref: "#/components/schemas/ObjectId" },
      content: {
        type: "string",
        example:
          "The decoupled environment configuration has been built successfully.",
      },
      readAt: { type: "string", format: "date-time", nullable: true },
      createdAt: { type: "string", format: "date-time" },
    },
  },

  Note: {
    type: "object",
    properties: {
      _id: { $ref: "#/components/schemas/ObjectId" },
      connectRequest: { $ref: "#/components/schemas/ObjectId" },
      uploadedBy: { $ref: "#/components/schemas/ObjectId" },
      uploaderRole: { type: "string", enum: ["mentor", "mentee"] },
      title: { type: "string", example: "System Architecture Sheet Blueprint" },
      fileUrl: {
        type: "string",
        example: "https://cloudinary.com/docs/architecture.pdf",
      },
      publicId: { type: "string", example: "notes/pdf-key-123" },
      fileType: {
        type: "string",
        enum: ["pdf", "image", "doc", "ppt", "excel", "txt", "other"],
        example: "pdf",
      },
      fileName: { type: "string", example: "architecture.pdf" },
      fileSize: {
        type: "integer",
        description: "Recorded payload size in bytes metric",
        example: 2048500,
      },
      isPrivate: { type: "boolean", default: false },
      createdAt: { type: "string", format: "date-time" },
    },
  },

  PrivateNote: {
    type: "object",
    properties: {
      _id: { $ref: "#/components/schemas/ObjectId" },
      connectRequest: { $ref: "#/components/schemas/ObjectId" },
      author: { $ref: "#/components/schemas/ObjectId" },
      title: {
        type: "string",
        example: "Private Architecture Review Thoughts Log",
      },
      content: {
        type: "string",
        example:
          "Remember to query index optimization bounds next session checkpoint.",
      },
      createdAt: { type: "string", format: "date-time" },
      updatedAt: { type: "string", format: "date-time" },
    },
  },

  Notification: {
    type: "object",
    properties: {
      _id: { $ref: "#/components/schemas/ObjectId" },
      recipient: { $ref: "#/components/schemas/ObjectId" },
      type: {
        type: "string",
        enum: [
          "connect_request_received",
          "connect_request_accepted",
          "connect_request_declined",
          "upcoming_session",
          "new_message",
          "session_completed",
          "new_review",
          "support_resolved",
        ],
        example: "new_message",
      },
      title: { type: "string", example: "New Chat Payload Transmitted" },
      message: {
        type: "string",
        example:
          "Your matching contact node has pushed a new dialogue stream entry.",
      },
      read: { type: "boolean", default: false },
      metadata: {
        type: "object",
        properties: {
          mentorId: { $ref: "#/components/schemas/ObjectId" },
          menteeId: { $ref: "#/components/schemas/ObjectId" },
          requestId: { $ref: "#/components/schemas/ObjectId" },
          amount: { type: "number" },
          rating: { type: "number" },
        },
      },
      createdAt: { type: "string", format: "date-time" },
    },
  },

  Availability: {
    type: "object",
    properties: {
      _id: { $ref: "#/components/schemas/ObjectId" },
      mentor: { $ref: "#/components/schemas/ObjectId" },
      timezone: { type: "string", example: "Asia/Kolkata" },
      sessionDurations: {
        type: "array",
        items: { type: "integer" },
        example: [30, 60],
      },
      weeklyHours: {
        type: "array",
        items: {
          type: "object",
          properties: {
            day: {
              type: "string",
              enum: [
                "Monday",
                "Tuesday",
                "Wednesday",
                "Thursday",
                "Friday",
                "Saturday",
                "Sunday",
              ],
            },
            isAvailable: { type: "boolean" },
            slots: {
              type: "array",
              items: { $ref: "#/components/schemas/TimeSlot" },
            },
          },
        },
      },
      specificDates: {
        type: "array",
        items: {
          type: "object",
          properties: {
            date: { type: "string", example: "2026-07-25" },
            slots: {
              type: "array",
              items: { $ref: "#/components/schemas/TimeSlot" },
            },
          },
        },
      },
      googleCalendarConnected: { type: "boolean", default: false },
    },
  },

  SupportMessage: {
    type: "object",
    properties: {
      _id: { $ref: "#/components/schemas/ObjectId" },
      email: {
        type: "string",
        format: "email",
        example: "user@helpcenter.com",
      },
      subject: {
        type: "string",
        example: "OAuth Token Callback Verification Crash Loop",
      },
      message: {
        type: "string",
        example:
          "The window opener postMessage fails to fire during cross-origin loops validation tests.",
      },
      role: {
        type: "string",
        enum: ["mentor", "mentee", "user"],
        default: "user",
      },
      status: { type: "string", enum: ["open", "resolved"], default: "open" },
      createdAt: { type: "string", format: "date-time" },
    },
  },

  CreateSupportMessageRequest: {
    type: "object",
    required: ["email", "subject", "message", "role"],
    properties: {
      email: {
        type: "string",
        format: "email",
        example: "user@helpcenter.com",
      },
      subject: {
        type: "string",
        maxLength: 200,
        example: "Invoicing discrepancy ledger review request",
      },
      message: { type: "string", maxLength: 5000 },
      role: { type: "string", enum: ["mentor", "mentee", "user"] },
    },
  },

  SlotLock: {
    type: "object",
    properties: {
      _id: { $ref: "#/components/schemas/ObjectId" },
      mentorId: { $ref: "#/components/schemas/ObjectId" },
      lockedBy: { $ref: "#/components/schemas/ObjectId" },
      date: { type: "string", example: "2026-07-20" },
      startTime: { type: "string", example: "14:00" },
      endTime: { type: "string", example: "15:00" },
      expiresAt: { type: "string", format: "date-time" },
    },
  },

  EarningsSummary: {
    type: "object",
    properties: {
      totalEarnings: { type: "number", example: 3540 },
      availableBalance: { type: "number", example: 2840 },
      escrowBalance: { type: "number", example: 700 },
      totalSessions: { type: "integer", example: 34 },
    },
  },

  AiChatRequest: {
    type: "object",
    required: ["messages"],
    properties: {
      messages: {
        type: "array",
        items: {
          type: "object",
          required: ["role", "content"],
          properties: {
            role: { type: "string", enum: ["user", "assistant"] },
            content: {
              type: "string",
              example:
                "How do I securely check corporate escrow settlement metrics?",
            },
          },
        },
      },
      systemPrompt: {
        type: "string",
        example:
          "You are a professional architectural supervisor colleague node.",
      },
    },
  },
};
