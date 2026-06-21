const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: [true, "Document URL is required"],
      trim: true,
      maxlength: [2048, "Document URL is too long"],
    },
    publicId: {
      type: String,
      required: [true, "Document public ID is required"],
      trim: true,
      maxlength: [255, "Public ID cannot exceed 255 characters"],
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false },
);

const mentorProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "user reference identification is required"],
      unique: true,
    },

    // ✅ Core Identity
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

    bio: {
      type: String,
      trim: true,
      maxlength: [1000, "Bio cannot exceed 1000 characters"],
      default: "",
    },

    profilePicture: {
      type: String,
      trim: true,
      maxlength: [2048, "Profile picture URL or content payload is too long"],
      default: "",
    },

    yearsOfExperience: {
      type: Number,
      min: [0, "Years of experience cannot be less than 0"],
      max: [60, "Years of experience cannot exceed 60 years"],
      default: 0,
    },

    hourlyRate: {
      type: Number,
      min: [0, "Hourly rate cannot be less than 0"],
      default: 0,
    },

    avgRating: {
      type: Number,
      min: [0, "Average rating cannot be less than 0"],
      max: [5, "Average rating cannot exceed 5"],
      default: 0,
    },

    totalSessions: {
      type: Number,
      min: [0, "Total sessions volume cannot be negative"],
      default: 0,
    },

    skills: {
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

    // ✅ Verification
    verificationStatus: {
      type: String,
      enum: {
        values: ["unverified", "verified", "pending"],
        message: "{VALUE} is not a valid verification status option",
      },
      default: "unverified",
      trim: true,
    },

    phoneNumber: {
      type: String,
      trim: true,
      maxlength: [30, "Phone number cannot exceed 30 characters"],
      default: "",
    },

    resumeDocument: {
      type: documentSchema,
      default: null,
    },

    workExperienceDocuments: {
      type: [documentSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("MentorProfile", mentorProfileSchema);
