jest.mock("mongoose", () => ({
  connect: jest.fn(),
  createConnection: jest.fn(),
  connection: {
    close: jest.fn(),
    host: "localhost",
    name: "primary",
  },
}));

jest.mock("../../../config/cloudinary", () => ({
  verifyConnection: jest.fn(),
}));

jest.mock("../../../config/logger", () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

jest.mock("../../../utils/mailer", () => ({
  verify: jest.fn((callback) => callback(null)),
}));

jest.mock("../../../utils/retryWithBackoff", () => ({
  retryWithBackoff: jest.fn((fn) => fn()),
}));

const mongoose = require("mongoose");

beforeEach(() => {
  jest.clearAllMocks();
  process.env.MONGO_URI = "mongodb://primary.test/app";
  process.env.MONGO_SECONDARY_URI = "mongodb://secondary.test/app";
  delete require.cache[require.resolve("../../../config/env")];
  delete require.cache[require.resolve("../../../config/db")];
});

describe("connectDatabase", () => {
  test("creates an additional connection when a secondary Mongo URI is configured", async () => {
    mongoose.connect.mockResolvedValue({
      connection: { host: "primary-host", name: "primary-db" },
    });
    mongoose.createConnection.mockReturnValue({
      asPromise: jest.fn().mockResolvedValue(undefined),
      close: jest.fn().mockResolvedValue(undefined),
      host: "secondary-host",
      name: "secondary-db",
    });

    const env = require("../../../config/env");
    const db = require("../../../config/db");
    await db();

    expect(mongoose.connect).toHaveBeenCalled();
    expect(mongoose.createConnection).toHaveBeenCalledWith(
      env.mongoSecondaryUri,
      expect.objectContaining({
        autoIndex: true,
        serverSelectionTimeoutMS: 10_000,
      }),
    );
  });
});
