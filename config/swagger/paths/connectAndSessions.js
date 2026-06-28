module.exports = {
  "/connect-requests": {
    post: {
      tags: ["Engagement Lifecycle Connections Framework"],
      summary: "Generate and dispatch a new mentorship contract connect transaction block",
      requestBody: {
        required: true,
        content: { "application/json": { schema: { $ref: "#/components/schemas/SendConnectRequestBody" } } },
      },
      responses: {
        201: { description: "Connect request tracking item written cleanly down data pools", content: { "application/json": { schema: { $ref: "#/components/schemas/ConnectRequest" } } } },
      },
    },
  },
  "/connect-requests/my-requests": {
    get: {
      tags: ["Engagement Lifecycle Connections Framework"],
      summary: "Extract full chronological lists recording connection attempts created by mentee profile",
      responses: {
        200: { description: "Historical ledger lines extracted successfully", content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean" }, requests: { type: "array", items: { $ref: "#/components/schemas/ConnectRequest" } } } } } } },
      },
    },
  },
  "/connect-requests/{id}/respond": {
    patch: {
      tags: ["Engagement Lifecycle Connections Framework"],
      summary: "Transition state flags on outstanding incoming requests items",
      parameters: [{ in: "path", name: "id", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
      requestBody: {
        required: true,
        content: { "application/json": { schema: { $ref: "#/components/schemas/RespondToRequestBody" } } },
      },
      responses: {
        200: { description: "Request tracking state adjusted properly", content: { "application/json": { schema: { $ref: "#/components/schemas/ConnectRequest" } } } },
      },
    },
  },
  "/sessions/{connectRequestId}/slots": {
    get: {
      tags: ["Active Communications Sessions Workspace Management Node"],
      summary: "Pull operational timetable timeline blocks structured inside engagement context record",
      parameters: [{ in: "path", name: "connectRequestId", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
      responses: {
        200: { description: "Timetable components returned successfully" },
      },
    },
  },
  "/sessions/{connectRequestId}/slots/{slotIndex}/meeting-link": {
    patch: {
      tags: ["Active Communications Sessions Workspace Management Node"],
      summary: "Inject third-party communication paths URL address down specialized matrix coordinates reference",
      parameters: [
        { in: "path", name: "connectRequestId", required: true, schema: { $ref: "#/components/schemas/ObjectId" } },
        { in: "path", name: "slotIndex", required: true, schema: { type: "integer", example: 0 } },
      ],
      requestBody: {
        required: true,
        content: { "application/json": { type: "object", required: ["meetingLink"], properties: { meetingLink: { type: "string" } } } },
      },
      responses: {
        200: { description: "Meeting route link written successfully into targeting arrays entry index" },
      },
    },
  },
  "/goals": {
    post: {
      tags: ["Strategic Goals & Progress Milestones Engine"],
      summary: "Bind new overarching performance metrics definitions to active connection path links",
      requestBody: {
        required: true,
        content: { "application/json": { schema: { $ref: "#/components/schemas/CreateGoalRequest" } } },
      },
      responses: {
        201: { description: "Objective parameters entry created successfully", content: { "application/json": { schema: { $ref: "#/components/schemas/Goal" } } } },
      },
    },
  },
  "/messages/{connectRequestId}": {
    get: {
      tags: ["Real-time Communications Feeds & Threads Processing Systems"],
      summary: "Query chronological dialogue records entries associated with active connection environment index",
      parameters: [
        { in: "path", name: "connectRequestId", required: true, schema: { $ref: "#/components/schemas/ObjectId" } },
        { in: "query", name: "limit", schema: { type: "integer", default: 20 } },
      ],
      responses: {
        200: { description: "Dialogue blocks data bundle successfully compiled" },
      },
    },
  },
  "/notes/upload": {
    post: {
      tags: ["Workspace Assets Storage & Artifact Multi-Format Channels"],
      summary: "Push multipart file documents structural artifacts straight into Cloud storage networks spaces logs",
      requestBody: {
        required: true,
        content: {
          "multipart/form-data": {
            schema: {
              type: "object",
              required: ["connectRequestId", "file"],
              properties: {
                connectRequestId: { type: "string" },
                file: { type: "string", format: "binary" },
                title: { type: "string" },
              },
            },
          },
        },
      },
      responses: {
        201: { description: "Asset metadata entry recorded and mapping links established", content: { "application/json": { schema: { $ref: "#/components/schemas/Note" } } } },
      },
    },
  },
};