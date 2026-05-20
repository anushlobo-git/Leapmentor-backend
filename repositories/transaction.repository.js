const Transaction = require("../models/Transaction");

const countTransactions = (filter) => Transaction.countDocuments(filter);

const findTransactions = (filter, { skip, limit }) =>
  Transaction.find(filter)
    .populate("user", "name email")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

const createTransaction = (data) => Transaction.create(data);


module.exports = { 
    countTransactions,
     findTransactions,
     createTransaction,
    };
