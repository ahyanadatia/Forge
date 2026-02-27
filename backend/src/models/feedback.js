// Feedback model (simplified for MVP)
module.exports = {
  id: Number,
  fromUserId: Number,
  toUserId: Number,
  teamId: Number,
  reliability: Number,
  communication: Number,
  contribution: Number,
  privateNotes: String,
  createdAt: Date
};
