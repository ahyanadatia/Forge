// User model (simplified for MVP)
module.exports = {
  id: Number,
  email: String,
  name: String,
  university: String,
  graduationYear: Number,
  githubId: String,
  githubUsername: String,
  technicalCredibilityScore: Number,
  executionScore: Number,
  reliabilityScore: Number,
  compositeScore: Number,
  executionVerified: Boolean,
  createdAt: Date,
  updatedAt: Date
};
