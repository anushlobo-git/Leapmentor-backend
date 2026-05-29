const AdminUser = require("../models/AdminUser");

const findAdminByEmail = (email) => AdminUser.findOne({ email });

const saveAdmin = (admin) => admin.save();

const findAdminById = (id) =>
  AdminUser.findById(id).select("commissionRate").lean();

const findAdminByIdLean = (id) =>
  AdminUser.findById(id).select("commissionRate").lean();

const createAdmin = (data) => AdminUser.create(data);

const updateAdminById = (id, data) => AdminUser.findByIdAndUpdate(id, data);

module.exports = { 
    findAdminByEmail, 
    saveAdmin , 
    findAdminById,
    findAdminByIdLean,
    createAdmin,
    updateAdminById,
};