const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },

  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },

  password: {
    type: String
  },

  roles: {
  type: [String],
  enum: ["mentor", "mentee"],
  required: true,
  validate: {
    validator: function(val) {
      return val.length === 1
    },
    message: "A user can only have one role."
  }
},

  isEmailVerified: {
    type: Boolean,
    default: false
  },

  termsAccepted: {
    type: Boolean,
    required: true
  },

  termsAcceptedAt: {
    type: Date
  },
  passwordChangedAt: {
  type: Date,
  default: null,
},

}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
