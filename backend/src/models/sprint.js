// Sprint model (simplified for MVP)
module.exports = {
  id: Number,
  userId: Number,
  type: String,
  status: String, // 'pending' | 'in-progress' | 'completed'
  startDate: Date,
  endDate: Date,
  submissionUrl: String,
  submissionRepo: String,
  score: Number,
  verifiedBy: Number,
  createdAt: Date
};
