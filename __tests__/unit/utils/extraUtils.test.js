const { generateICS } = require("../../../utils/generateICS");
const generateInvoice = require("../../../utils/generateInvoice");
const releaseEscrow = require("../../../utils/releaseEscrow");
const { sendCalendarInvite } = require("../../../utils/sendCalendarInvite");
const sendInvoiceEmail = require("../../../utils/sendInvoiceEmail");
const sendNotificationEmail = require("../../../utils/sendNotificationEmail");

describe("Additional Utils Unit Test Suite", () => {
  describe("generateICS", () => {
    test("should export generateICS function", () => {
      expect(typeof generateICS).toBe("function");
    });
  });

  describe("generateInvoice", () => {
    test("should export a function to generate invoices", () => {
      expect(typeof generateInvoice).toBe("function");
    });
  });

  describe("releaseEscrow", () => {
    test("should export releaseEscrow function", () => {
      expect(typeof releaseEscrow).toBe("function");
    });
  });

  describe("Email Utilities Exports", () => {
    test("sendCalendarInvite, sendInvoiceEmail, sendNotificationEmail should export functions/objects", () => {
      expect(sendCalendarInvite).toBeDefined();
      expect(sendInvoiceEmail).toBeDefined();
      expect(sendNotificationEmail).toBeDefined();
    });
  });
});
