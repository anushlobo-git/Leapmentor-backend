module.exports = {
  "/admin/auth/login": {
    post: {
      tags: ["Administrative Command Core Console Authorization Access Ports"],
      summary:
        "Verify executive corporate parameters access signatures to unlock operations panel routes",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/AdminLoginRequest" },
          },
        },
      },
      responses: {
        200: {
          description:
            "Administrative access environment verification token generated successfully",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/AdminLoginResponse" },
            },
          },
        },
      },
      security: [],
    },
  },
  "/admin/stats": {
    get: {
      tags: ["Administrative System Telemetry Monitors & Metrics Pipelines"],
      summary:
        "Query consolidated real-time operational datasets performance indices summaries",
      responses: {
        200: {
          description:
            "Global systems statistics overview pulled from database layer caching layers",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/AdminStats" },
            },
          },
        },
      },
    },
  },
  "/admin/settings/add-admin": {
    post: {
      tags: ["Administrative Privilege Provisioning & Access Controls Nodes"],
      summary:
        "Provision a secondary operations supervisor identity structure model profile entry",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/AddAdminRequest" },
          },
        },
      },
      responses: {
        201: {
          description:
            "Operational supervisor agent record generated successfully",
        },
      },
    },
  },
  "/admin/settings/commission": {
    put: {
      tags: ["Administrative Global Financial Adjustments Panel"],
      summary:
        "Rewrite default system pricing formulas parameters defining standard fee collection percentage scales",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/UpdateCommissionRequest" },
          },
        },
      },
      responses: {
        200: {
          description:
            "Platform calculations strategy updated instantly across active environments configurations",
        },
      },
    },
  },
  "/admin/mentor-verifications": {
    get: {
      tags: ["Administrative Profile Compliance & Audit Workflow Engines"],
      summary:
        "Extract data arrays mapping all candidate mentor credentials verification queue tasks",
      responses: {
        200: {
          description:
            "Master verification pipeline lists returned successfully",
        },
      },
    },
  },
  "/admin/mentor-verifications/{mentorProfileId}/verify": {
    patch: {
      tags: ["Administrative Profile Compliance & Audit Workflow Engines"],
      summary:
        "Approve candidate capability records data documents and unlock public discovery lanes visibility parameters",
      parameters: [
        {
          in: "path",
          name: "mentorProfileId",
          required: true,
          schema: { $ref: "#/components/schemas/ObjectId" },
        },
      ],
      responses: {
        200: {
          description:
            "Target mentor verification status shifted to active metrics verified",
        },
      },
    },
  },
  "/admin/reports/{id}/refund": {
    post: {
      tags: [
        "Administrative Disputes Telemetry & Escrow Interventions Terminal",
      ],
      summary:
        "Override system automated locking variables to force transaction refund settlement actions down onto target mentee wallet balance logs",
      parameters: [
        {
          in: "path",
          name: "id",
          required: true,
          schema: { $ref: "#/components/schemas/ObjectId" },
        },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            type: "object",
            required: ["adminNote"],
            properties: { adminNote: { type: "string", maxLength: 2000 } },
          },
        },
      },
      responses: {
        200: {
          description:
            "Tokens manual restitution complete and transaction audit path written cleanly",
        },
      },
    },
  },
  "/leap-requests": {
    get: {
      tags: ["Administrative LP Tokens Minting Verification Panel"],
      summary:
        "Fetch total list allocations describing all outstanding balance requests submitted by mentees profile arrays",
      parameters: [
        {
          in: "query",
          name: "status",
          schema: { type: "string", enum: ["pending", "approved", "rejected"] },
        },
      ],
      responses: {
        200: {
          description:
            "Balance request lines arrays returned from DB pool layers",
        },
      },
    },
  },
  "/leap-requests/{id}/approve": {
    patch: {
      tags: ["Administrative LP Tokens Minting Verification Panel"],
      summary:
        "Approve outstanding allocation requests and programmatically inject fixed balance points units directly onto target mentee wallet",
      parameters: [
        {
          in: "path",
          name: "id",
          required: true,
          schema: { $ref: "#/components/schemas/ObjectId" },
        },
      ],
      responses: {
        200: {
          description:
            "Fixed standard LP points structural amount credited successfully into user profile balances account",
        },
      },
    },
  },
  "/ai/chat": {
    post: {
      tags: ["AI Conversational Proxy Engine"],
      summary:
        "Proxy conversational interactions down to the support assistance services",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/AiChatRequest" },
          },
        },
      },
      responses: {
        200: {
          description: "Conversational token sequence returned successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  content: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        type: { type: "string" },
                        text: { type: "string" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};
