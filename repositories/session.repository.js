// const ConnectRequest = require("../models/ConnectRequest");

// const findById = (id, session) =>
//   ConnectRequest.findById(id).session(session ?? null);

// const findByIdLean = (id) =>
//   ConnectRequest.findById(id)
//     .select("mentor mentee selectedSlots additionalSlots status")
//     .lean();

// const findByIdPopulated = (id) =>
//   ConnectRequest.findById(id)
//     .populate("mentor", "name email")
//     .populate("mentee", "name email");

// const save = (doc, opts = {}) => doc.save(opts);

// module.exports = { findById, findByIdLean, findByIdPopulated, save };
