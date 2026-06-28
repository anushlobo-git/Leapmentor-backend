module.exports = {
  "/users/me": {
    get: {
      tags: ["Identity Lookups Terminal Nodes"],
      summary:
        "Retrieve full configuration profile details mapping logged-in user context signature",
      responses: {
        200: {
          description: "Identity profile mapping dataset extracted",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/User" },
            },
          },
        },
        401: { $ref: "#/components/responses/UnauthorizedError" },
      },
    },
  },
  "/mentor-profile": {
    post: {
      tags: ["Mentor Management Lifecycle Operations Layer"],
      summary: "Create and initialize onboarding parameter records blocks",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/MentorProfileCreateRequest" },
          },
        },
      },
      responses: {
        201: {
          description:
            "Mentor onboarding structural dataset created successfully",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/MentorProfile" },
            },
          },
        },
      },
    },
  },
  "/mentor-profile/me": {
    get: {
      tags: ["Mentor Management Lifecycle Operations Layer"],
      summary:
        "Fetch matching operational setup profile details unique to authenticated mentor",
      responses: {
        200: {
          description: "Mentor configuration structure returned",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/MentorProfile" },
            },
          },
        },
      },
    },
    put: {
      tags: ["Mentor Management Lifecycle Operations Layer"],
      summary:
        "Rewrite internal property objects structures tracking mentor configuration properties",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/MentorProfileCreateRequest" },
          },
        },
      },
      responses: {
        200: {
          description: "Internal parameters rewritten cleanly",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/MentorProfile" },
            },
          },
        },
      },
    },
  },
  "/mentee-profile/me": {
    get: {
      tags: ["Mentee Management Lifecycle Operations Layer"],
      summary:
        "Extract tracking details datasets allocated to active mentee context identity",
      responses: {
        200: {
          description: "Mentee profile metadata returned successfully",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/MenteeProfile" },
            },
          },
        },
      },
    },
    put: {
      tags: ["Mentee Management Lifecycle Operations Layer"],
      summary:
        "Modify core variables segments defining current mentee operational setup",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/MenteeProfileCreateRequest" },
          },
        },
      },
      responses: {
        200: {
          description: "Mentee operational property data adjusted successfully",
        },
      },
    },
  },
  "/mentors/search": {
    get: {
      tags: ["Stateless Search & Discovery Engines Layer"],
      summary:
        "Query, sort, and slice across platform global mentor profile logs files",
      parameters: [
        { in: "query", name: "skill", schema: { type: "string" } },
        { in: "query", name: "industry", schema: { type: "string" } },
        { in: "query", name: "page", schema: { type: "integer", default: 1 } },
        {
          in: "query",
          name: "limit",
          schema: { type: "integer", default: 10 },
        },
        {
          in: "query",
          name: "search",
          schema: { type: "string" },
          description: "Full-text index scanning string keywords parameters",
        },
      ],
      responses: {
        200: {
          description:
            "Paginated filter query array blocks returned from caching matrix layers",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  mentors: {
                    type: "array",
                    items: { $ref: "#/components/schemas/MentorProfile" },
                  },
                  pagination: { $ref: "#/components/schemas/PaginationMeta" },
                },
              },
            },
          },
        },
      },
    },
  },
  "/availability/me": {
    get: {
      tags: ["Schedules Configuration & Timeline Operations Channels"],
      summary:
        "Pull system availability tracking matrices allocated to current active mentor profile",
      responses: {
        200: {
          description:
            "Active structural calendar availability grid mappings return code",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Availability" },
            },
          },
        },
      },
    },
    patch: {
      tags: ["Schedules Configuration & Timeline Operations Channels"],
      summary:
        "Apply block modifications segments rewriting structural availability logs variables",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                timezone: { type: "string" },
                weeklyHours: { type: "array", items: { type: "object" } },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: "Availability model matrices modified successfully",
        },
      },
    },
  },
};
