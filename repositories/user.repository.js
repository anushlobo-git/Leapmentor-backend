const User = require("../models/User");

const findUsersBySearchTerm = (search) => {
  const regex = new RegExp(search.trim(), "i");
  return User.find({ $or: [{ name: regex }, { email: regex }] })
    .select("_id")
    .lean();
};
const findUsersByName = (name) =>
  User.find({ name: { $regex: name.trim(), $options: "i" } })
    .select("_id")
    .lean();

const countAllUsers = () => User.countDocuments();

const countUsersWithOptions = (filter) =>
  User.countDocuments(filter).setOptions({ ignoreIsDeleted: true });

const getUserGrowth = (since) =>
  User.aggregate([
    { $match: { createdAt: { $gte: since } } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

const countUsersWithFilter = (filter) =>
  User.countDocuments(filter, { ignoreIsDeleted: true });

const findUsers = (filter, { skip, limit }) =>
  User.find(filter, null, { ignoreIsDeleted: true })
    .select("-password")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

const findUserById = (id) =>
  User.findById(id)
    .select("-password")
    .setOptions({ ignoreIsDeleted: true })
    .lean();

const findUserByIdRaw = (id) => User.findById(id);

const deleteUserById = (id) => User.findByIdAndDelete(id);

const blockUser = (id) =>
  User.findByIdAndUpdate(
    id,
    { isDeleted: true, deletedAt: new Date() },
    { new: true },
  );

const unblockUser = (id) =>
  User.findOneAndUpdate(
    { _id: id },
    { isDeleted: false, deletedAt: null },
    { new: true, ignoreIsDeleted: true },
  );

  const findUserByEmail = (email) => User.findOne({ email });

  const findUserByEmailWithPassword = (email) =>
    User.findOne({ email }).select("+password");

  const findUserByIdWithPassword = (userId) =>
    User.findById(userId).select("+password");

  const createUser = (data) => User.create(data);

  const saveUser = (user) => user.save();

  const findUsersByNameSearch = (search) =>
    User.find({ name: { $regex: search, $options: "i" } })
      .select("_id")
      .lean();

module.exports = { 
  findUsersBySearchTerm,
  findUsersByName,
  countAllUsers,
  countUsersWithOptions,
  getUserGrowth,
  countUsersWithFilter,
  findUsers,
  findUserById,
  findUserByIdRaw,
  deleteUserById,
  blockUser,
  unblockUser,  
  findUserByEmail,
  findUserByEmailWithPassword,
  findUserByIdWithPassword,
  createUser,
  saveUser,
  findUsersByNameSearch

};
