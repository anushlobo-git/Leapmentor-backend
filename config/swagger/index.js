// --- COMPONENT SCHEMAS LOADING CHANNELS ---
const commonSchemas = require("./schemas/common");
const authSchemas = require("./schemas/auth");
const profileSchemas = require("./schemas/profiles");
const connectSchemas = require("./schemas/connectRequest");
const adminSchemas = require("./schemas/admin");
const miscSchemas = require("./schemas/misc");

// --- ROUTING PATH SCHEMAS LOADING CHANNELS ---
const authPaths = require("./paths/auth");
const userPaths = require("./paths/usersAndProfiles");
const connectPaths = require("./paths/connectAndSessions");
const financialPaths = require("./paths/financial");
const adminPaths = require("./paths/administrative");

module.exports = {
  openapi: "3.0.0",
  info: {
    title:
      "LeapMentor Corporate Platform API Command Matrix Ecosystem Documentation",
    version: "1.0.0",
    description:
      "Production architectural reference schema document outlining decoupled functional subsystems paths endpoints drive graphs patterns layers configurations.",
  },
  servers: [
    {
      url: "http://localhost:5000/api/v1",
      description: "Local Development Sandbox Gateway Environs Node",
    },
    {
      url: "https://api.leapmentor.com/api/v1",
      description: "Production Core System Cluster Endpoint Nodes Line",
    },
  ],
  components: {
    securitySchemes: {
      cookieAuth: {
        type: "apiKey",
        in: "cookie",
        name: "adminToken",
        description:
          "Secure automated HTTP-Only tracking token used during supervisor routes processing execution verification walls.",
      },
    },
    schemas: {
      ...commonSchemas,
      ...authSchemas,
      ...profileSchemas,
      ...connectSchemas,
      ...adminSchemas,
      ...miscSchemas,
    },
    responses: {
      UnauthorizedError: {
        description:
          "Request parsing failed verification identity checking barriers or parameters signatures mismatch values.",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/Error" },
          },
        },
      },
      ValidationError: {
        description:
          "Celebrate Joi structural parameters filters parsing validation constraints broken exceptions flags.",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/Error" },
          },
        },
      },
      NotFoundError: {
        description:
          "Requested structural index dataset document key locator pointer database lookup maps empty exceptions.",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/Error" },
          },
        },
      },
    },
  },
  // Apply authorization context structures checking rules down pathways defaults layers
  security: [],
  paths: {
    ...authPaths,
    ...userPaths,
    ...connectPaths,
    ...financialPaths,
    ...adminPaths,
  },
};
