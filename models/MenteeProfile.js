const mongoose = require("mongoose");


const menteeProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "user reference identification is required"],
      unique: true, // one profile per mentee
    },

    currentRole: {
      type: String,
      trim: true,
      maxlength: [150, "Current role description cannot exceed 150 characters"],
      default: "",
    },

    industry: {
      type: String,
      trim: true,
      maxlength: [150, "Industry entry cannot exceed 150 characters"],
      default: "",
    },

    company: {
      type: String,
      trim: true,
      maxlength: [150, "Company name cannot exceed 150 characters"],
      default: "",
    },

    yearsOfExperience: {
      type: String,
      trim: true,
      maxlength: [50, "Years of experience metric cannot exceed 50 characters"],
      default: "",
    },

    bio: {
      type: String,
      trim: true,
      maxlength: [1000, "Bio cannot exceed 1000 characters"],
      default: "",
    },

    profilePicture: {
      type: String, // URL or base64
      trim: true,
      maxlength: [2048, "Profile picture URL or content payload is too long"],
      default: "",
    },
    
    profilePictureFileName: {
      type: String,
      trim: true,
      maxlength: [
        255,
        "Profile picture file name cannot exceed 255 characters",
      ],
      default: "",
    },

    linkedInUrl: {
      type: String,
      trim: true,
      maxlength: [1024, "LinkedIn URL cannot exceed 1024 characters"],
      default: "",
    },

    portfolioUrl: {
      type: String,
      trim: true,
      maxlength: [1024, "Portfolio URL cannot exceed 1024 characters"],
      default: "",
    },

    skills: {
      type: [String],
      default: [],
    },

    interestedFields: {
      type: [String],
      default: [],
    },

    communicationPreferences: {
      type: [String],
      enum: {
        values: ["Chat", "Email", "Video Call", "Phone Call", "In-Person"],
        message: "{VALUE} is not a valid communication preference option",
      },
      default: [],
    },

    languages: {
      type: [String],
      default: ["English"],
    },

    isProfileComplete: {
      type: Boolean,
      default: false,
    },

    isProfilePublished: {
      type: Boolean,
      default: false,
    },
    emailNotifications: {
      type: Boolean,
      default: true,
    },
    marketingPreferences: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("MenteeProfile", menteeProfileSchema);
