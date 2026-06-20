const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [
        true,
        "User primary profile identification full name string is required",
      ],
      trim: true,
      maxlength: [
        150,
        "User identity name cannot exceed 150 characters across string indices",
      ],
    },
    email: {
      type: String,
      required: [
        true,
        "Primary contact and account login authentication email address routing path is required",
      ],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      select: false,
    },
    roles: {
      type: [String],
      required: [
        true,
        "User operational capabilities role access classification array ledger is required",
      ],
      enum: {
        values: ["mentor", "mentee"],
        message:
          "{VALUE} is not a recognized system account capability tier authorization role option",
      },
      validate: {
        validator: function (val) {
          return Array.isArray(val) && val.length === 1;
        },
        message:
          "A user account mapping blueprint must capture exactly one structural role designation tier assignment",
      },
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    termsAccepted: {
      type: Boolean,
      required: [
        true,
        "Explicit validation parameter state verifying legal service terms acceptance condition is required",
      ],
    },
    termsAcceptedAt: {
      type: Date,
      default: null,
    },
    passwordChangedAt: {
      type: Date,
      default: null,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// Multi-key index tracking soft-delete compliance state filters chronologically across directory lists
userSchema.index({ isDeleted: 1, createdAt: -1 });

// Replace your pre-find middleware with this:
userSchema.pre(/^find/, function (next) {
  if (typeof next !== "function") return;

  const options = this.getOptions() || {};
  const filter = this.getFilter() || {};

  if (options.ignoreIsDeleted) return next();
  if (filter.isDeleted === true) return next();

  this.where({ isDeleted: { $ne: true } });
  next();
});

module.exports = mongoose.model("User", userSchema);
