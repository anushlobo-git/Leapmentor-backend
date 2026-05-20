// controllers/admin/adminSettings.controller.js
const {
    getOverviewService,
    changeAdminPasswordService,
    addAdminService,
    getCommissionService,
    updateCommissionService,
} = require("../services/admin.settings.service");

const getOverview = async (req, res) => {
    try {
        const result = await getOverviewService();
        return res.json({ success: true, ...result });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};

const changePassword = async (req, res) => {
    try {
        await changeAdminPasswordService(req.admin._id, req.body);
        return res.json({ success: true, message: "Password changed successfully." });
    } catch (err) {
        if (err.message === "ADMIN_NOT_FOUND") return res.status(404).json({ message: "Admin not found." });
        if (err.message === "WRONG_PASSWORD")  return res.status(400).json({ message: "Current password is incorrect." });
        return res.status(400).json({ message: err.message });
    }
};

const addAdmin = async (req, res) => {
    try {
        const result = await addAdminService(req.body);
        return res.status(201).json({
            success: true,
            message: `Admin account created for ${req.body.email}.`,
            ...result,
        });
    } catch (err) {
        if (err.message === "ADMIN_ALREADY_EXISTS")
            return res.status(409).json({ message: "An admin with this email already exists." });
        return res.status(400).json({ message: err.message });
    }
};

const getCommission = async (req, res) => {
    try {
        const commissionRate = await getCommissionService(req.admin._id);
        return res.json({ success: true, commissionRate });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};

const updateCommission = async (req, res) => {
    try {
        const rate = await updateCommissionService(req.admin._id, req.body.commissionRate);
        return res.json({
            success: true,
            message: `Commission rate updated to ${rate}%`,
            commissionRate: rate,
        });
    } catch (err) {
        return res.status(400).json({ message: err.message });
    }
};

module.exports = { getOverview, changePassword, addAdmin, getCommission, updateCommission };