module.exports = {
  "/escrow/pay": {
    post: {
      tags: ["Escrow Settlement Architecture & Ledger Pipelines"],
      summary:
        "Execute LP token commitments into locked financial hold matrices buffers structures",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/EscrowPayBody" },
          },
        },
      },
      responses: {
        200: {
          description:
            "Token units debited from mentee allocation assets and written onto active transaction locking grids",
        },
        400: { $ref: "#/components/responses/ValidationError" },
      },
    },
  },
  "/escrow/pay-additional": {
    post: {
      tags: ["Escrow Settlement Architecture & Ledger Pipelines"],
      summary:
        "Allocate single structural incremental payments for customized standalone session scheduling points extensions",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/EscrowPayAdditionalBody" },
          },
        },
      },
      responses: {
        200: {
          description:
            "Incremental escrow balance hold applied properly onto current contract reference key",
        },
      },
    },
  },
  "/escrow/release/{requestId}": {
    post: {
      tags: ["Escrow Settlement Architecture & Ledger Pipelines"],
      summary:
        "Authorize structural settlement transfers pushing escrow tokens down onto clear mentor available balance accounts",
      parameters: [
        {
          in: "path",
          name: "requestId",
          required: true,
          schema: { $ref: "#/components/schemas/ObjectId" },
        },
      ],
      responses: {
        200: {
          description:
            "Escrow funds released successfully after processing platform commission logic percentage rules",
        },
      },
    },
  },
  "/escrow/wallet": {
    get: {
      tags: ["Escrow Settlement Architecture & Ledger Pipelines"],
      summary:
        "Expose structural metrics balancing indicators unique to active profile authorization keys",
      responses: {
        200: {
          description: "Wallet profile indicators object returned successfully",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Wallet" },
            },
          },
        },
      },
    },
  },
  "/invoices/{connectRequestId}": {
    get: {
      tags: ["Accounting Documentation & PDF Compiler Abstraciton Paths"],
      summary:
        "Compile and output raw binary application/pdf streams confirming financial ledger operations status sheets",
      parameters: [
        {
          in: "path",
          name: "connectRequestId",
          required: true,
          schema: { $ref: "#/components/schemas/ObjectId" },
        },
      ],
      responses: {
        200: {
          description: "Binary PDF stream document data transmitted properly",
        },
      },
    },
  },
  "/mentor/earnings": {
    get: {
      tags: ["Mentor Financial Analytics & Outbound Ledger Channels"],
      summary:
        "Extract granular high-level tracking telemetry balances mapping total payouts summaries",
      responses: {
        200: {
          description: "Financial metrics object parsed from data matrices",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/EarningsSummary" },
            },
          },
        },
      },
    },
  },
};
