const service = require("../services/earnings.service");

const handleError = (res, err) =>
  res.status(err.statusCode || 500).json({ message: err.message });

const getEarningsSummary = async (req, res) => {
  try {
    const result = await service.getEarningsSummaryService(req.user._id);
    return res.json({ success: true, ...result });
  } catch (err) {
    handleError(res, err);
  }
};

const getEarningsChart = async (req, res) => {
  try {
    const period = req.query.period === "weekly" ? "weekly" : "monthly";
    const result = await service.getEarningsChartService(req.user._id, period);
    return res.json({ success: true, ...result });
  } catch (err) {
    handleError(res, err);
  }
};

const getPayoutHistory = async (req, res) => {
  try {
    const result = await service.getPayoutHistoryService(
      req.user._id,
      req.query,
    );
    return res.json({ success: true, ...result });
  } catch (err) {
    handleError(res, err);
  }
};

const withdrawEarnings = async (req, res) => {
  try {
    const result = await service.withdrawEarningsService(req.user._id);
    return res.json({
      success: true,
      message: "Withdrawal request submitted successfully",
      ...result,
    });
  } catch (err) {
    handleError(res, err);
  }
};

module.exports = {
  getEarningsSummary,
  getEarningsChart,
  getPayoutHistory,
  withdrawEarnings,
};
