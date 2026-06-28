module.exports = {
  MentorProfile: {
    type: "object",
    properties: {
      _id: { $ref: "#/components/schemas/ObjectId" },
      user: { $ref: "#/components/schemas/ObjectId" },
      currentRole: { type: "string", example: "Staff Systems Architect" },
      industry: { type: "string", example: "Software Engineering" },
      company: { type: "string", example: "Enterprise Solutions LLC" },
      bio: {
        type: "string",
        example:
          "Specializing in distributed computing networks and infrastructure scalability design maps.",
      },
      profilePicture: {
        type: "string",
        example: "https://res.cloudinary.com/dsad/image/upload/avatar.jpg",
      },
      yearsOfExperience: { type: "number", example: 12 },
      hourlyRate: { type: "number", example: 120 },
      avgRating: { type: "number", example: 4.95 },
      totalSessions: { type: "integer", example: 142 },
      skills: {
        type: "array",
        items: { type: "string" },
        example: ["Node.js", "Express", "Kubernetes", "MongoDB"],
      },
      communicationPreferences: {
        type: "array",
        items: {
          type: "string",
          enum: ["Chat", "Email", "Video Call", "Phone Call", "In-Person"],
        },
      },
      languages: {
        type: "array",
        items: { type: "string" },
        example: ["English", "Hindi"],
      },
      linkedInUrl: {
        type: "string",
        example: "https://linkedin.com/in/architect-profile",
      },
      portfolioUrl: {
        type: "string",
        example: "https://solutions-portfolio.io",
      },
      isProfileComplete: { type: "boolean", example: true },
      isProfilePublished: { type: "boolean", example: true },
      verificationStatus: {
        type: "string",
        enum: ["unverified", "verified", "pending"],
        example: "verified",
      },
      phoneNumber: { type: "string", example: "+91 9999988888" },
      createdAt: { type: "string", format: "date-time" },
      updatedAt: { type: "string", format: "date-time" },
    },
  },

  MentorProfileCreateRequest: {
    type: "object",
    properties: {
      currentRole: { type: "string", example: "Staff Systems Architect" },
      industry: { type: "string", example: "Software Engineering" },
      company: { type: "string", example: "Enterprise Solutions LLC" },
      bio: {
        type: "string",
        example: "Specializing in distributed computing architecture maps.",
      },
      yearsOfExperience: { type: "number", example: 12 },
      hourlyRate: { type: "number", example: 120 },
      skills: {
        type: "array",
        items: { type: "string" },
        example: ["Node.js", "Kubernetes"],
      },
      communicationPreferences: {
        type: "array",
        items: { type: "string" },
        example: ["Video Call", "Chat"],
      },
      languages: {
        type: "array",
        items: { type: "string" },
        example: ["English"],
      },
      linkedInUrl: {
        type: "string",
        example: "https://linkedin.com/in/architect-profile",
      },
      portfolioUrl: {
        type: "string",
        example: "https://solutions-portfolio.io",
      },
      phoneNumber: { type: "string", example: "+91 9999988888" },
    },
  },

  MenteeProfile: {
    type: "object",
    properties: {
      _id: { $ref: "#/components/schemas/ObjectId" },
      user: { $ref: "#/components/schemas/ObjectId" },
      currentRole: { type: "string", example: "Associate Software Engineer" },
      industry: { type: "string", example: "Technology" },
      company: { type: "string", example: "Tech Innovators Inc" },
      yearsOfExperience: { type: "string", example: "2 years" },
      bio: {
        type: "string",
        example:
          "Eager to expand engineering logic systems parameters inside secure multi-node backend systems.",
      },
      profilePicture: {
        type: "string",
        example: "https://res.cloudinary.com/dsad/image/upload/mentee.jpg",
      },
      linkedInUrl: {
        type: "string",
        example: "https://linkedin.com/in/mentee-profile",
      },
      portfolioUrl: { type: "string", example: "https://mentee-code.dev" },
      skills: {
        type: "array",
        items: { type: "string" },
        example: ["JavaScript", "HTML"],
      },
      interestedFields: {
        type: "array",
        items: { type: "string" },
        example: ["Backend Engineering", "DevOps Systems"],
      },
      communicationPreferences: {
        type: "array",
        items: { type: "string" },
        example: ["Chat", "Video Call"],
      },
      languages: {
        type: "array",
        items: { type: "string" },
        default: ["English"],
      },
      isProfileComplete: { type: "boolean", example: true },
      isProfilePublished: { type: "boolean", example: true },
      emailNotifications: { type: "boolean", default: true },
      marketingPreferences: { type: "boolean", default: false },
      createdAt: { type: "string", format: "date-time" },
      updatedAt: { type: "string", format: "date-time" },
    },
  },

  MenteeProfileCreateRequest: {
    type: "object",
    properties: {
      currentRole: { type: "string", example: "Associate Software Engineer" },
      industry: { type: "string", example: "Technology" },
      company: { type: "string", example: "Tech Innovators Inc" },
      yearsOfExperience: { type: "string", example: "2 years" },
      bio: {
        type: "string",
        example: "Focusing on backend structural system architectures updates.",
      },
      skills: { type: "array", items: { type: "string" } },
      interestedFields: { type: "array", items: { type: "string" } },
      communicationPreferences: { type: "array", items: { type: "string" } },
      languages: { type: "array", items: { type: "string" } },
      linkedInUrl: { type: "string" },
      portfolioUrl: { type: "string" },
    },
  },
};
