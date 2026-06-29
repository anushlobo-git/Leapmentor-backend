// --- Helper Utilities to Eliminate OpenAPI Structural Duplication ---
const jsonContent = (schema) => ({ "application/json": { schema } });
const schemaRef = (name) => ({ $ref: `#/components/schemas/${name}` });
const responseRef = (name) => ({ $ref: `#/components/responses/${name}` });

const successResponse = (description, schemaTarget) => ({
  description,
  ...(schemaTarget
    ? {
        content: jsonContent(
          typeof schemaTarget === "string"
            ? schemaRef(schemaTarget)
            : schemaTarget,
        ),
      }
    : {}),
});

const requestBody = (schemaTarget) => ({
  required: true,
  content: jsonContent(
    typeof schemaTarget === "string" ? schemaRef(schemaTarget) : schemaTarget,
  ),
});

const queryParam = (name, type, defaultValue, description) => ({
  in: "query",
  name,
  schema: {
    type,
    // Flipped from !== to === to resolve the "Unexpected negated condition" linter rule
    ...(defaultValue === undefined ? {} : { default: defaultValue }),
  },
  ...(description ? { description } : {}),
});

// --- Exported Routes Configuration ---
module.exports = {
  "/users/me": {
    get: {
      tags: ["Users"],
      summary: "Get the logged-in user's profile",
      responses: {
        200: successResponse("User profile returned successfully", "User"),
        401: responseRef("UnauthorizedError"),
      },
    },
  },

  "/mentor-profile": {
    post: {
      tags: ["Mentor Profile"],
      summary: "Create a new mentor profile",
      requestBody: requestBody("MentorProfileCreateRequest"),
      responses: {
        201: successResponse(
          "Mentor profile created successfully",
          "MentorProfile",
        ),
      },
    },
  },

  "/mentor-profile/me": {
    get: {
      tags: ["Mentor Profile"],
      summary: "Get the authenticated mentor's profile",
      responses: {
        200: successResponse(
          "Mentor profile returned successfully",
          "MentorProfile",
        ),
      },
    },
    put: {
      tags: ["Mentor Profile"],
      summary: "Update the authenticated mentor's profile",
      requestBody: requestBody("MentorProfileCreateRequest"),
      responses: {
        200: successResponse(
          "Mentor profile updated successfully",
          "MentorProfile",
        ),
      },
    },
  },

  "/mentee-profile/me": {
    get: {
      tags: ["Mentee Profile"],
      summary: "Get the authenticated mentee's profile",
      responses: {
        200: successResponse(
          "Mentee profile returned successfully",
          "MenteeProfile",
        ),
      },
    },
    put: {
      tags: ["Mentee Profile"],
      summary: "Update the authenticated mentee's profile",
      requestBody: requestBody("MenteeProfileCreateRequest"),
      responses: {
        200: successResponse("Mentee profile updated successfully"),
      },
    },
  },

  "/mentors/search": {
    get: {
      tags: ["Search"],
      summary: "Search and filter mentors with pagination",
      parameters: [
        queryParam("skill", "string"),
        queryParam("industry", "string"),
        queryParam("page", "integer", 1),
        queryParam("limit", "integer", 10),
        queryParam("search", "string", undefined, "Full-text search keyword"),
      ],
      responses: {
        200: successResponse("Paginated mentor list returned successfully", {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            mentors: {
              type: "array",
              items: schemaRef("MentorProfile"),
            },
            pagination: schemaRef("PaginationMeta"),
          },
        }),
      },
    },
  },

  "/availability/me": {
    get: {
      tags: ["Availability"],
      summary: "Get the authenticated mentor's availability",
      responses: {
        200: successResponse(
          "Availability returned successfully",
          "Availability",
        ),
      },
    },
    patch: {
      tags: ["Availability"],
      summary: "Update the authenticated mentor's availability",
      requestBody: requestBody({
        type: "object",
        properties: {
          timezone: { type: "string" },
          weeklyHours: { type: "array", items: { type: "object" } },
        },
      }),
      responses: {
        200: successResponse("Availability updated successfully"),
      },
    },
  },
};
