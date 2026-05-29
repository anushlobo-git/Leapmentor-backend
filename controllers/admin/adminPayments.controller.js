// controllers/admin/adminPayments.controller.js
const {
  getPaymentStatsService,
  getRevenueChartService,
  getTransactionsService,
} = require("../../services/admin.payments.service");

const getPaymentStats = async (req, res) => {
  try {
    const result = await getPaymentStatsService(req.admin._id);
    return res.json({ success: true, ...result });
  } catch (err) {
    return res.status(500).json({
      message: "Failed to fetch payment stats. Please try again.",
    });
  }
};

const getRevenueChart = async (req, res) => {
  try {
    const data = await getRevenueChartService();
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({
      message: "Failed to fetch revenue chart. Please try again.",
    });
  }
};

const getTransactions = async (req, res) => {
  try {
    const result = await getTransactionsService(req.query);
    return res.json({ success: true, ...result });
  } catch (err) {
    return res.status(500).json({
      message: "Failed to fetch transactions. Please try again.",
    });
  }
};

module.exports = { getPaymentStats, getRevenueChart, getTransactions };
